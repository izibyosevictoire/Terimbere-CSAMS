package rw.terimbere.csams.modules.audit.dto;

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
public class AuditLogResponse {

    private UUID id;
    private UUID userId;
    private UUID cooperativeId;
    private String action;
    private String entityType;
    private UUID entityId;
    private String previousValues;
    private String newValues;
    private String ipAddress;
    private String userAgent;
    private Instant createdAt;
}
