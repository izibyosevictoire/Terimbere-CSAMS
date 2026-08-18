package rw.terimbere.csams.modules.loan.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.loan.entity.InterestType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanSettingsResponse {

    private UUID id;
    private UUID cooperativeId;
    private BigDecimal interestRatePercent;
    private InterestType interestType;
    private BigDecimal maxLoanAmount;
    private Integer maxTermMonths;
    private int minMembershipMonths;
    private boolean allowMemberRequests;
    private boolean lateFeeEnabled;
    private String currency;
    private Instant createdAt;
    private Instant updatedAt;
}
