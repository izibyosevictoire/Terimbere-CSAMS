package rw.terimbere.csams.modules.report.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.terimbere.csams.modules.report.dto.ReportExportRequest;
import rw.terimbere.csams.modules.report.dto.ReportTypeResponse;
import rw.terimbere.csams.modules.report.service.ReportService;
import rw.terimbere.csams.modules.report.service.ReportService.ReportBinaryExport;
import rw.terimbere.csams.shared.common.dto.ApiResponse;

@RestController
@RequestMapping("/api/v1/cooperatives/{cooperativeId}/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Report centre Excel exports")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/types")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "List available report types")
    public ResponseEntity<ApiResponse<List<ReportTypeResponse>>> types(@PathVariable UUID cooperativeId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.listTypes(cooperativeId)));
    }

    @PostMapping("/export")
    @PreAuthorize("hasAuthority('REPORT_READ')")
    @Operation(summary = "Export a report as Excel (XLSX binary download)")
    public ResponseEntity<byte[]> export(
            @PathVariable UUID cooperativeId,
            @Valid @RequestBody ReportExportRequest request,
            HttpServletRequest httpRequest) {
        ReportBinaryExport export = reportService.export(cooperativeId, request, httpRequest);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(export.filename())
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(export.contentType()))
                .body(export.content());
    }
}
