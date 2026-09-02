package rw.terimbere.csams.modules.historicalimport.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportError;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.shared.exceptions.ValidationException;

final class HistoricalWorkbookParser {

    ParsedWorkbook parse(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ValidationException("Excel file is required");
        }
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new ValidationException("Workbook has no sheets");
            }
            ParsedWorkbook parsed = new ParsedWorkbook();
            WorkbookCellReader reader = new WorkbookCellReader();
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String name = sheet.getSheetName();
                if (!HistoricalImportSheet.isKnownSheetName(name)) {
                    parsed.workbookErrors()
                            .add(error(
                                    name,
                                    null,
                                    "sheet",
                                    "UNKNOWN_SHEET",
                                    "Unknown sheet '" + name + "'. Do not rename sheets from the official template."));
                    continue;
                }
                if (HistoricalImportSheet.INSTRUCTIONS_SHEET.equalsIgnoreCase(name.trim())) {
                    continue;
                }
                HistoricalImportSheet type = HistoricalImportSheet.fromSheetName(name).orElseThrow();
                parseBusinessSheet(sheet, type, reader, parsed);
            }
            return parsed;
        } catch (IOException ex) {
            throw new ValidationException("Invalid Excel file: " + ex.getMessage());
        } catch (ValidationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ValidationException("Invalid Excel file: " + ex.getMessage());
        }
    }

    private void parseBusinessSheet(
            Sheet sheet, HistoricalImportSheet type, WorkbookCellReader reader, ParsedWorkbook parsed) {
        Row headerRow = sheet.getRow(sheet.getFirstRowNum());
        if (headerRow == null) {
            parsed.workbookErrors()
                    .add(error(type.getSheetName(), 1, "header", "MISSING_HEADER", "Sheet is missing the header row."));
            return;
        }
        List<String> expected = type.getHeaders();
        List<String> actual = new ArrayList<>();
        for (int c = 0; c < expected.size(); c++) {
            actual.add(reader.stringValue(headerRow.getCell(c)));
        }
        if (!headersMatch(expected, actual)) {
            parsed.workbookErrors()
                    .add(error(
                            type.getSheetName(),
                            1,
                            "header",
                            "BAD_HEADER",
                            "Headers must be exactly: " + String.join(", ", expected)));
            return;
        }
        List<ParsedWorkbook.ParsedRow> rows = new ArrayList<>();
        int last = sheet.getLastRowNum();
        int first = sheet.getFirstRowNum();
        for (int i = first + 1; i <= last; i++) {
            Row row = sheet.getRow(i);
            if (row == null || isBlank(row, expected.size(), reader)) {
                continue;
            }
            Map<String, String> cells = new LinkedHashMap<>();
            for (int c = 0; c < expected.size(); c++) {
                String header = expected.get(c);
                String value = header.toLowerCase(Locale.ROOT).contains("date")
                        ? reader.dateString(row.getCell(c))
                        : reader.stringValue(row.getCell(c));
                cells.put(HistoricalImportSheet.normalizeHeader(header), value);
            }
            rows.add(new ParsedWorkbook.ParsedRow(type, i + 1, cells));
        }
        parsed.sheets().put(type, rows);
    }

    private static boolean headersMatch(List<String> expected, List<String> actual) {
        if (expected.size() != actual.size()) {
            return false;
        }
        for (int i = 0; i < expected.size(); i++) {
            if (!HistoricalImportSheet.normalizeHeader(expected.get(i))
                    .equals(HistoricalImportSheet.normalizeHeader(actual.get(i)))) {
                return false;
            }
        }
        return true;
    }

    private static boolean isBlank(Row row, int columns, WorkbookCellReader reader) {
        for (int c = 0; c < columns; c++) {
            if (StringUtils.hasText(reader.stringValue(row.getCell(c)))) {
                return false;
            }
        }
        return true;
    }

    private static HistoricalImportError error(
            String sheet, Integer row, String field, String code, String message) {
        return HistoricalImportError.builder()
                .sheet(sheet)
                .rowNumber(row)
                .field(field)
                .code(code)
                .message(message)
                .build();
    }
}
