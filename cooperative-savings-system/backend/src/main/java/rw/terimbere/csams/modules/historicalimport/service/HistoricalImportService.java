package rw.terimbere.csams.modules.historicalimport.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import rw.terimbere.csams.modules.audit.service.AuditService;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportConfirmResponse;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportError;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportPreviewResponse;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportSheetSummary;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportSummaryResponse;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalReconciliationSummary;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImport;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportRow;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportStatus;
import rw.terimbere.csams.modules.historicalimport.repository.HistoricalImportRepository;
import rw.terimbere.csams.modules.historicalimport.repository.HistoricalImportRowRepository;
import rw.terimbere.csams.modules.report.export.ExcelReportExporter;
import rw.terimbere.csams.modules.report.export.ExcelReportWriter;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.security.CooperativeOfficerRoles;
import rw.terimbere.csams.security.UserPrincipal;
import rw.terimbere.csams.shared.auditing.AuditableAction;
import rw.terimbere.csams.shared.exceptions.BusinessException;
import rw.terimbere.csams.shared.exceptions.ForbiddenException;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.exceptions.ValidationException;
import rw.terimbere.csams.shared.file.FileStorageService;

@Service
@RequiredArgsConstructor
public class HistoricalImportService {

    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    private final CooperativeRepository cooperativeRepository;
    private final HistoricalImportRepository importRepository;
    private final HistoricalImportRowRepository importRowRepository;
    private final HistoricalWorkbookParser parser = new HistoricalWorkbookParser();
    private final HistoricalImportValidator validator;
    private final HistoricalPersistenceService persistenceService;
    private final FileStorageService fileStorageService;
    private final CooperativeAuthorizationService authorizationService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;

    @Transactional(readOnly = true)
    public byte[] downloadTemplate(UUID cooperativeId) {
        requireCooperative(cooperativeId);
        requireLeadership(cooperativeId);
        List<ExcelReportWriter.TemplateSheet> sheets = new ArrayList<>();
        sheets.add(new ExcelReportWriter.TemplateSheet(
                HistoricalImportSheet.INSTRUCTIONS_SHEET, List.of(), List.of(), instructionLines()));
        for (HistoricalImportSheet sheet : HistoricalImportSheet.values()) {
            sheets.add(new ExcelReportWriter.TemplateSheet(
                    sheet.getSheetName(), sheet.getHeaders(), List.of(), null));
        }
        return ExcelReportWriter.writeMultiSheetTemplate(sheets);
    }

    @Transactional
    public HistoricalImportPreviewResponse preview(UUID cooperativeId, MultipartFile file, HttpServletRequest request) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = requireLeadership(cooperativeId);
        byte[] bytes = readXlsx(file);
        String hash = HistoricalFingerprint.sha256Hex(bytes);
        if (importRepository.existsByCooperativeIdAndFileHashAndStatus(
                cooperativeId, hash, HistoricalImportStatus.CONFIRMED)) {
            throw new BusinessException("This workbook has already been confirmed for this Saving Scheme");
        }
        String originalFilename = file.getOriginalFilename() == null ? "historical-import.xlsx" : file.getOriginalFilename();
        String storageKey = "historical-imports/" + cooperativeId + "/" + UUID.randomUUID() + ".xlsx";
        fileStorageService.store(
                storageKey, new ByteArrayInputStream(bytes), bytes.length, ExcelReportExporter.CONTENT_TYPE);

        HistoricalImport importEntity = HistoricalImport.builder()
                .cooperativeId(cooperativeId)
                .originalFilename(originalFilename)
                .storageKey(storageKey)
                .contentType(ExcelReportExporter.CONTENT_TYPE)
                .sizeBytes((long) bytes.length)
                .fileHash(hash)
                .status(HistoricalImportStatus.UPLOADED)
                .uploadedBy(principal.getId())
                .build();
        importEntity = importRepository.save(importEntity);

        ParsedWorkbook parsed;
        try {
            parsed = parser.parse(bytes);
        } catch (ValidationException ex) {
            importEntity.setStatus(HistoricalImportStatus.FAILED);
            importEntity.setErrorSummary(ex.getMessage());
            importRepository.save(importEntity);
            throw ex;
        }

        ValidatedWorkbook validated = validator.validate(cooperative.getId(), parsed, principal);
        persistPreviewRows(importEntity.getId(), validated);
        importEntity.setTotalRows(validated.totalRows());
        importEntity.setValidRows(validated.validRows());
        importEntity.setInvalidRows(validated.invalidRows());
        importEntity.setValidatedAt(Instant.now());
        importEntity.setSheetSummary(toJson(validated.sheetSummaries.values()));
        importEntity.setReconciliationSummary(toJson(validated.reconciliation));
        boolean blocked = validated.hasErrors()
                || (validated.reconciliation != null && validated.reconciliation.isBlocked());
        importEntity.setStatus(blocked ? HistoricalImportStatus.INVALID : HistoricalImportStatus.READY);
        if (blocked) {
            importEntity.setErrorSummary(validated.invalidRows() + " invalid row(s)");
        }
        importRepository.save(importEntity);

        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.IMPORT,
                "HistoricalImport",
                importEntity.getId(),
                null,
                "{\"phase\":\"preview\",\"filename\":\""
                        + escape(originalFilename)
                        + "\",\"hash\":\""
                        + hash
                        + "\",\"valid\":"
                        + validated.validRows()
                        + ",\"invalid\":"
                        + validated.invalidRows()
                        + "}",
                clientIp(request),
                userAgent(request));
        return toPreview(importEntity, validated);
    }

    public HistoricalImportConfirmResponse confirm(UUID cooperativeId, UUID importId, HttpServletRequest request) {
        Cooperative cooperative = requireCooperative(cooperativeId);
        UserPrincipal principal = requireLeadership(cooperativeId);
        TransactionTemplate business = new TransactionTemplate(transactionManager);
        try {
            return business.execute(status -> doConfirm(cooperative, importId, principal, request));
        } catch (RuntimeException ex) {
            TransactionTemplate markFailed = new TransactionTemplate(transactionManager);
            markFailed.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            markFailed.executeWithoutResult(s -> importRepository
                    .findByIdAndCooperativeId(importId, cooperativeId)
                    .ifPresent(entity -> {
                        if (entity.getStatus() != HistoricalImportStatus.CONFIRMED) {
                            entity.setStatus(HistoricalImportStatus.FAILED);
                            entity.setErrorSummary(ex.getMessage());
                            importRepository.save(entity);
                        }
                    }));
            throw ex;
        }
    }

    private HistoricalImportConfirmResponse doConfirm(
            Cooperative cooperative, UUID importId, UserPrincipal principal, HttpServletRequest request) {
        HistoricalImport importEntity = importRepository
                .findByIdAndCooperativeId(importId, cooperative.getId())
                .orElseThrow(() -> new ResourceNotFoundException("HistoricalImport", importId));
        if (importEntity.getStatus() == HistoricalImportStatus.CONFIRMED) {
            throw new BusinessException("This historical import has already been confirmed");
        }
        if (importEntity.getStatus() != HistoricalImportStatus.READY) {
            throw new BusinessException("Import cannot be confirmed in status " + importEntity.getStatus());
        }
        if (importRepository.existsByCooperativeIdAndFileHashAndStatus(
                cooperative.getId(), importEntity.getFileHash(), HistoricalImportStatus.CONFIRMED)) {
            throw new BusinessException("This workbook has already been confirmed for this Saving Scheme");
        }

        byte[] bytes = readStored(importEntity.getStorageKey());
        ParsedWorkbook parsed = parser.parse(bytes);
        ValidatedWorkbook validated = validator.validate(cooperative.getId(), parsed, principal);
        if (!validated.reportReady
                || validated.hasErrors()
                || (validated.reconciliation != null && validated.reconciliation.isBlocked())) {
            throw new ValidationException("Workbook is no longer valid. Fix the errors and upload again.");
        }
        if (validated.validRows() <= 0) {
            throw new ValidationException("Workbook has no importable business rows");
        }

        HistoricalPersistenceService.PersistResult persisted =
                persistenceService.persist(cooperative, validated, principal.getId());
        List<HistoricalImportRow> rows = importRowRepository.findByImportIdOrderBySheetAscRowNumberAsc(importId);
        for (HistoricalImportRow row : rows) {
            UUID entityId = persisted.resultingEntityIds().get(row.getSheet() + ":" + row.getRowNumber());
            if (entityId != null) {
                row.setResultingEntityId(entityId);
                row.setResultingEntityType(row.getSheet());
            }
        }
        importRowRepository.saveAll(rows);

        importEntity.setStatus(HistoricalImportStatus.CONFIRMED);
        importEntity.setConfirmedBy(principal.getId());
        importEntity.setConfirmedAt(Instant.now());
        importEntity.setReconciliationSummary(toJson(validated.reconciliation));
        importRepository.save(importEntity);

        HistoricalImportConfirmResponse response = persisted.counts();
        response.setImportId(importEntity.getId());
        response.setStatus(HistoricalImportStatus.CONFIRMED);
        response.setReconciliation(validated.reconciliation);

        auditService.record(
                principal.getId(),
                cooperative.getId(),
                AuditableAction.IMPORT,
                "HistoricalImport",
                importEntity.getId(),
                null,
                toJson(confirmAuditPayload(importEntity, response)),
                clientIp(request),
                userAgent(request));
        return response;
    }

    @Transactional
    public HistoricalImportSummaryResponse cancel(UUID cooperativeId, UUID importId, HttpServletRequest request) {
        UserPrincipal principal = requireLeadership(cooperativeId);
        HistoricalImport importEntity = importRepository
                .findByIdAndCooperativeId(importId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("HistoricalImport", importId));
        if (importEntity.getStatus() == HistoricalImportStatus.CONFIRMED) {
            throw new BusinessException("Confirmed imports cannot be cancelled");
        }
        if (importEntity.getStatus() == HistoricalImportStatus.CANCELLED) {
            return toSummary(importEntity);
        }
        importEntity.setStatus(HistoricalImportStatus.CANCELLED);
        importEntity.setCancelledBy(principal.getId());
        importEntity.setCancelledAt(Instant.now());
        importRepository.save(importEntity);
        auditService.record(
                principal.getId(),
                cooperativeId,
                AuditableAction.IMPORT,
                "HistoricalImport",
                importEntity.getId(),
                null,
                "{\"phase\":\"cancel\"}",
                clientIp(request),
                userAgent(request));
        return toSummary(importEntity);
    }

    @Transactional(readOnly = true)
    public HistoricalImportPreviewResponse get(UUID cooperativeId, UUID importId) {
        requireLeadership(cooperativeId);
        HistoricalImport importEntity = importRepository
                .findByIdAndCooperativeId(importId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("HistoricalImport", importId));
        List<HistoricalImportRow> rows = importRowRepository.findByImportIdOrderBySheetAscRowNumberAsc(importId);
        List<HistoricalImportError> errors = new ArrayList<>();
        for (HistoricalImportRow row : rows) {
            if (!row.isValid() && StringUtils.hasText(row.getErrorMessages())) {
                errors.add(HistoricalImportError.builder()
                        .sheet(row.getSheet())
                        .rowNumber(row.getRowNumber())
                        .message(row.getErrorMessages())
                        .build());
            }
        }
        HistoricalReconciliationSummary reconciliation =
                readJson(importEntity.getReconciliationSummary(), HistoricalReconciliationSummary.class);
        boolean ready = confirmAllowed(importEntity);
        return HistoricalImportPreviewResponse.builder()
                .importId(importEntity.getId())
                .status(importEntity.getStatus())
                .originalFilename(importEntity.getOriginalFilename())
                .fileHash(importEntity.getFileHash())
                .totalRows(importEntity.getTotalRows())
                .validRows(importEntity.getValidRows())
                .invalidRows(importEntity.getInvalidRows())
                .confirmAllowed(ready)
                .reportReady(ready)
                .sheets(readJsonList(importEntity.getSheetSummary(), HistoricalImportSheetSummary.class))
                .errors(errors)
                .yearSummaries(reconciliation == null || reconciliation.getYearSummaries() == null
                        ? List.of()
                        : reconciliation.getYearSummaries())
                .reconciliation(reconciliation)
                .errorSummary(importEntity.getErrorSummary())
                .build();
    }

    @Transactional(readOnly = true)
    public List<HistoricalImportSummaryResponse> history(UUID cooperativeId) {
        requireLeadership(cooperativeId);
        return importRepository.findByCooperativeIdOrderByCreatedAtDesc(cooperativeId).stream()
                .map(this::toSummary)
                .toList();
    }

    private void persistPreviewRows(UUID importId, ValidatedWorkbook validated) {
        importRowRepository.deleteByImportId(importId);
        List<HistoricalImportRow> rows = new ArrayList<>();
        for (ValidatedWorkbook.ValidatedRow<?> row : validated.allRows()) {
            rows.add(HistoricalImportRow.builder()
                    .importId(importId)
                    .sheet(row.sheet().getSheetName())
                    .rowNumber(row.rowNumber())
                    .sourceKey(row.sourceKey() == null ? null : HistoricalFingerprint.normalize(row.sourceKey()))
                    .fingerprint(row.fingerprint())
                    .valid(row.valid())
                    .errorMessages(row.errors() == null || row.errors().isEmpty()
                            ? null
                            : String.join("; ", row.errors().stream().map(HistoricalImportError::getMessage).toList()))
                    .build());
        }
        importRowRepository.saveAll(rows);
    }

    private HistoricalImportPreviewResponse toPreview(HistoricalImport entity, ValidatedWorkbook validated) {
        return HistoricalImportPreviewResponse.builder()
                .importId(entity.getId())
                .status(entity.getStatus())
                .originalFilename(entity.getOriginalFilename())
                .fileHash(entity.getFileHash())
                .totalRows(validated.totalRows())
                .validRows(validated.validRows())
                .invalidRows(validated.invalidRows())
                .confirmAllowed(confirmAllowed(entity) && validated.reportReady)
                .reportReady(validated.reportReady)
                .sheets(new ArrayList<>(validated.sheetSummaries.values()))
                .errors(validated.errors)
                .yearSummaries(validated.yearSummaries)
                .reconciliation(validated.reconciliation)
                .errorSummary(entity.getErrorSummary())
                .build();
    }

    private HistoricalImportSummaryResponse toSummary(HistoricalImport entity) {
        return HistoricalImportSummaryResponse.builder()
                .id(entity.getId())
                .cooperativeId(entity.getCooperativeId())
                .originalFilename(entity.getOriginalFilename())
                .fileHash(entity.getFileHash())
                .status(entity.getStatus())
                .totalRows(entity.getTotalRows())
                .validRows(entity.getValidRows())
                .invalidRows(entity.getInvalidRows())
                .uploadedBy(entity.getUploadedBy())
                .createdAt(entity.getCreatedAt())
                .confirmedAt(entity.getConfirmedAt())
                .cancelledAt(entity.getCancelledAt())
                .errorSummary(entity.getErrorSummary())
                .build();
    }

    private byte[] readXlsx(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Excel file is required");
        }
        String name = file.getOriginalFilename() == null ? "import.xlsx" : file.getOriginalFilename();
        if (!name.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ValidationException("Only .xlsx files are supported");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new ValidationException("Excel file must be 10MB or smaller");
        }
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new ValidationException("Unable to read uploaded file");
        }
    }

    private byte[] readStored(String storageKey) {
        try {
            return Files.readAllBytes(fileStorageService.load(storageKey));
        } catch (IOException ex) {
            throw new ValidationException("Unable to read stored workbook");
        }
    }

    private Cooperative requireCooperative(UUID cooperativeId) {
        return cooperativeRepository
                .findByIdAndDeletedFalse(cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooperative", cooperativeId));
    }

    private UserPrincipal requireLeadership(UUID cooperativeId) {
        authorizationService.requireMembership(cooperativeId);
        UserPrincipal principal = authorizationService.currentPrincipal();
        if (principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)
                || CooperativeOfficerRoles.isLeadership(principal)) {
            return principal;
        }
        throw new ForbiddenException("Only cooperative leadership can import historical data");
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private <T> List<T> readJsonList(String json, Class<T> type) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    json, objectMapper.getTypeFactory().constructCollectionType(List.class, type));
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private static Map<String, Object> confirmAuditPayload(
            HistoricalImport importEntity, HistoricalImportConfirmResponse response) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("phase", "confirm");
        payload.put("filename", importEntity.getOriginalFilename());
        payload.put("members", response.getMembersImported());
        payload.put("contributions", response.getContributionsImported());
        payload.put("loans", response.getLoansImported());
        payload.put("repayments", response.getRepaymentsImported());
        payload.put("fines", response.getFinesImported());
        payload.put("finePayments", response.getFinePaymentsImported());
        payload.put("investments", response.getInvestmentsImported());
        payload.put("income", response.getIncomeImported());
        payload.put("expenses", response.getExpensesImported());
        payload.put(
                "social",
                response.getSocialContributionsImported() + response.getSocialDisbursementsImported());
        payload.put("payouts", response.getPayoutsImported());
        payload.put("ledgerEntries", response.getLedgerEntriesCreated());
        payload.put("status", "CONFIRMED");
        return payload;
    }

    private <T> T readJson(String json, Class<T> type) {
        if (!StringUtils.hasText(json)) {
            return null;
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    private static List<String> instructionLines() {
        return List.of(
                "Historical Data Import — Instructions",
                "",
                "Historical imports reconstruct reports for previous years. Dates must be the actual historical business dates. Do not use today's date unless the transaction actually happened today.",
                "",
                "1. The Saving Scheme is the one selected in CSAMS. Do not put cooperative UUIDs in this file.",
                "2. Do not rename sheets. Do not change header row text.",
                "3. Use Username to reference members on every financial sheet.",
                "4. Use business codes (Loan Code, Fine Code, Campaign Code, Investment Code, Payout Code) to connect child rows.",
                "5. Do not use database UUIDs.",
                "6. Dates must be the original historical dates (YYYY-MM-DD, dd/MM/yyyy, or Excel date cells).",
                "7. Amounts must be numeric. Do not recompute old contribution amounts from today's settings.",
                "8. Empty business sheets are ignored. Unknown sheet names are rejected.",
                "9. Existing CSAMS financial records are never overwritten. Duplicates fail validation.",
                "10. Every row must be valid before Confirm Import is allowed. If a row cannot be reported correctly, it cannot be imported.",
                "11. Historical members who already left may be INACTIVE or SUSPENDED.",
                "12. New member accounts receive an unknown password. They must use Forgot password before signing in.",
                "13. Allowed loan statuses: ACTIVE, OVERDUE, CLOSED, WRITTEN_OFF.",
                "14. Historical fines must be MANUAL. FinePayments are required when Paid Amount > 0.",
                "15. Paid historical payouts must include the actual Payout Date (the day money was distributed), not only Period To.",
                "16. Business sheets contain headers only. Examples below are documentation — they are not imported.",
                "17. Income Category is OTHER_INCOME. Expense Category is GENERAL_EXPENSE or INTEREST_EXPENSE. Ledger type is derived by CSAMS; do not request ADJUSTMENT.",
                "18. To attach child rows to a loan/fine/investment/payout/campaign that already exists in CSAMS, include a parent row whose natural fields match that record. The parent will not be reinserted.",
                "",
                "Required Dates for Historical Reporting",
                "Members: Membership Date is required. Do not default it to today.",
                "Contributions: Payment Date is required when Paid Amount > 0 because contribution reports filter by Payment Date. Unpaid rows (Paid Amount = 0) may leave Payment Date blank. Year and Month remain required. Late payment in a later month is allowed.",
                "Special Contributions: Contribution Date is required.",
                "Social Contributions: Contribution Date is required.",
                "Social Disbursements: Disbursement Date is required.",
                "Loans: Request Date, Approval Date, Disbursement Date, and Due Date are required for disbursed historical loans. Chronology: Request Date <= Approval Date <= Disbursement Date <= Due Date.",
                "Loan Repayments: Payment Date, Amount Total, Principal Portion, and Interest Portion are required. Principal + Interest must equal Total.",
                "Fines: Issued Date is required because the Fines report filters by Issued Date.",
                "Fine Payments: Payment Date is required because the payment report and ledger use it.",
                "Investments: Investment Date is required for money-out investments. The system cannot use today's date.",
                "Investment Returns: Return Date is required. Capital Portion + Profit Portion must equal Amount Total.",
                "Income / Expenses: Transaction Date is required. Never use import date as the business date.",
                "Payouts: Period From, Period To, and Payout Date (when PAID) are required. Period From <= Period To. Do not substitute Period To for Payout Date.",
                "",
                "Examples (do not copy these onto business sheets unless they are real history):",
                "Members: hist_jane | Jane | Uwase | jane.uwase@example.com | 0781234567 | | 2022-01-15 | 1 | ACTIVE | MEMBER",
                "Contributions: hist_jane | 2022 | 3 | 10000 | 10000 | 2022-03-05 | REF-2022-03",
                "Loans: L-2022-001 | hist_jane | principal 100000 | requested 2022-05-01 | disbursed 2022-05-10 | CLOSED",
                "Payouts: PAY-2022-01 | 2022-01-01 | 2022-12-31 | Payout Date 2023-01-15 | PAID");
    }

    private static boolean confirmAllowed(HistoricalImport entity) {
        return entity.getStatus() == HistoricalImportStatus.READY
                && entity.getValidRows() > 0
                && entity.getInvalidRows() == 0;
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "'");
    }

    private static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static String userAgent(HttpServletRequest request) {
        return request == null ? null : request.getHeader("User-Agent");
    }
}
