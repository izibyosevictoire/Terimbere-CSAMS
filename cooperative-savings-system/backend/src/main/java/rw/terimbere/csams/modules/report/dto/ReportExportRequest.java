package rw.terimbere.csams.modules.report.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportExportRequest {

    @NotNull
    private ReportType reportType;

    private LocalDate fromDate;

    private LocalDate toDate;

    private UUID memberUserId;

    private String status;

    private LedgerTransactionType transactionType;

    private Integer year;

    private Integer month;

    @AssertTrue(message = "toDate must be on or after fromDate")
    public boolean isDateRangeValid() {
        if (fromDate == null || toDate == null) {
            return true;
        }
        return !toDate.isBefore(fromDate);
    }
}
