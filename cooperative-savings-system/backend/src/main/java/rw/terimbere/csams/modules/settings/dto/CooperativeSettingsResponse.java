package rw.terimbere.csams.modules.settings.dto;

import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CooperativeSettingsResponse {

    private UUID id;
    private UUID cooperativeId;
    private String timezone;
    private String locale;
    private boolean notifyContributions;
    private boolean notifyLoans;
    private boolean notifyFines;
    private boolean notifyPayouts;
    private Instant createdAt;
    private Instant updatedAt;
    private Long version;
}
