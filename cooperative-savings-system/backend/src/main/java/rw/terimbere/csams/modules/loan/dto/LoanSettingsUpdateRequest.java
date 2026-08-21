package rw.terimbere.csams.modules.loan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.loan.entity.InterestType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanSettingsUpdateRequest {

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal interestRatePercent;

    @NotNull
    private InterestType interestType;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal maxLoanAmount;

    @Min(1)
    @Max(600)
    private Integer maxTermMonths;

    @Min(0)
    @Max(600)
    private Integer minMembershipMonths;

    private Boolean allowMemberRequests;

    private Boolean lateFeeEnabled;

    private String currency;

    /** When non-null, replaces share-percentage loan levels. President-only. */
    @Valid
    private List<LoanShareTierRequest> shareTiers;
}
