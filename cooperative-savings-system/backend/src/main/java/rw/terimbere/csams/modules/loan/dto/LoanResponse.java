package rw.terimbere.csams.modules.loan.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoanResponse {

    private UUID id;
    private UUID cooperativeId;
    private UUID memberUserId;
    private String memberName;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private BigDecimal principalAmount;
    private BigDecimal interestRatePercent;
    private InterestType interestType;
    private int termMonths;
    private BigDecimal interestAmount;
    private BigDecimal outstandingPrincipal;
    private BigDecimal outstandingInterest;
    private BigDecimal totalRepaidPrincipal;
    private BigDecimal totalRepaidInterest;
    private LocalDate requestDate;
    private LocalDate approvalDate;
    private LocalDate disbursementDate;
    private LocalDate dueDate;
    private LoanStatus status;
    private String purpose;
    private String rejectionReason;
    private UUID requestedBy;
    private UUID approvedBy;
    private UUID disbursedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
