package rw.terimbere.csams.modules.loan.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class LoanApproveRequest {

    @DecimalMin(value = "0.01", inclusive = true)
    private BigDecimal approvedAmount;

    @Min(1)
    @Max(600)
    private Integer termMonths;

    @FutureOrPresent(message = "Loan due date cannot be in the past")
    private LocalDate dueDate;
}
