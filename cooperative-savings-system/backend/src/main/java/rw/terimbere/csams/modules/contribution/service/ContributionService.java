package rw.terimbere.csams.modules.contribution.service;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.audit.service.AuditService;
import rw.terimbere.csams.modules.contribution.dto.ContributionBatchRequest;
import rw.terimbere.csams.modules.contribution.dto.ContributionLineRequest;
import rw.terimbere.csams.modules.contribution.dto.ContributionPeriodSummaryResponse;
import rw.terimbere.csams.modules.contribution.dto.ContributionResponse;
import rw.terimbere.csams.modules.contribution.dto.ContributionUpdateRequest;
import rw.terimbere.csams.modules.contribution.dto.MonthlyContributionChartPoint;
import rw.terimbere.csams.modules.contribution.entity.Contribution;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.ledger.service.LedgerService;
import rw.terimbere.csams.modules.membership.entity.CooperativeMembership;
import rw.terimbere.csams.modules.membership.repository.CooperativeMembershipRepository;
import rw.terimbere.csams.modules.user.entity.User;
import rw.terimbere.csams.modules.user.repository.UserRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.security.UserPrincipal;
import rw.terimbere.csams.shared.auditing.AuditableAction;
import rw.terimbere.csams.shared.common.dto.PageResponse;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.exceptions.ValidationException;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;
import rw.terimbere.csams.shared.pagination.PageMapper;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

@Service
@RequiredArgsConstructor
public class ContributionService {

    private final ContributionRepository contributionRepository;
    private final CooperativeRepository cooperativeRepository;
    private final CooperativeMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final CooperativeAuthorizationService authorizationService;
    private final LedgerService ledgerService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<ContributionResponse> getOrBuildPeriodGrid(UUID cooperativeId, int year, int month) {
        validatePeriod(year, month);
        Cooperative cooperative = requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);

        BigDecimal expectedDefault = MoneyUtils.scaleForStorage(cooperative.getMonthlyContributionAmount());
        List<CooperativeMembership> activeMembers =
                membershipRepository.findByCooperativeIdAndMembershipStatus(cooperativeId, "ACTIVE");
        Map<UUID, Contribution> existing = contributionRepository
                .findByCooperativeIdAndYearAndMonth(cooperativeId, year, month)
                .stream()
                .collect(Collectors.toMap(Contribution::getMemberUserId, c -> c, (a, b) -> a));

        Map<UUID, String> names = loadMemberNames(
                activeMembers.stream().map(CooperativeMembership::getUserId).toList());

        List<ContributionResponse> rows = new ArrayList<>();
        for (CooperativeMembership membership : activeMembers) {
            Contribution saved = existing.get(membership.getUserId());
            if (saved != null) {
                rows.add(toResponse(saved, names.get(membership.getUserId()), true));
            } else {
                rows.add(ContributionResponse.builder()
                        .cooperativeId(cooperativeId)
                        .memberUserId(membership.getUserId())
                        .memberName(names.get(membership.getUserId()))
                        .year(year)
                        .month(month)
                        .expectedAmount(MoneyUtils.scale(expectedDefault))
                        .paidAmount(MoneyUtils.scale(BigDecimal.ZERO))
                        .outstandingAmount(MoneyUtils.scale(expectedDefault))
                        .status(ContributionStatus.PENDING)
                        .persisted(false)
                        .build());
            }
        }
        rows.sort(Comparator.comparing(
                r -> r.getMemberName() == null ? "" : r.getMemberName(), String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    @Transactional
    public List<ContributionResponse> batchSave(
            UUID cooperativeId,
            int year,
            int month,
            ContributionBatchRequest request,
            HttpServletRequest httpRequest) {
        validatePeriod(year, month);
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);

        List<ContributionResponse> results = new ArrayList<>();
        for (ContributionLineRequest line : request.getLines()) {
            results.add(upsertLine(cooperative, year, month, line, principal.getId()));
        }

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.CONTRIBUTION_BATCH,
                "ContributionPeriod",
                null,
                null,
                "{\"year\":" + year + ",\"month\":" + month + ",\"lines\":" + request.getLines().size() + "}",
                clientIp(httpRequest),
                userAgent(httpRequest));

        Map<UUID, String> names = loadMemberNames(
                results.stream().map(ContributionResponse::getMemberUserId).toList());
        return results.stream()
                .map(r -> {
                    r.setMemberName(names.get(r.getMemberUserId()));
                    return r;
                })
                .toList();
    }

    @Transactional
    public ContributionResponse updateSingle(
            UUID cooperativeId,
            UUID contributionId,
            ContributionUpdateRequest request,
            HttpServletRequest httpRequest) {
        requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);

        Contribution contribution = contributionRepository
                .findByIdAndCooperativeId(contributionId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution", contributionId));

        String previous = toAuditJson(contribution);

        ContributionLineRequest line = ContributionLineRequest.builder()
                .memberUserId(contribution.getMemberUserId())
                .paidAmount(request.getPaidAmount() != null ? request.getPaidAmount() : contribution.getPaidAmount())
                .expectedAmount(
                        request.getExpectedAmount() != null
                                ? request.getExpectedAmount()
                                : contribution.getExpectedAmount())
                .paymentDate(
                        request.getPaymentDate() != null ? request.getPaymentDate() : contribution.getPaymentDate())
                .paymentReference(
                        request.getPaymentReference() != null
                                ? request.getPaymentReference()
                                : contribution.getPaymentReference())
                .notes(request.getNotes() != null ? request.getNotes() : contribution.getNotes())
                .status(request.getStatus() != null ? request.getStatus() : null)
                .build();

        applyLine(contribution, requireCooperative(cooperativeId), line, principal.getId());
        contribution = contributionRepository.save(contribution);
        syncLedger(contribution, principal.getId(), requireCooperative(cooperativeId).getCurrency());

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.CONTRIBUTION_UPDATE,
                "Contribution",
                contribution.getId(),
                previous,
                toAuditJson(contribution),
                clientIp(httpRequest),
                userAgent(httpRequest));

        String name = userRepository
                .findByIdAndDeletedFalse(contribution.getMemberUserId())
                .map(User::getFullName)
                .orElse(null);
        return toResponse(contribution, name, true);
    }

    @Transactional(readOnly = true)
    public ContributionResponse getById(UUID cooperativeId, UUID contributionId) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        Contribution contribution = contributionRepository
                .findByIdAndCooperativeId(contributionId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution", contributionId));
        String name = userRepository
                .findByIdAndDeletedFalse(contribution.getMemberUserId())
                .map(User::getFullName)
                .orElse(null);
        return toResponse(contribution, name, true);
    }

    @Transactional(readOnly = true)
    public PageResponse<ContributionResponse> history(
            UUID cooperativeId,
            UUID memberUserId,
            Integer year,
            Integer month,
            ContributionStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        if (year != null) {
            validateYear(year);
        }
        if (month != null) {
            validateMonth(month);
        }

        Page<Contribution> page = contributionRepository.search(
                cooperativeId, memberUserId, year, month, status, fromDate, toDate, pageable);
        Map<UUID, String> names = loadMemberNames(
                page.getContent().stream().map(Contribution::getMemberUserId).distinct().toList());
        return PageMapper.toPageResponse(
                page, c -> toResponse(c, names.get(c.getMemberUserId()), true));
    }

    @Transactional(readOnly = true)
    public List<ContributionResponse> getMemberContributionHistory(UUID cooperativeId, UUID memberUserId) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        if (!membershipRepository.existsByCooperativeIdAndUserId(cooperativeId, memberUserId)) {
            throw new ResourceNotFoundException("Membership for user", memberUserId);
        }
        String name = userRepository
                .findByIdAndDeletedFalse(memberUserId)
                .map(User::getFullName)
                .orElse(null);
        return contributionRepository
                .findByCooperativeIdAndMemberUserIdOrderByYearDescMonthDesc(cooperativeId, memberUserId)
                .stream()
                .map(c -> toResponse(c, name, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContributionResponse> getMyContributions(UUID cooperativeId) {
        UserPrincipal principal = authorizationService.currentPrincipal();
        return getMemberContributionHistory(cooperativeId, principal.getId());
    }

    @Transactional(readOnly = true)
    public List<ContributionResponse> recentForMember(UUID cooperativeId, UUID memberUserId) {
        String name = userRepository
                .findByIdAndDeletedFalse(memberUserId)
                .map(User::getFullName)
                .orElse(null);
        return contributionRepository
                .findTop20ByCooperativeIdAndMemberUserIdOrderByYearDescMonthDesc(cooperativeId, memberUserId)
                .stream()
                .map(c -> toResponse(c, name, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public ContributionPeriodSummaryResponse summary(UUID cooperativeId, Integer year, Integer month) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        if (year != null) {
            validateYear(year);
        }
        if (month != null) {
            validateMonth(month);
        }

        List<ContributionResponse> grid;
        if (year != null && month != null) {
            grid = getOrBuildPeriodGrid(cooperativeId, year, month);
        } else {
            grid = contributionRepository
                    .search(cooperativeId, null, year, month, null, null, null, Pageable.unpaged())
                    .getContent()
                    .stream()
                    .map(c -> toResponse(c, null, true))
                    .toList();
        }

        BigDecimal expected = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        BigDecimal outstanding = BigDecimal.ZERO;
        long paidCount = 0;
        long pendingCount = 0;
        for (ContributionResponse row : grid) {
            expected = MoneyUtils.add(expected, row.getExpectedAmount());
            paid = MoneyUtils.add(paid, row.getPaidAmount());
            outstanding = MoneyUtils.add(outstanding, row.getOutstandingAmount());
            if (row.getStatus() == ContributionStatus.PAID || row.getStatus() == ContributionStatus.PARTIALLY_PAID) {
                paidCount++;
            }
            if (row.getStatus() == ContributionStatus.PENDING) {
                pendingCount++;
            }
        }

        return ContributionPeriodSummaryResponse.builder()
                .year(year == null ? 0 : year)
                .month(month)
                .expectedTotal(expected)
                .paidTotal(paid)
                .outstandingTotal(outstanding)
                .memberCount(grid.size())
                .paidCount(paidCount)
                .pendingCount(pendingCount)
                .currency(cooperative.getCurrency())
                .build();
    }

    @Transactional(readOnly = true)
    public List<MonthlyContributionChartPoint> monthlyChart(UUID cooperativeId, int year) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        validateYear(year);

        Map<Integer, BigDecimal> byMonth = new HashMap<>();
        for (int m = 1; m <= 12; m++) {
            byMonth.put(m, MoneyUtils.scale(BigDecimal.ZERO));
        }
        for (Object[] row : contributionRepository.sumPaidByMonth(cooperativeId, year)) {
            int month = ((Number) row[0]).intValue();
            BigDecimal total = (BigDecimal) row[1];
            byMonth.put(month, MoneyUtils.scale(total == null ? BigDecimal.ZERO : total));
        }
        List<MonthlyContributionChartPoint> points = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            points.add(MonthlyContributionChartPoint.builder()
                    .month(m)
                    .totalPaid(byMonth.get(m))
                    .build());
        }
        return points;
    }

    private ContributionResponse upsertLine(
            Cooperative cooperative,
            int year,
            int month,
            ContributionLineRequest line,
            UUID recordedBy) {
        if (line.getMemberUserId() == null) {
            throw new ValidationException("memberUserId is required");
        }
        if (!membershipRepository.existsByCooperativeIdAndUserId(cooperative.getId(), line.getMemberUserId())) {
            throw new ValidationException("Member is not part of this cooperative: " + line.getMemberUserId());
        }

        Contribution contribution = contributionRepository
                .findByCooperativeIdAndMemberUserIdAndYearAndMonth(
                        cooperative.getId(), line.getMemberUserId(), year, month)
                .orElseGet(() -> Contribution.builder()
                        .cooperativeId(cooperative.getId())
                        .memberUserId(line.getMemberUserId())
                        .year(year)
                        .month(month)
                        .expectedAmount(MoneyUtils.scaleForStorage(cooperative.getMonthlyContributionAmount()))
                        .paidAmount(BigDecimal.ZERO)
                        .outstandingAmount(MoneyUtils.scaleForStorage(cooperative.getMonthlyContributionAmount()))
                        .status(ContributionStatus.PENDING)
                        .ledgerRevision(0)
                        .build());

        applyLine(contribution, cooperative, line, recordedBy);
        contribution = contributionRepository.save(contribution);
        syncLedger(contribution, recordedBy, cooperative.getCurrency());
        return toResponse(contribution, null, true);
    }

    private void applyLine(
            Contribution contribution, Cooperative cooperative, ContributionLineRequest line, UUID recordedBy) {
        BigDecimal expected = line.getExpectedAmount() != null
                ? MoneyUtils.scaleForStorage(line.getExpectedAmount())
                : contribution.getExpectedAmount() != null
                        ? MoneyUtils.scaleForStorage(contribution.getExpectedAmount())
                        : MoneyUtils.scaleForStorage(cooperative.getMonthlyContributionAmount());
        MoneyUtils.assertNonNegative(expected);

        BigDecimal paid = MoneyUtils.scaleForStorage(
                line.getPaidAmount() == null ? BigDecimal.ZERO : line.getPaidAmount());
        MoneyUtils.assertNonNegative(paid);

        contribution.setExpectedAmount(expected);
        contribution.setPaidAmount(paid);
        contribution.setOutstandingAmount(MoneyUtils.scaleForStorage(expected.subtract(paid).max(BigDecimal.ZERO)));
        contribution.setPaymentDate(line.getPaymentDate());
        contribution.setPaymentReference(trimToNull(line.getPaymentReference()));
        contribution.setNotes(trimToNull(line.getNotes()));
        contribution.setRecordedBy(recordedBy);

        if (line.getStatus() == ContributionStatus.WAIVED || line.getStatus() == ContributionStatus.CANCELLED) {
            contribution.setStatus(line.getStatus());
            if (line.getStatus() == ContributionStatus.WAIVED) {
                contribution.setOutstandingAmount(MoneyUtils.scaleForStorage(BigDecimal.ZERO));
            }
        } else {
            contribution.setStatus(deriveStatus(expected, paid));
        }
    }

    private void syncLedger(Contribution contribution, UUID recordedBy, String currency) {
        boolean shouldPost = (contribution.getStatus() == ContributionStatus.PAID
                        || contribution.getStatus() == ContributionStatus.PARTIALLY_PAID)
                && contribution.getPaidAmount() != null
                && contribution.getPaidAmount().compareTo(BigDecimal.ZERO) > 0;

        int currentRevision = contribution.getLedgerRevision();
        var currentEntry = ledgerService.findLatestApproved(
                LedgerService.SOURCE_CONTRIBUTION,
                contribution.getId(),
                LedgerTransactionType.REGULAR_CONTRIBUTION);

        if (currentEntry.isPresent()) {
            BigDecimal existingCredit = MoneyUtils.scaleForStorage(currentEntry.get().getCreditAmount());
            if (shouldPost && existingCredit.compareTo(MoneyUtils.scaleForStorage(contribution.getPaidAmount())) == 0) {
                return;
            }
            ledgerService.reverseApprovedCredit(
                    LedgerService.SOURCE_CONTRIBUTION,
                    contribution.getId(),
                    LedgerTransactionType.REGULAR_CONTRIBUTION,
                    LedgerService.contributionReversalKey(contribution.getId(), currentRevision),
                    recordedBy,
                    "Reversal due to contribution correction");
        }

        if (!shouldPost) {
            return;
        }

        int revision = currentRevision + 1;
        contribution.setLedgerRevision(revision);
        contributionRepository.save(contribution);

        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(contribution.getCooperativeId())
                .memberUserId(contribution.getMemberUserId())
                .transactionType(LedgerTransactionType.REGULAR_CONTRIBUTION)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(contribution.getPaidAmount())
                .currency(currency)
                .transactionDate(
                        contribution.getPaymentDate() == null ? LocalDate.now() : contribution.getPaymentDate())
                .reference(contribution.getPaymentReference())
                .sourceEntityType(LedgerService.SOURCE_CONTRIBUTION)
                .sourceEntityId(contribution.getId())
                .description("Regular contribution "
                        + contribution.getYear()
                        + "-"
                        + String.format(Locale.ROOT, "%02d", contribution.getMonth()))
                .recordedBy(recordedBy)
                .approvedBy(recordedBy)
                .idempotencyKey(LedgerService.contributionKey(
                        contribution.getId(), LedgerTransactionType.REGULAR_CONTRIBUTION, revision))
                .build());
    }

    public static ContributionStatus deriveStatus(BigDecimal expected, BigDecimal paid) {
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return ContributionStatus.PENDING;
        }
        if (paid.compareTo(expected) < 0) {
            return ContributionStatus.PARTIALLY_PAID;
        }
        return ContributionStatus.PAID;
    }

    private Cooperative requireCooperative(UUID cooperativeId) {
        return cooperativeRepository
                .findByIdAndDeletedFalse(cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooperative", cooperativeId));
    }

    private Map<UUID, String> loadMemberNames(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> names = new HashMap<>();
        for (User user : userRepository.findAllById(userIds)) {
            if (!user.isDeleted()) {
                names.put(user.getId(), user.getFullName());
            }
        }
        return names;
    }

    private ContributionResponse toResponse(Contribution c, String memberName, boolean persisted) {
        return ContributionResponse.builder()
                .id(c.getId())
                .cooperativeId(c.getCooperativeId())
                .memberUserId(c.getMemberUserId())
                .memberName(memberName)
                .year(c.getYear())
                .month(c.getMonth())
                .expectedAmount(MoneyUtils.scale(c.getExpectedAmount()))
                .paidAmount(MoneyUtils.scale(c.getPaidAmount()))
                .outstandingAmount(MoneyUtils.scale(c.getOutstandingAmount()))
                .paymentDate(c.getPaymentDate())
                .status(c.getStatus())
                .paymentReference(c.getPaymentReference())
                .notes(c.getNotes())
                .recordedBy(c.getRecordedBy())
                .persisted(persisted)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private static String toAuditJson(Contribution c) {
        return "{\"id\":\""
                + c.getId()
                + "\",\"paidAmount\":\""
                + c.getPaidAmount()
                + "\",\"status\":\""
                + c.getStatus()
                + "\",\"expectedAmount\":\""
                + c.getExpectedAmount()
                + "\"}";
    }

    private static void validatePeriod(int year, int month) {
        validateYear(year);
        validateMonth(month);
    }

    private static void validateYear(int year) {
        if (year < 2000 || year > 2100) {
            throw new ValidationException("year must be between 2000 and 2100");
        }
    }

    private static void validateMonth(int month) {
        if (month < 1 || month > 12) {
            throw new ValidationException("month must be between 1 and 12");
        }
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
