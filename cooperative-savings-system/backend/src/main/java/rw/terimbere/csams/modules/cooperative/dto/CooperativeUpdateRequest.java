package rw.terimbere.csams.modules.cooperative.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class CooperativeUpdateRequest {

    @NotBlank
    @Size(max = 255)
    private String name;

    @Size(max = 2000)
    private String description;

    @Size(max = 128)
    private String registrationNumber;

    @Email
    @Size(max = 255)
    private String contactEmail;

    @Size(max = 32)
    private String contactPhone;

    @Size(max = 512)
    private String address;

    @Size(min = 3, max = 3)
    private String currency;

    @Min(1)
    @Max(12)
    private Integer financialYearStartMonth;

    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal monthlyContributionAmount;

    @Min(1)
    @Max(28)
    private Integer contributionDueDay;

    @PastOrPresent(message = "Registration date cannot be in the future")
    private LocalDate registrationDate;

    @AssertTrue(message = "Registration date cannot be before 1950-01-01")
    public boolean isRegistrationDateReasonable() {
        return registrationDate == null || !registrationDate.isBefore(LocalDate.of(1950, 1, 1));
    }
}
