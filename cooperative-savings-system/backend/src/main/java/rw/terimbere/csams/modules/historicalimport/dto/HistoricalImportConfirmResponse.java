package rw.terimbere.csams.modules.historicalimport.dto;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalImportConfirmResponse {

    private UUID importId;
    private HistoricalImportStatus status;
    private int membersImported;
    private int contributionsImported;
    private int specialCampaignsImported;
    private int specialContributionsImported;
    private int socialContributionsImported;
    private int socialDisbursementsImported;
    private int loansImported;
    private int repaymentsImported;
    private int finesImported;
    private int finePaymentsImported;
    private int investmentsImported;
    private int investmentReturnsImported;
    private int incomeImported;
    private int expensesImported;
    private int payoutsImported;
    private int payoutLinesImported;
    private int ledgerEntriesCreated;
    private HistoricalReconciliationSummary reconciliation;
}
