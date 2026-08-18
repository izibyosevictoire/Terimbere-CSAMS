package rw.terimbere.csams.modules.report.export;

import java.util.List;
import rw.terimbere.csams.modules.report.dto.ReportHeaderMeta;
import rw.terimbere.csams.modules.report.dto.ReportSheetData;

/**
 * Pluggable report binary exporter.
 *
 * <p>Excel is the default implementation ({@link ExcelReportExporter}). A {@code PdfReportExporter}
 * can be added later without redesigning {@code ReportService} — inject the desired exporter (or a
 * registry keyed by format) and keep data assembly in the service layer.
 */
public interface ReportExporter {

    byte[] export(ReportHeaderMeta header, List<ReportSheetData> sheets);

    String contentType();

    String fileExtension();
}
