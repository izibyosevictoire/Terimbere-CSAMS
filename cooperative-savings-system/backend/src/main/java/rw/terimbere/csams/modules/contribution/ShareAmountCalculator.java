package rw.terimbere.csams.modules.contribution;

import java.math.BigDecimal;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

public final class ShareAmountCalculator {

    public static final int DEFAULT_SHARE_COUNT = 1;
    public static final int MAX_SHARE_COUNT = 1000;

    private ShareAmountCalculator() {}

    public static int normalizeShareCount(Integer shareCount) {
        if (shareCount == null || shareCount < DEFAULT_SHARE_COUNT) {
            return DEFAULT_SHARE_COUNT;
        }
        return Math.min(shareCount, MAX_SHARE_COUNT);
    }

    public static BigDecimal expectedMonthly(BigDecimal unitAmount, Integer shareCount) {
        BigDecimal unit = unitAmount == null ? BigDecimal.ZERO : unitAmount;
        return MoneyUtils.scaleForStorage(
                unit.multiply(BigDecimal.valueOf(normalizeShareCount(shareCount))));
    }
}
