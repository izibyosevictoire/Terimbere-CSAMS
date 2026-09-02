package rw.terimbere.csams.modules.historicalimport.dto;

import java.util.List;
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
public class HistoricalImportPreviewResponse {

    private UUID importId;
    private HistoricalImportStatus status;
    private String originalFilename;
    private String fileHash;
    private int totalRows;
    private int validRows;
    private int invalidRows;
    private boolean confirmAllowed;
    private List<HistoricalImportSheetSummary> sheets;
    private List<HistoricalImportError> errors;
    private HistoricalReconciliationSummary reconciliation;
    private String errorSummary;
}
