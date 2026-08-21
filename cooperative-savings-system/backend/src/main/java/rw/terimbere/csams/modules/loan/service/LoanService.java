package rw.terimbere.csams.modules.loan.service;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.audit.entity.ApprovalAction;
import rw.terimbere.csams.modules.audit.service.ApprovalTrailService;
import rw.terimbere.csams.modules.audit.service.AuditService;
import rw.terimbere.csams.modules.contribution.ShareAmountCalculator;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.notification.entity.NotificationType;
import rw.terimbere.csams.modules.notification.service.NotificationFacade;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.ledger.service.LedgerService;
import rw.terimbere.csams.modules.loan.dto.LoanApplicationFormResponse;
import rw.terimbere.csams.modules.loan.dto.LoanApproveRequest;
import rw.terimbere.csams.modules.loan.dto.LoanEligibilityResponse;
import rw.terimbere.csams.modules.loan.dto.LoanGuarantorRespondRequest;
import rw.terimbere.csams.modules.loan.dto.LoanGuarantorResponse;
import rw.terimbere.csams.modules.loan.dto.LoanRejectRequest;
import rw.terimbere.csams.modules.loan.dto.LoanRepaymentCreateRequest;
import rw.terimbere.csams.modules.loan.dto.LoanRepaymentResponse;
import rw.terimbere.csams.modules.loan.dto.LoanRequestCreateRequest;
import rw.terimbere.csams.modules.loan.dto.LoanResponse;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.entity.LoanGuaranteeMode;
import rw.terimbere.csams.modules.loan.entity.LoanSettings;
import rw.terimbere.csams.modules.loan.entity.LoanShareTier;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loan.repository.LoanShareTierRepository;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;
import rw.terimbere.csams.modules.loanrepayment.repository.LoanRepaymentRepository;
import rw.terimbere.csams.modules.membership.entity.CooperativeMembership;
import rw.terimbere.csams.modules.membership.repository.CooperativeMembershipRepository;
import rw.terimbere.csams.modules.user.entity.User;
import rw.terimbere.csams.modules.user.repository.UserRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.security.CooperativeOfficerRoles;
import rw.terimbere.csams.security.UserPrincipal;
import rw.terimbere.csams.shared.auditing.AuditableAction;
import rw.terimbere.csams.shared.common.dto.PageResponse;
import rw.terimbere.csams.shared.exceptions.BusinessException;
import rw.terimbere.csams.shared.exceptions.ForbiddenException;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.exceptions.ValidationException;
import rw.terimbere.csams.shared.financial.FinancialCalculationService;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;
import rw.terimbere.csams.shared.pagination.PageMapper;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

@Service
@RequiredArgsConstructor
public class LoanService {

    private static final int DEFAULT_TERM_MONTHS = 12;
    private static final EnumSet<LoanStatus> OPEN_LOAN_STATUSES = EnumSet.of(
            LoanStatus.PENDING,
            LoanStatus.AWAITING_SECOND_APPROVAL,
            LoanStatus.APPROVED,
            LoanStatus.ACTIVE,
            LoanStatus.OVERDUE);

    private final LoanRepository loanRepository;
    private final LoanShareTierRepository loanShareTierRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final LoanSettingsService loanSettingsService;
    private final CooperativeRepository cooperativeRepository;
    private final CooperativeMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final CooperativeAuthorizationService authorizationService;
    private final FinancialCalculationService financialCalculationService;
    private final LedgerService ledgerService;
    private final AuditService auditService;
    private final ApprovalTrailService approvalTrailService;
    private final NotificationFacade notificationFacade;
    private final LoanGuarantorService loanGuarantorService;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refreshOverdueStatuses(UUID cooperativeId) {
        loanRepository.markOverdue(cooperativeId, LocalDate.now());
    }

    @Transactional
    public LoanResponse requestLoan(
            UUID cooperativeId, LoanRequestCreateRequest request, HttpServletRequest httpRequest) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);

        boolean canWrite = principal.hasAuthority("LOAN_WRITE")
                || principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN);
        UUID memberUserId;
        if (canWrite && request.getMemberUserId() != null) {
            memberUserId = request.getMemberUserId();
        } else {
            memberUserId = principal.getId();
            if (request.getMemberUserId() != null && !request.getMemberUserId().equals(principal.getId())) {
                throw new ForbiddenException("Members may only request loans for themselves");
            }
        }

        LoanSettings settings = loanSettingsService.requireSettings(cooperativeId);
        InterestType interestType =
                settings.getInterestType() == null ? InterestType.FLAT : settings.getInterestType();
        LoanSettingsService.rejectReducingInterest(interestType);
        if (!canWrite && !settings.isAllowMemberRequests()) {
            throw new BusinessException("Member loan requests are disabled for this cooperative");
        }

        CooperativeMembership membership = membershipRepository
                .findByCooperativeIdAndUserId(cooperativeId, memberUserId)
                .orElseThrow(() -> new ValidationException("User is not a member of this cooperative"));
        if (!"ACTIVE".equalsIgnoreCase(membership.getMembershipStatus())) {
            throw new BusinessException("Only ACTIVE members can receive loans");
        }
        enforceMinMembershipMonths(membership, settings.getMinMembershipMonths());

        BigDecimal amount = MoneyUtils.scaleForStorage(request.getAmount());
        MoneyUtils.assertPositive(amount);
        LoanEligibilityResponse eligibility = evaluateEligibility(cooperativeId, memberUserId, amount, null);
        if (!eligibility.isEligible()) {
            throw new BusinessException(eligibility.getReason());
        }

        LoanGuaranteeMode guaranteeMode = resolveGuaranteeMode(request);

        int termMonths = resolveTermMonths(request.getTermMonths(), settings);
        if (settings.getMaxTermMonths() != null && termMonths > settings.getMaxTermMonths()) {
            throw new BusinessException("Term exceeds maximum allowed months");
        }

        Loan loan = Loan.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(memberUserId)
                .requestedAmount(amount)
                .interestRatePercent(MoneyUtils.scaleForStorage(settings.getInterestRatePercent()))
                .interestType(interestType)
                .termMonths(termMonths)
                .outstandingPrincipal(BigDecimal.ZERO.setScale(MoneyUtils.STORAGE_SCALE))
                .outstandingInterest(BigDecimal.ZERO.setScale(MoneyUtils.STORAGE_SCALE))
                .totalRepaidPrincipal(BigDecimal.ZERO.setScale(MoneyUtils.STORAGE_SCALE))
                .totalRepaidInterest(BigDecimal.ZERO.setScale(MoneyUtils.STORAGE_SCALE))
                .requestDate(LocalDate.now())
                .status(LoanStatus.PENDING)
                .guaranteeMode(guaranteeMode)
                .shareCount(eligibility.getShareCount())
                .sharePercent(eligibility.getSharePercent())
                .maxLoanByShares(
                        eligibility.getMaxLoanByShares() == null
                                ? null
                                : MoneyUtils.scaleForStorage(eligibility.getMaxLoanByShares()))
                .purpose(trimToNull(request.getPurpose()))
                .requestedBy(principal.getId())
                .build();
        loan.setApplicationSnapshot(writeSnapshot(buildApplicationForm(
                cooperative, membership, memberUserId, loan, Instant.now())));
        loan = loanRepository.save(loan);

        approvalTrailService.append(
                cooperativeId,
                ApprovalTrailService.ENTITY_LOAN,
                loan.getId(),
                principal,
                ApprovalAction.SUBMITTED,
                null,
                LoanStatus.PENDING.name(),
                trimToNull(request.getPurpose()));

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.LOAN_REQUEST,
                "Loan",
                loan.getId(),
                null,
                "{\"amount\":\""
                        + amount
                        + "\",\"status\":\"PENDING\",\"guaranteeMode\":\""
                        + guaranteeMode
                        + "\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        if (guaranteeMode == LoanGuaranteeMode.GUARANTOR) {
            if (request.getGuarantorUserId() == null || request.getGuaranteedAmount() == null) {
                throw new ValidationException("A guarantor and guaranteed amount are required for a guaranteed loan");
            }
            loanGuarantorService.assignGuarantor(
                    loan, request.getGuarantorUserId(), request.getGuaranteedAmount(), principal, httpRequest);
        }
        return toResponse(loan, cooperative.getCurrency(), true);
    }

    @Transactional(readOnly = true)
    public LoanApplicationFormResponse applicationPreview(UUID cooperativeId) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        CooperativeMembership membership = membershipRepository
                .findByCooperativeIdAndUserId(cooperativeId, principal.getId())
                .orElseThrow(() -> new ValidationException("User is not a member of this cooperative"));
        LoanSettings settings = loanSettingsService.requireSettings(cooperativeId);
        Loan draft = Loan.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(principal.getId())
                .interestRatePercent(settings.getInterestRatePercent())
                .interestType(settings.getInterestType() == null ? InterestType.FLAT : settings.getInterestType())
                .termMonths(resolveTermMonths(null, settings))
                .requestDate(LocalDate.now())
                .build();
        LoanApplicationFormResponse form =
                buildApplicationForm(cooperative, membership, principal.getId(), draft, Instant.now());
        form.setEligibility(evaluateEligibility(cooperativeId, principal.getId(), null, null));
        return form;
    }

    @Transactional(readOnly = true)
    public LoanEligibilityResponse eligibility(UUID cooperativeId, UUID memberUserId, BigDecimal requestedAmount) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        UUID target = memberUserId;
        boolean canWrite = principal.hasAuthority("LOAN_WRITE")
                || principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN);
        if (target == null || !canWrite) {
            target = principal.getId();
        }
        return evaluateEligibility(cooperativeId, target, requestedAmount, null);
    }

    @Transactional
    public PageResponse<LoanResponse> list(
            UUID cooperativeId,
            LoanStatus status,
            UUID memberUserId,
            boolean pendingApproval,
            Pageable pageable) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        loanRepository.markOverdue(cooperativeId, LocalDate.now());

        Page<Loan> page;
        if (pendingApproval) {
            page = loanRepository.findByCooperativeIdAndStatusIn(
                    cooperativeId,
                    EnumSet.of(LoanStatus.PENDING, LoanStatus.AWAITING_SECOND_APPROVAL),
                    pageable);
        } else if (status != null && memberUserId != null) {
            page = loanRepository.findByCooperativeIdAndMemberUserIdAndStatus(
                    cooperativeId, memberUserId, status, pageable);
        } else if (status != null) {
            page = loanRepository.findByCooperativeIdAndStatus(cooperativeId, status, pageable);
        } else if (memberUserId != null) {
            page = loanRepository.findByCooperativeIdAndMemberUserId(cooperativeId, memberUserId, pageable);
        } else {
            page = loanRepository.findByCooperativeId(cooperativeId, pageable);
        }
        return PageMapper.toPageResponse(page, this::toResponse);
    }

    @Transactional
    public List<LoanResponse> myLoans(UUID cooperativeId) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        loanRepository.markOverdue(cooperativeId, LocalDate.now());
        return loanRepository
                .findByCooperativeIdAndMemberUserIdOrderByRequestDateDescCreatedAtDesc(
                        cooperativeId, principal.getId())
                .stream()
                .map(loan -> toResponse(loan, null, true))
                .toList();
    }

    @Transactional
    public LoanResponse get(UUID cooperativeId, UUID loanId) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        loanRepository.markOverdue(cooperativeId, LocalDate.now());
        return toResponse(requireLoan(cooperativeId, loanId), null, true);
    }

    @Transactional
    public List<LoanResponse> recentForMember(UUID cooperativeId, UUID memberUserId) {
        loanRepository.markOverdue(cooperativeId, LocalDate.now());
        return loanRepository
                .findTop20ByCooperativeIdAndMemberUserIdOrderByRequestDateDescCreatedAtDesc(
                        cooperativeId, memberUserId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LoanResponse approve(
            UUID cooperativeId, UUID loanId, LoanApproveRequest request, HttpServletRequest httpRequest) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        Loan loan = requireLoan(cooperativeId, loanId);
        if (principal.getId().equals(loan.getMemberUserId())) {
            throw new ForbiddenException("A member cannot approve their own loan");
        }
        loanGuarantorService.requireAcceptedIfRequired(loan);
        String previousStatus = loan.getStatus().name();

        if (loan.getStatus() == LoanStatus.PENDING) {
            CooperativeOfficerRoles.requireLoanApprove(principal);
            applyFirstApproval(loan, request, principal);
        } else if (loan.getStatus() == LoanStatus.AWAITING_SECOND_APPROVAL) {
            CooperativeOfficerRoles.requireFundAuthorize(principal);
            if (principal.getId().equals(loan.getFirstApprovedBy())) {
                throw new ForbiddenException("The same person cannot give both loan approvals");
            }
            applySecondApproval(loan, request, principal);
        } else {
            throw new BusinessException("This loan is not waiting for approval");
        }

        loan = loanRepository.save(loan);
        approvalTrailService.append(
                cooperativeId,
                ApprovalTrailService.ENTITY_LOAN,
                loan.getId(),
                principal,
                ApprovalAction.APPROVED,
                previousStatus,
                loan.getStatus().name(),
                null);
        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.APPROVE,
                "Loan",
                loan.getId(),
                "{\"status\":\"" + previousStatus + "\"}",
                "{\"status\":\""
                        + loan.getStatus()
                        + "\",\"approvedAmount\":\""
                        + loan.getApprovedAmount()
                        + "\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        return toResponse(loan, null, true);
    }

    @Transactional
    public LoanResponse reject(
            UUID cooperativeId, UUID loanId, LoanRejectRequest request, HttpServletRequest httpRequest) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        Loan loan = requireLoan(cooperativeId, loanId);
        if (loan.getStatus() == LoanStatus.PENDING) {
            CooperativeOfficerRoles.requireLoanApprove(principal);
        } else if (loan.getStatus() == LoanStatus.AWAITING_SECOND_APPROVAL) {
            CooperativeOfficerRoles.requireFundAuthorize(principal);
            if (principal.getId().equals(loan.getFirstApprovedBy())) {
                throw new ForbiddenException("The same person cannot give both loan approvals");
            }
        } else {
            throw new BusinessException("Only loans awaiting approval can be rejected");
        }
        if (request == null || !StringUtils.hasText(request.getRejectionReason())) {
            throw new ValidationException("Rejection reason is required");
        }

        String previousStatus = loan.getStatus().name();
        loan.setStatus(LoanStatus.REJECTED);
        loan.setRejectionReason(request.getRejectionReason().trim());
        loan.setApprovedBy(principal.getId());
        loan.setApprovalDate(LocalDate.now());
        loan = loanRepository.save(loan);

        approvalTrailService.append(
                cooperativeId,
                ApprovalTrailService.ENTITY_LOAN,
                loan.getId(),
                principal,
                ApprovalAction.REJECTED,
                previousStatus,
                LoanStatus.REJECTED.name(),
                request.getRejectionReason().trim());
        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.REJECT,
                "Loan",
                loan.getId(),
                "{\"status\":\"" + previousStatus + "\"}",
                "{\"status\":\"REJECTED\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        return toResponse(loan, null, true);
    }

    @Transactional
    public LoanResponse disburse(UUID cooperativeId, UUID loanId, HttpServletRequest httpRequest) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        Loan loan = requireLoan(cooperativeId, loanId);
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessException("Only APPROVED loans can be disbursed");
        }

        BigDecimal principalAmount = loan.getApprovedAmount() != null
                ? loan.getApprovedAmount()
                : loan.getRequestedAmount();
        MoneyUtils.assertPositive(principalAmount);

        BigDecimal available = financialCalculationService.calculateAvailableGroupFund(cooperativeId);
        if (available.compareTo(MoneyUtils.scale(principalAmount)) < 0) {
            throw new BusinessException(
                    "INSUFFICIENT_GROUP_FUND",
                    "Available group fund is insufficient for disbursement. Available: "
                            + available
                            + ", required: "
                            + MoneyUtils.scale(principalAmount));
        }

        BigDecimal interest = loan.getInterestAmount() != null
                ? loan.getInterestAmount()
                : LoanInterestCalculator.computeInterest(
                        principalAmount, loan.getInterestRatePercent(), loan.getInterestType());

        LocalDate disbursementDate = LocalDate.now();
        loan.setPrincipalAmount(MoneyUtils.scaleForStorage(principalAmount));
        loan.setInterestAmount(MoneyUtils.scaleForStorage(interest));
        loan.setOutstandingPrincipal(MoneyUtils.scaleForStorage(principalAmount));
        loan.setOutstandingInterest(MoneyUtils.scaleForStorage(interest));
        loan.setDisbursementDate(disbursementDate);
        loan.setDisbursedBy(principal.getId());
        loan.setStatus(LoanStatus.ACTIVE);
        if (loan.getDueDate() == null) {
            loan.setDueDate(disbursementDate.plusMonths(loan.getTermMonths()));
        }
        loan = loanRepository.save(loan);

        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(loan.getMemberUserId())
                .transactionType(LedgerTransactionType.LOAN_DISBURSEMENT)
                .debitAmount(principalAmount)
                .creditAmount(BigDecimal.ZERO)
                .currency(cooperative.getCurrency())
                .transactionDate(disbursementDate)
                .reference("LOAN-" + loan.getId())
                .sourceEntityType(LedgerService.SOURCE_LOAN)
                .sourceEntityId(loan.getId())
                .description("Loan disbursement")
                .recordedBy(principal.getId())
                .approvedBy(principal.getId())
                .idempotencyKey(LedgerService.loanDisbursementKey(loan.getId()))
                .build());

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.DISBURSE,
                "Loan",
                loan.getId(),
                "{\"status\":\"APPROVED\"}",
                "{\"status\":\"ACTIVE\",\"principal\":\"" + principalAmount + "\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        notificationFacade.notifyUser(
                loan.getMemberUserId(),
                cooperativeId,
                NotificationType.LOAN,
                "Loan disbursed",
                "Your loan of " + MoneyUtils.scale(principalAmount) + " has been disbursed.",
                "Loan",
                loan.getId());
        return toResponse(loan);
    }

    @Transactional
    public LoanResponse writeOff(UUID cooperativeId, UUID loanId, HttpServletRequest httpRequest) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        CooperativeOfficerRoles.requireFundAuthorize(principal);
        if (!principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)
                && !principal.hasAuthority("LOAN_WRITE")) {
            throw new ForbiddenException("LOAN_WRITE or SUPER_ADMIN required to write off a loan");
        }

        Loan loan = requireLoan(cooperativeId, loanId);
        if (loan.getStatus() != LoanStatus.ACTIVE && loan.getStatus() != LoanStatus.OVERDUE) {
            throw new BusinessException("Only ACTIVE or OVERDUE loans can be written off");
        }

        // Leave outstanding amounts for reporting; exclude WRITTEN_OFF from dashboard outstanding metric.
        LoanStatus previous = loan.getStatus();
        loan.setStatus(LoanStatus.WRITTEN_OFF);
        loan = loanRepository.save(loan);

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.LOAN_WRITE_OFF,
                "Loan",
                loan.getId(),
                "{\"status\":\"" + previous + "\"}",
                "{\"status\":\"WRITTEN_OFF\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        return toResponse(loan);
    }

    @Transactional
    public LoanRepaymentResponse recordRepayment(
            UUID cooperativeId, UUID loanId, LoanRepaymentCreateRequest request, HttpServletRequest httpRequest) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);
        loanRepository.markOverdue(cooperativeId, LocalDate.now());

        Loan loan = requireLoan(cooperativeId, loanId);
        if (loan.getStatus() != LoanStatus.ACTIVE && loan.getStatus() != LoanStatus.OVERDUE) {
            throw new BusinessException("Repayments are only allowed on ACTIVE or OVERDUE loans");
        }

        BigDecimal amount = MoneyUtils.scaleForStorage(request.getAmount());
        MoneyUtils.assertPositive(amount);

        BigDecimal outstandingPrincipal = loan.getOutstandingPrincipal() == null
                ? BigDecimal.ZERO
                : loan.getOutstandingPrincipal();
        BigDecimal outstandingInterest = loan.getOutstandingInterest() == null
                ? BigDecimal.ZERO
                : loan.getOutstandingInterest();
        BigDecimal totalOutstanding = MoneyUtils.add(
                MoneyUtils.scale(outstandingPrincipal), MoneyUtils.scale(outstandingInterest));

        if (MoneyUtils.scale(amount).compareTo(totalOutstanding) > 0) {
            throw new BusinessException(
                    "REPAYMENT_EXCEEDS_OUTSTANDING",
                    "Repayment amount exceeds outstanding principal + interest (" + totalOutstanding + ")");
        }

        boolean interestFirst = request.getAllocateInterestFirst() == null || request.getAllocateInterestFirst();
        BigDecimal interestPortion;
        BigDecimal principalPortion;
        BigDecimal remaining = amount;

        if (interestFirst) {
            interestPortion = remaining.min(outstandingInterest);
            remaining = remaining.subtract(interestPortion);
            principalPortion = remaining.min(outstandingPrincipal);
        } else {
            principalPortion = remaining.min(outstandingPrincipal);
            remaining = remaining.subtract(principalPortion);
            interestPortion = remaining.min(outstandingInterest);
        }
        interestPortion = MoneyUtils.scaleForStorage(interestPortion);
        principalPortion = MoneyUtils.scaleForStorage(principalPortion);
        BigDecimal amountTotal = MoneyUtils.scaleForStorage(principalPortion.add(interestPortion));

        LoanRepayment repayment = LoanRepayment.builder()
                .loanId(loan.getId())
                .cooperativeId(cooperativeId)
                .memberUserId(loan.getMemberUserId())
                .paymentDate(request.getPaymentDate())
                .amountTotal(amountTotal)
                .principalPortion(principalPortion)
                .interestPortion(interestPortion)
                .paymentReference(trimToNull(request.getPaymentReference()))
                .notes(trimToNull(request.getNotes()))
                .recordedBy(principal.getId())
                .build();
        repayment = loanRepaymentRepository.save(repayment);

        loan.setOutstandingPrincipal(
                MoneyUtils.scaleForStorage(outstandingPrincipal.subtract(principalPortion)));
        loan.setOutstandingInterest(
                MoneyUtils.scaleForStorage(outstandingInterest.subtract(interestPortion)));
        loan.setTotalRepaidPrincipal(MoneyUtils.scaleForStorage(
                (loan.getTotalRepaidPrincipal() == null ? BigDecimal.ZERO : loan.getTotalRepaidPrincipal())
                        .add(principalPortion)));
        loan.setTotalRepaidInterest(MoneyUtils.scaleForStorage(
                (loan.getTotalRepaidInterest() == null ? BigDecimal.ZERO : loan.getTotalRepaidInterest())
                        .add(interestPortion)));

        if (MoneyUtils.isZero(MoneyUtils.scale(loan.getOutstandingPrincipal()))
                && MoneyUtils.isZero(MoneyUtils.scale(loan.getOutstandingInterest()))) {
            loan.setStatus(LoanStatus.CLOSED);
        } else if (loan.getStatus() == LoanStatus.OVERDUE
                && loan.getDueDate() != null
                && !loan.getDueDate().isBefore(LocalDate.now())) {
            loan.setStatus(LoanStatus.ACTIVE);
        }
        loanRepository.save(loan);

        if (principalPortion.compareTo(BigDecimal.ZERO) > 0) {
            ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                    .cooperativeId(cooperativeId)
                    .memberUserId(loan.getMemberUserId())
                    .transactionType(LedgerTransactionType.LOAN_PRINCIPAL_REPAYMENT)
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(principalPortion)
                    .currency(cooperative.getCurrency())
                    .transactionDate(request.getPaymentDate())
                    .reference(repayment.getPaymentReference())
                    .sourceEntityType(LedgerService.SOURCE_LOAN_REPAYMENT)
                    .sourceEntityId(repayment.getId())
                    .description("Loan principal repayment")
                    .recordedBy(principal.getId())
                    .approvedBy(principal.getId())
                    .idempotencyKey(LedgerService.loanPrincipalRepaymentKey(repayment.getId()))
                    .build());
        }
        if (interestPortion.compareTo(BigDecimal.ZERO) > 0) {
            ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                    .cooperativeId(cooperativeId)
                    .memberUserId(loan.getMemberUserId())
                    .transactionType(LedgerTransactionType.LOAN_INTEREST_PAYMENT)
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(interestPortion)
                    .currency(cooperative.getCurrency())
                    .transactionDate(request.getPaymentDate())
                    .reference(repayment.getPaymentReference())
                    .sourceEntityType(LedgerService.SOURCE_LOAN_REPAYMENT)
                    .sourceEntityId(repayment.getId())
                    .description("Loan interest payment")
                    .recordedBy(principal.getId())
                    .approvedBy(principal.getId())
                    .idempotencyKey(LedgerService.loanInterestRepaymentKey(repayment.getId()))
                    .build());
        }

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.REPAY,
                "LoanRepayment",
                repayment.getId(),
                null,
                "{\"loanId\":\"" + loanId + "\",\"amount\":\"" + amountTotal + "\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        return toRepaymentResponse(repayment);
    }

    @Transactional(readOnly = true)
    public List<LoanRepaymentResponse> listRepayments(UUID cooperativeId, UUID loanId) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        requireLoan(cooperativeId, loanId);
        return loanRepaymentRepository
                .findByLoanIdAndCooperativeIdOrderByPaymentDateDescCreatedAtDesc(loanId, cooperativeId)
                .stream()
                .map(this::toRepaymentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal sumOutstandingPrincipalActiveOverdue(UUID cooperativeId) {
        BigDecimal sum = loanRepository.sumOutstandingPrincipalByStatuses(
                cooperativeId, EnumSet.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE));
        return MoneyUtils.scale(sum == null ? BigDecimal.ZERO : sum);
    }

    @Transactional(readOnly = true)
    public BigDecimal sumDisbursedPrincipal(UUID cooperativeId) {
        BigDecimal sum = loanRepository.sumPrincipalByStatuses(
                cooperativeId,
                EnumSet.of(LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.CLOSED, LoanStatus.WRITTEN_OFF));
        return MoneyUtils.scale(sum == null ? BigDecimal.ZERO : sum);
    }

    @Transactional(readOnly = true)
    public long countOverdue(UUID cooperativeId) {
        return loanRepository.countByCooperativeIdAndStatus(cooperativeId, LoanStatus.OVERDUE);
    }

    private void enforceMinMembershipMonths(CooperativeMembership membership, int minMonths) {
        if (minMonths <= 0) {
            return;
        }
        LocalDate membershipDate = membership.getMembershipDate();
        if (membershipDate == null) {
            throw new BusinessException("Membership date is required to validate loan eligibility");
        }
        long months = ChronoUnit.MONTHS.between(membershipDate, LocalDate.now());
        if (months < minMonths) {
            throw new BusinessException(
                    "Member must have at least " + minMonths + " months of membership to request a loan");
        }
    }

    private LoanEligibilityResponse evaluateEligibility(
            UUID cooperativeId, UUID memberUserId, BigDecimal requestedAmount, UUID excludeLoanId) {
        List<Loan> openLoans = loanRepository.findByCooperativeIdAndMemberUserIdAndStatusIn(
                cooperativeId, memberUserId, OPEN_LOAN_STATUSES);
        BigDecimal existingAmount = BigDecimal.ZERO;
        BigDecimal repaid = BigDecimal.ZERO;
        BigDecimal outstanding = BigDecimal.ZERO;
        for (Loan open : openLoans) {
            if (excludeLoanId != null && excludeLoanId.equals(open.getId())) {
                continue;
            }
            BigDecimal principal = open.getPrincipalAmount() != null
                    ? open.getPrincipalAmount()
                    : open.getApprovedAmount() != null ? open.getApprovedAmount() : open.getRequestedAmount();
            existingAmount = existingAmount.add(principal == null ? BigDecimal.ZERO : principal);
            repaid = repaid.add(open.getTotalRepaidPrincipal() == null
                    ? BigDecimal.ZERO
                    : open.getTotalRepaidPrincipal());
            repaid = repaid.add(open.getTotalRepaidInterest() == null
                    ? BigDecimal.ZERO
                    : open.getTotalRepaidInterest());
            outstanding = outstanding.add(open.getOutstandingPrincipal() == null
                    ? BigDecimal.ZERO
                    : open.getOutstandingPrincipal());
            outstanding = outstanding.add(open.getOutstandingInterest() == null
                    ? BigDecimal.ZERO
                    : open.getOutstandingInterest());
            if (open.getStatus() == LoanStatus.PENDING
                    || open.getStatus() == LoanStatus.AWAITING_SECOND_APPROVAL
                    || open.getStatus() == LoanStatus.APPROVED) {
                outstanding = outstanding.add(
                        principal == null || principal.compareTo(BigDecimal.ZERO) == 0
                                ? (open.getRequestedAmount() == null ? BigDecimal.ZERO : open.getRequestedAmount())
                                : BigDecimal.ZERO);
            }
        }
        boolean hasOpen = openLoans.stream()
                .anyMatch(open -> excludeLoanId == null || !excludeLoanId.equals(open.getId()));
        boolean eligible = !hasOpen;
        String reason = eligible
                ? "Member is eligible for a new loan"
                : "Member already has an outstanding or in-progress loan";

        CooperativeMembership membership = membershipRepository
                .findByCooperativeIdAndUserId(cooperativeId, memberUserId)
                .orElse(null);
        int shareCount = membership == null
                ? ShareAmountCalculator.DEFAULT_SHARE_COUNT
                : ShareAmountCalculator.normalizeShareCount(membership.getShareCount());
        Number totalSharesNumber = membershipRepository.sumShareCountByCooperativeIdAndActiveStatus(cooperativeId);
        long totalShares = totalSharesNumber == null ? 0L : totalSharesNumber.longValue();
        BigDecimal sharePercent = LoanShareLimitCalculator.sharePercent(shareCount, totalShares);
        List<LoanShareTier> tiers =
                loanShareTierRepository.findByCooperativeIdOrderByMinSharePercentDesc(cooperativeId);
        BigDecimal maxByShares = LoanShareLimitCalculator.matchingMaxLoan(sharePercent, tiers).orElse(null);
        LoanSettings settings = loanSettingsService.requireSettings(cooperativeId);
        BigDecimal effectiveMax = settings.getMaxLoanAmount();
        if (!tiers.isEmpty() && maxByShares == null && eligible) {
            eligible = false;
            reason = "Member share percentage does not meet any configured loan level";
            effectiveMax = BigDecimal.ZERO.setScale(MoneyUtils.STORAGE_SCALE);
        } else if (maxByShares != null) {
            effectiveMax = effectiveMax == null ? maxByShares : effectiveMax.min(maxByShares);
        }
        if (eligible && requestedAmount != null && effectiveMax != null
                && MoneyUtils.scaleForStorage(requestedAmount).compareTo(MoneyUtils.scaleForStorage(effectiveMax))
                        > 0) {
            eligible = false;
            reason = maxByShares != null
                    ? "Requested amount exceeds the loan level for this member's share percentage (maximum "
                            + MoneyUtils.scale(effectiveMax)
                            + ")"
                    : "Requested amount exceeds maximum loan amount";
        }

        return LoanEligibilityResponse.builder()
                .memberUserId(memberUserId)
                .eligible(eligible)
                .reason(reason)
                .existingLoanAmount(MoneyUtils.scale(existingAmount))
                .amountAlreadyRepaid(MoneyUtils.scale(repaid))
                .outstandingBalance(MoneyUtils.scale(outstanding))
                .requestedAmount(requestedAmount == null ? null : MoneyUtils.scale(requestedAmount))
                .shareCount(shareCount)
                .totalShares(totalShares)
                .sharePercent(sharePercent)
                .maxLoanByShares(maxByShares == null ? null : MoneyUtils.scale(maxByShares))
                .maxEligibleAmount(effectiveMax == null ? null : MoneyUtils.scale(effectiveMax))
                .build();
    }

    private static LoanGuaranteeMode resolveGuaranteeMode(LoanRequestCreateRequest request) {
        if (request.getGuaranteeMode() != null) {
            return request.getGuaranteeMode();
        }
        return request.getGuarantorUserId() != null ? LoanGuaranteeMode.GUARANTOR : LoanGuaranteeMode.SELF;
    }

    private int resolveTermMonths(Integer requested, LoanSettings settings) {
        if (requested != null) {
            return requested;
        }
        if (settings.getMaxTermMonths() != null) {
            return Math.min(DEFAULT_TERM_MONTHS, settings.getMaxTermMonths());
        }
        return DEFAULT_TERM_MONTHS;
    }

    private Loan requireLoan(UUID cooperativeId, UUID loanId) {
        return loanRepository
                .findByIdAndCooperativeId(loanId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Loan", loanId));
    }

    private Cooperative requireCooperative(UUID cooperativeId) {
        return cooperativeRepository
                .findByIdAndDeletedFalse(cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooperative", cooperativeId));
    }

    private void applyFirstApproval(Loan loan, LoanApproveRequest request, UserPrincipal principal) {
        LoanSettings settings = loanSettingsService.requireSettings(loan.getCooperativeId());
        BigDecimal approvedAmount = request != null && request.getApprovedAmount() != null
                ? MoneyUtils.scaleForStorage(request.getApprovedAmount())
                : loan.getRequestedAmount();
        MoneyUtils.assertPositive(approvedAmount);
        LoanEligibilityResponse eligibility = evaluateEligibility(
                loan.getCooperativeId(), loan.getMemberUserId(), approvedAmount, loan.getId());
        if (eligibility.getMaxEligibleAmount() != null
                && approvedAmount.compareTo(MoneyUtils.scaleForStorage(eligibility.getMaxEligibleAmount())) > 0) {
            throw new BusinessException(
                    eligibility.getReason() == null
                            ? "Approved amount exceeds the loan level for this member's shares"
                            : eligibility.getReason());
        }
        if (request != null && request.getTermMonths() != null) {
            int term = request.getTermMonths();
            if (settings.getMaxTermMonths() != null && term > settings.getMaxTermMonths()) {
                throw new BusinessException("Term exceeds maximum allowed months");
            }
            loan.setTermMonths(term);
        }
        BigDecimal interest = LoanInterestCalculator.computeInterest(
                approvedAmount, loan.getInterestRatePercent(), loan.getInterestType());
        loan.setApprovedAmount(approvedAmount);
        loan.setInterestAmount(interest);
        loan.setFirstApprovedBy(principal.getId());
        loan.setFirstApprovedAt(Instant.now());
        loan.setFirstApproverRole(CooperativeOfficerRoles.displayRole(principal));
        loan.setStatus(LoanStatus.AWAITING_SECOND_APPROVAL);
        applyDueDate(loan, request);
    }

    private void applySecondApproval(Loan loan, LoanApproveRequest request, UserPrincipal principal) {
        if (request != null && request.getApprovedAmount() != null) {
            MoneyUtils.assertPositive(request.getApprovedAmount());
            loan.setApprovedAmount(MoneyUtils.scaleForStorage(request.getApprovedAmount()));
            loan.setInterestAmount(LoanInterestCalculator.computeInterest(
                    loan.getApprovedAmount(), loan.getInterestRatePercent(), loan.getInterestType()));
        }
        loan.setApprovedBy(principal.getId());
        loan.setApprovalDate(LocalDate.now());
        loan.setStatus(LoanStatus.APPROVED);
        applyDueDate(loan, request);
    }

    private static void applyDueDate(Loan loan, LoanApproveRequest request) {
        if (request == null || request.getDueDate() == null) {
            return;
        }
        LocalDate reference = loan.getApprovalDate() == null ? LocalDate.now() : loan.getApprovalDate();
        if (request.getDueDate().isBefore(reference)) {
            throw new ValidationException("dueDate must be on or after the approval date");
        }
        loan.setDueDate(request.getDueDate());
    }

    private LoanResponse toResponse(Loan loan) {
        return toResponse(loan, null, false);
    }

    private LoanResponse toResponse(Loan loan, String ignoredCurrency) {
        return toResponse(loan, ignoredCurrency, false);
    }

    private LoanResponse toResponse(Loan loan, String ignoredCurrency, boolean includeHistory) {
        String memberName = userRepository
                .findByIdAndDeletedFalse(loan.getMemberUserId())
                .map(this::formatName)
                .orElse(null);
        LoanApplicationFormResponse form = parseSnapshot(loan.getApplicationSnapshot());
        if (form == null) {
            form = buildApplicationFormFromLoan(loan);
        }
        return LoanResponse.builder()
                .id(loan.getId())
                .cooperativeId(loan.getCooperativeId())
                .memberUserId(loan.getMemberUserId())
                .memberName(memberName)
                .requestedAmount(scaleOrNull(loan.getRequestedAmount()))
                .approvedAmount(scaleOrNull(loan.getApprovedAmount()))
                .principalAmount(scaleOrNull(loan.getPrincipalAmount()))
                .interestRatePercent(
                        loan.getInterestRatePercent() == null
                                ? null
                                : MoneyUtils.scale(loan.getInterestRatePercent()))
                .interestType(loan.getInterestType())
                .termMonths(loan.getTermMonths())
                .interestAmount(scaleOrNull(loan.getInterestAmount()))
                .outstandingPrincipal(scaleOrNull(loan.getOutstandingPrincipal()))
                .outstandingInterest(scaleOrNull(loan.getOutstandingInterest()))
                .totalRepaidPrincipal(scaleOrNull(loan.getTotalRepaidPrincipal()))
                .totalRepaidInterest(scaleOrNull(loan.getTotalRepaidInterest()))
                .requestDate(loan.getRequestDate())
                .approvalDate(loan.getApprovalDate())
                .disbursementDate(loan.getDisbursementDate())
                .dueDate(loan.getDueDate())
                .status(loan.getStatus())
                .guaranteeMode(loan.getGuaranteeMode() == null ? LoanGuaranteeMode.SELF : loan.getGuaranteeMode())
                .shareCount(loan.getShareCount())
                .sharePercent(loan.getSharePercent())
                .maxLoanByShares(scaleOrNull(loan.getMaxLoanByShares()))
                .purpose(loan.getPurpose())
                .rejectionReason(loan.getRejectionReason())
                .requestedBy(loan.getRequestedBy())
                .approvedBy(loan.getApprovedBy())
                .disbursedBy(loan.getDisbursedBy())
                .firstApprovedBy(loan.getFirstApprovedBy())
                .firstApprovedAt(loan.getFirstApprovedAt())
                .firstApproverRole(loan.getFirstApproverRole())
                .applicationForm(form)
                .eligibility(evaluateEligibility(
                        loan.getCooperativeId(), loan.getMemberUserId(), loan.getRequestedAmount(), loan.getId()))
                .guarantor(loanGuarantorService.findForLoan(loan.getId()))
                .approvalHistory(
                        includeHistory
                                ? approvalTrailService.list(
                                        loan.getCooperativeId(),
                                        ApprovalTrailService.ENTITY_LOAN,
                                        loan.getId())
                                : List.of())
                .createdAt(loan.getCreatedAt())
                .updatedAt(loan.getUpdatedAt())
                .build();
    }

    private LoanApplicationFormResponse buildApplicationFormFromLoan(Loan loan) {
        Cooperative cooperative = cooperativeRepository
                .findByIdAndDeletedFalse(loan.getCooperativeId())
                .orElse(null);
        CooperativeMembership membership = membershipRepository
                .findByCooperativeIdAndUserId(loan.getCooperativeId(), loan.getMemberUserId())
                .orElse(null);
        return buildApplicationForm(
                cooperative,
                membership,
                loan.getMemberUserId(),
                loan,
                loan.getCreatedAt());
    }

    private LoanApplicationFormResponse buildApplicationForm(
            Cooperative cooperative,
            CooperativeMembership membership,
            UUID memberUserId,
            Loan loan,
            Instant submittedAt) {
        User member = userRepository.findByIdAndDeletedFalse(memberUserId).orElse(null);
        return LoanApplicationFormResponse.builder()
                .cooperativeId(cooperative == null ? loan.getCooperativeId() : cooperative.getId())
                .cooperativeName(cooperative == null ? null : cooperative.getName())
                .currency(cooperative == null ? null : cooperative.getCurrency())
                .memberUserId(memberUserId)
                .memberFullName(member == null ? null : formatName(member))
                .username(member == null ? null : member.getUsername())
                .email(member == null ? null : member.getEmail())
                .phone(member == null ? null : member.getPhone())
                .nationalId(member == null ? null : member.getNationalId())
                .address(member == null ? null : member.getAddress())
                .membershipDate(membership == null ? null : membership.getMembershipDate())
                .membershipStatus(membership == null ? null : membership.getMembershipStatus())
                .roleInCooperative(membership == null ? null : membership.getRoleInCooperative())
                .requestedAmount(scaleOrNull(loan.getRequestedAmount()))
                .purpose(loan.getPurpose())
                .termMonths(loan.getTermMonths() == 0 ? null : loan.getTermMonths())
                .interestRatePercent(
                        loan.getInterestRatePercent() == null
                                ? null
                                : MoneyUtils.scale(loan.getInterestRatePercent()))
                .interestType(loan.getInterestType())
                .requestDate(loan.getRequestDate())
                .submittedAt(submittedAt)
                .build();
    }

    private String writeSnapshot(LoanApplicationFormResponse form) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("cooperativeId", form.getCooperativeId());
            payload.put("cooperativeName", form.getCooperativeName());
            payload.put("currency", form.getCurrency());
            payload.put("memberUserId", form.getMemberUserId());
            payload.put("memberFullName", form.getMemberFullName());
            payload.put("username", form.getUsername());
            payload.put("email", form.getEmail());
            payload.put("phone", form.getPhone());
            payload.put("nationalId", form.getNationalId());
            payload.put("address", form.getAddress());
            payload.put("membershipDate", form.getMembershipDate());
            payload.put("membershipStatus", form.getMembershipStatus());
            payload.put("roleInCooperative", form.getRoleInCooperative());
            payload.put("requestedAmount", form.getRequestedAmount());
            payload.put("purpose", form.getPurpose());
            payload.put("termMonths", form.getTermMonths());
            payload.put("interestRatePercent", form.getInterestRatePercent());
            payload.put("interestType", form.getInterestType());
            payload.put("requestDate", form.getRequestDate());
            payload.put("submittedAt", form.getSubmittedAt());
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to snapshot loan application", ex);
        }
    }

    private LoanApplicationFormResponse parseSnapshot(String snapshot) {
        if (!StringUtils.hasText(snapshot)) {
            return null;
        }
        try {
            return objectMapper.readValue(snapshot, LoanApplicationFormResponse.class);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private LoanRepaymentResponse toRepaymentResponse(LoanRepayment repayment) {
        return LoanRepaymentResponse.builder()
                .id(repayment.getId())
                .loanId(repayment.getLoanId())
                .cooperativeId(repayment.getCooperativeId())
                .memberUserId(repayment.getMemberUserId())
                .paymentDate(repayment.getPaymentDate())
                .amountTotal(MoneyUtils.scale(repayment.getAmountTotal()))
                .principalPortion(MoneyUtils.scale(repayment.getPrincipalPortion()))
                .interestPortion(MoneyUtils.scale(repayment.getInterestPortion()))
                .paymentReference(repayment.getPaymentReference())
                .notes(repayment.getNotes())
                .recordedBy(repayment.getRecordedBy())
                .createdAt(repayment.getCreatedAt())
                .build();
    }

    private String formatName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private static BigDecimal scaleOrNull(BigDecimal value) {
        return value == null ? null : MoneyUtils.scale(value);
    }

    private static String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }
}
