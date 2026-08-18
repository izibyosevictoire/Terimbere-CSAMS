package rw.terimbere.csams.modules.contribution.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PastOrPresent;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionUpdateRequest {

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal paidAmount;

    private BigDecimal expectedAmount;

    @PastOrPresent(message = "Payment date cannot be in the future")
    private LocalDate paymentDate;

    private String paymentReference;

    private String notes;

    private ContributionStatus status;
}
