package rw.terimbere.csams.modules.contribution.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionSubmitRequest {

    @NotNull
    @DecimalMin(value = "0.01", inclusive = true)
    private BigDecimal amount;

    @NotNull
    @PastOrPresent(message = "Payment date cannot be in the future")
    private LocalDate paymentDate;

    @Size(max = 128)
    private String paymentReference;

    @Size(max = 512)
    private String evidenceFileKey;

    @Size(max = 2000)
    private String notes;
}
