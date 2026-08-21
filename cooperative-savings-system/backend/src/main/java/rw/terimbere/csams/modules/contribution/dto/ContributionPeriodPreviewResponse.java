package rw.terimbere.csams.modules.contribution.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.contribution.entity.ContributionReviewStatus;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionPeriodPreviewResponse {

    private UUID contributionId;
    private UUID cooperativeId;
    private UUID memberUserId;
    private int year;
    private int month;
    private int shareCount;
    private BigDecimal requiredAmount;
    private BigDecimal paidAmount;
    private BigDecimal pendingSubmittedAmount;
    private BigDecimal remainingAmount;
    private LocalDate paymentDate;
    private LocalDate dueDate;
    private ContributionStatus status;
    private ContributionReviewStatus reviewStatus;
    private boolean awaitingReview;
    private boolean canSubmit;
}
