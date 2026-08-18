package rw.terimbere.csams.modules.loan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import rw.terimbere.csams.shared.common.entity.BaseEntity;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "loan_settings")
public class LoanSettings extends BaseEntity {

    @Column(name = "cooperative_id", nullable = false, unique = true)
    private UUID cooperativeId;

    @Column(name = "interest_rate_percent", nullable = false, precision = 8, scale = 4)
    private BigDecimal interestRatePercent;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "interest_type", nullable = false, length = 32)
    private InterestType interestType = InterestType.FLAT;

    @Column(name = "max_loan_amount", precision = 19, scale = 4)
    private BigDecimal maxLoanAmount;

    @Column(name = "max_term_months")
    private Integer maxTermMonths;

    @Builder.Default
    @Column(name = "min_membership_months", nullable = false)
    private int minMembershipMonths = 0;

    @Builder.Default
    @Column(name = "allow_member_requests", nullable = false)
    private boolean allowMemberRequests = true;

    @Builder.Default
    @Column(name = "late_fee_enabled", nullable = false)
    private boolean lateFeeEnabled = false;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "RWF";
}
