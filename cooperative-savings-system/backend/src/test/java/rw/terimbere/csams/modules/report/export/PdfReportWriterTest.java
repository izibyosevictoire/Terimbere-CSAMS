package rw.terimbere.csams.modules.report.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import rw.terimbere.csams.modules.report.dto.ReportHeaderMeta;
import rw.terimbere.csams.modules.report.dto.ReportSheetData;

class PdfReportWriterTest {

    @Test
    void writesPdfDocument() {
        byte[] pdf = PdfReportWriter.write(
                ReportHeaderMeta.builder()
                        .cooperativeName("Demo Coop")
                        .reportTitle("Contributions")
                        .selectedPeriod("2026-01-01 to 2026-08-20")
                        .generatedAt(Instant.parse("2026-08-20T10:00:00Z"))
                        .generatedBy("admin")
                        .currency("RWF")
                        .build(),
                List.of(ReportSheetData.builder()
                        .sheetName("Contributions")
                        .headers(List.of("Member", "Amount"))
                        .rows(List.of(List.of("Jane", new BigDecimal("100.0000"))))
                        .totalsRow(List.of("TOTAL", new BigDecimal("100.0000")))
                        .build()));

        assertThat(pdf.length).isGreaterThan(200);
        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }
}
