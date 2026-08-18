package rw.terimbere.csams.modules.contribution.entity;

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
@Table(name = "contributions")
public class Contribution extends BaseEntity {

    @Column(name = "cooperative_id", nullable = false)
    private UUID cooperativeId;

    @Column(name = "member_user_id", nullable = false)
    private UUID memberUserId;

    @Column(name = "\"year\"", nullable = false)
    private int year;

    @Column(name = "\"month\"", nullable = false)
    private int month;

    @Column(name = "expected_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal expectedAmount;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "outstanding_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal outstandingAmount;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ContributionStatus status;

    @Column(name = "payment_reference", length = 128)
    private String paymentReference;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "recorded_by")
    private UUID recordedBy;

    @Builder.Default
    @Column(name = "ledger_revision", nullable = false)
    private int ledgerRevision = 0;
}
