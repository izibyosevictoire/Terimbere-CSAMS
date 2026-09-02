package rw.terimbere.csams.modules.historicalimport.service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportError;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;

final class ParsedWorkbook {

    private final Map<HistoricalImportSheet, List<ParsedRow>> sheets = new EnumMap<>(HistoricalImportSheet.class);
    private final List<HistoricalImportError> workbookErrors = new ArrayList<>();

    Map<HistoricalImportSheet, List<ParsedRow>> sheets() {
        return sheets;
    }

    List<HistoricalImportError> workbookErrors() {
        return workbookErrors;
    }

    List<ParsedRow> rows(HistoricalImportSheet sheet) {
        return sheets.getOrDefault(sheet, List.of());
    }

    record ParsedRow(HistoricalImportSheet sheet, int rowNumber, Map<String, String> cells) {
        String get(String header) {
            if (cells == null || header == null) {
                return "";
            }
            String direct = cells.get(HistoricalImportSheet.normalizeHeader(header));
            return direct == null ? "" : direct;
        }
    }
}
