package rw.terimbere.csams.modules.settings.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
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
@Table(name = "cooperative_settings")
public class CooperativeSettings extends BaseEntity {

    @Column(name = "cooperative_id", nullable = false, unique = true)
    private UUID cooperativeId;

    @Builder.Default
    @Column(name = "timezone", nullable = false, length = 64)
    private String timezone = "Africa/Kigali";

    @Builder.Default
    @Column(name = "locale", nullable = false, length = 16)
    private String locale = "en";

    @Builder.Default
    @Column(name = "notify_contributions", nullable = false)
    private boolean notifyContributions = true;

    @Builder.Default
    @Column(name = "notify_loans", nullable = false)
    private boolean notifyLoans = true;

    @Builder.Default
    @Column(name = "notify_fines", nullable = false)
    private boolean notifyFines = true;

    @Builder.Default
    @Column(name = "notify_payouts", nullable = false)
    private boolean notifyPayouts = true;
}
