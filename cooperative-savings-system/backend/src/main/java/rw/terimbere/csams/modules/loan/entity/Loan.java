package rw.terimbere.csams.modules.loan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rw.terimbere.csams.shared.common.entity.BaseEntity;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "loans")
public class Loan extends BaseEntity {

    @Column(name = "cooperative_id", nullable = false)
    private UUID cooperativeId;

    @Column(name = "member_user_id", nullable = false)
    private UUID memberUserId;

    @Column(name = "requested_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal requestedAmount;

    @Column(name = "approved_amount", precision = 19, scale = 4)
    private BigDecimal approvedAmount;

    @Column(name = "principal_amount", precision = 19, scale = 4)
    private BigDecimal principalAmount;

    /** Snapshot of settings rate at loan creation — never mutated when settings change. */
    @Column(name = "interest_rate_percent", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRatePercent;

    @Enumerated(EnumType.STRING)
    @Column(name = "interest_type", nullable = false, length = 32)
    private InterestType interestType;

    @Column(name = "term_months", nullable = false)
    private int termMonths;

    @Column(name = "interest_amount", precision = 19, scale = 4)
    private BigDecimal interestAmount;

    @Builder.Default
    @Column(name = "outstanding_principal", nullable = false, precision = 19, scale = 4)
    private BigDecimal outstandingPrincipal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "outstanding_interest", nullable = false, precision = 19, scale = 4)
    private BigDecimal outstandingInterest = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_repaid_principal", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalRepaidPrincipal = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_repaid_interest", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalRepaidInterest = BigDecimal.ZERO;

    @Column(name = "request_date", nullable = false)
    private LocalDate requestDate;

    @Column(name = "approval_date")
    private LocalDate approvalDate;

    @Column(name = "disbursement_date")
    private LocalDate disbursementDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private LoanStatus status;

    @Column(name = "purpose", length = 2000)
    private String purpose;

    @Column(name = "rejection_reason", length = 2000)
    private String rejectionReason;

    @Column(name = "requested_by")
    private UUID requestedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "disbursed_by")
    private UUID disbursedBy;
}
