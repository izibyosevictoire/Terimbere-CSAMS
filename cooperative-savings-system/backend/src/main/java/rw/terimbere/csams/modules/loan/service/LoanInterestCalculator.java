package rw.terimbere.csams.modules.loan.service;

import java.math.BigDecimal;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

/**
 * Interest helpers. FLAT is fully supported.
 *
 * <p>REDUCING historically used the same simple percentage as FLAT. New REDUCING settings/loans are
 * blocked until the client amortization rule is confirmed; this method still reads existing REDUCING
 * loans without changing their stored formula. See {@code documentation/development/reducing-interest-pending.md}.
 */
public final class LoanInterestCalculator {

    private LoanInterestCalculator() {}

    /**
     * FLAT: interest = principal × rate/100 (one-time flat charge).
     * REDUCING (legacy existing loans only): same simple percentage — do not invent a new formula here.
     */
    public static BigDecimal computeInterest(BigDecimal principal, BigDecimal ratePercent, InterestType type) {
        BigDecimal p = MoneyUtils.scaleForStorage(principal == null ? BigDecimal.ZERO : principal);
        BigDecimal rate = ratePercent == null ? BigDecimal.ZERO : ratePercent;
        if (type == InterestType.REDUCING) {
            // Legacy path for already-created REDUCING loans — formula unchanged on purpose.
            return MoneyUtils.scaleForStorage(MoneyUtils.percentage(p, rate));
        }
        // FLAT (default)
        return MoneyUtils.scaleForStorage(MoneyUtils.percentage(p, rate));
    }
}
