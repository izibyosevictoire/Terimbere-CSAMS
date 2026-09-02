package rw.terimbere.csams.modules.historicalimport;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.report.export.ExcelReportWriter;

class HistoricalImportTemplateTest {

    @Test
    void generatedTemplateContainsInstructionsAndExpectedHeaders() throws Exception {
        List<ExcelReportWriter.TemplateSheet> sheets = new ArrayList<>();
        sheets.add(new ExcelReportWriter.TemplateSheet(
                HistoricalImportSheet.INSTRUCTIONS_SHEET, List.of(), List.of(), List.of("Do not rename sheets.")));
        for (HistoricalImportSheet sheet : HistoricalImportSheet.values()) {
            sheets.add(new ExcelReportWriter.TemplateSheet(
                    sheet.getSheetName(), sheet.getHeaders(), List.of(), null));
        }
        byte[] bytes = ExcelReportWriter.writeMultiSheetTemplate(sheets);
        assertThat(bytes[0]).isEqualTo((byte) 0x50);
        assertThat(bytes[1]).isEqualTo((byte) 0x4B);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertThat(workbook.getSheet(HistoricalImportSheet.INSTRUCTIONS_SHEET)).isNotNull();
            for (HistoricalImportSheet type : HistoricalImportSheet.values()) {
                Sheet sheet = workbook.getSheet(type.getSheetName());
                assertThat(sheet).as(type.getSheetName()).isNotNull();
                Row header = sheet.getRow(0);
                for (int i = 0; i < type.getHeaders().size(); i++) {
                    assertThat(header.getCell(i).getStringCellValue()).isEqualTo(type.getHeaders().get(i));
                }
                assertThat(sheet.getLastRowNum()).isLessThanOrEqualTo(0);
            }
        }
    }
}
