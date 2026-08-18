package rw.terimbere.csams.modules.loan.service;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.audit.service.AuditService;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.loan.dto.LoanSettingsResponse;
import rw.terimbere.csams.modules.loan.dto.LoanSettingsUpdateRequest;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.LoanSettings;
import rw.terimbere.csams.modules.loan.repository.LoanSettingsRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.security.UserPrincipal;
import rw.terimbere.csams.shared.auditing.AuditableAction;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.exceptions.ValidationException;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

@Service
@RequiredArgsConstructor
public class LoanSettingsService {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("10.0000");

    private final LoanSettingsRepository loanSettingsRepository;
    private final CooperativeRepository cooperativeRepository;
    private final CooperativeAuthorizationService authorizationService;
    private final AuditService auditService;

    @Transactional
    public LoanSettingsResponse getOrCreate(UUID cooperativeId) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        LoanSettings settings = loanSettingsRepository
                .findByCooperativeId(cooperativeId)
                .orElseGet(() -> createDefaults(cooperative));
        return toResponse(settings);
    }

    @Transactional
    public LoanSettingsResponse update(
            UUID cooperativeId, LoanSettingsUpdateRequest request, HttpServletRequest httpRequest) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        authorizationService.requireMembership(cooperativeId);

        LoanSettings settings = loanSettingsRepository
                .findByCooperativeId(cooperativeId)
                .orElseGet(() -> createDefaults(cooperative));

        String previous = "{\"interestRatePercent\":\"" + settings.getInterestRatePercent() + "\"}";

        InterestType interestType =
                request.getInterestType() == null ? InterestType.FLAT : request.getInterestType();
        rejectReducingInterest(interestType);

        settings.setInterestRatePercent(MoneyUtils.scaleForStorage(request.getInterestRatePercent()));
        settings.setInterestType(interestType);
        settings.setMaxLoanAmount(
                request.getMaxLoanAmount() == null
                        ? null
                        : MoneyUtils.scaleForStorage(request.getMaxLoanAmount()));
        settings.setMaxTermMonths(request.getMaxTermMonths());
        if (request.getMinMembershipMonths() != null) {
            settings.setMinMembershipMonths(request.getMinMembershipMonths());
        }
        if (request.getAllowMemberRequests() != null) {
            settings.setAllowMemberRequests(request.getAllowMemberRequests());
        }
        if (request.getLateFeeEnabled() != null) {
            settings.setLateFeeEnabled(request.getLateFeeEnabled());
        }
        if (StringUtils.hasText(request.getCurrency())) {
            String currency = request.getCurrency().trim().toUpperCase(Locale.ROOT);
            if (currency.length() != 3) {
                throw new ValidationException("Currency must be a 3-letter ISO code");
            }
            settings.setCurrency(currency);
        } else {
            settings.setCurrency(cooperative.getCurrency());
        }

        settings = loanSettingsRepository.save(settings);

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.SETTINGS_CHANGE,
                "LoanSettings",
                settings.getId(),
                previous,
                "{\"interestRatePercent\":\"" + settings.getInterestRatePercent() + "\"}",
                clientIp(httpRequest),
                userAgent(httpRequest));
        return toResponse(settings);
    }

    @Transactional
    public LoanSettings requireSettings(UUID cooperativeId) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        return loanSettingsRepository
                .findByCooperativeId(cooperativeId)
                .orElseGet(() -> createDefaults(cooperative));
    }

    private LoanSettings createDefaults(Cooperative cooperative) {
        LoanSettings settings = LoanSettings.builder()
                .cooperativeId(cooperative.getId())
                .interestRatePercent(DEFAULT_RATE)
                .interestType(InterestType.FLAT)
                .maxLoanAmount(null)
                .maxTermMonths(12)
                .minMembershipMonths(0)
                .allowMemberRequests(true)
                .lateFeeEnabled(false)
                .currency(cooperative.getCurrency() == null ? "RWF" : cooperative.getCurrency())
                .build();
        return loanSettingsRepository.save(settings);
    }

    /**
     * NEW settings may not use REDUCING until the client confirms the amortization rule.
     * Existing REDUCING loans remain readable; see documentation/development/reducing-interest-pending.md.
     */
    public static void rejectReducingInterest(InterestType interestType) {
        if (interestType == InterestType.REDUCING) {
            throw new ValidationException(
                    "Reducing-balance interest is not available until the business rule is confirmed. "
                            + "Use FLAT interest, or contact the cooperative administrator.");
        }
    }

    private Cooperative requireCooperative(UUID cooperativeId) {
        return cooperativeRepository
                .findByIdAndDeletedFalse(cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooperative", cooperativeId));
    }

    private LoanSettingsResponse toResponse(LoanSettings settings) {
        return LoanSettingsResponse.builder()
                .id(settings.getId())
                .cooperativeId(settings.getCooperativeId())
                .interestRatePercent(MoneyUtils.scale(settings.getInterestRatePercent()))
                .interestType(settings.getInterestType())
                .maxLoanAmount(
                        settings.getMaxLoanAmount() == null ? null : MoneyUtils.scale(settings.getMaxLoanAmount()))
                .maxTermMonths(settings.getMaxTermMonths())
                .minMembershipMonths(settings.getMinMembershipMonths())
                .allowMemberRequests(settings.isAllowMemberRequests())
                .lateFeeEnabled(settings.isLateFeeEnabled())
                .currency(settings.getCurrency())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
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
