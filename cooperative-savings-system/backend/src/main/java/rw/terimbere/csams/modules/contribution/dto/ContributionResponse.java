package rw.terimbere.csams.modules.contribution.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionResponse {

    private UUID id;
    private UUID cooperativeId;
    private UUID memberUserId;
    private String memberName;
    private int year;
    private int month;
    private BigDecimal expectedAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;
    private LocalDate paymentDate;
    private ContributionStatus status;
    private String paymentReference;
    private String notes;
    private UUID recordedBy;
    private boolean persisted;
    private Instant createdAt;
    private Instant updatedAt;
}
