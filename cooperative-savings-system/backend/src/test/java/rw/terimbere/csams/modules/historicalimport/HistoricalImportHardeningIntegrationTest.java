package rw.terimbere.csams.modules.historicalimport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import rw.terimbere.csams.modules.cooperative.CooperativeTestFixtures;
import rw.terimbere.csams.modules.fine.entity.Fine;
import rw.terimbere.csams.modules.fine.entity.FineCalculationMode;
import rw.terimbere.csams.modules.fine.entity.FinePayment;
import rw.terimbere.csams.modules.fine.entity.FinePaymentMethod;
import rw.terimbere.csams.modules.fine.entity.FinePaymentStatus;
import rw.terimbere.csams.modules.fine.entity.FineStatus;
import rw.terimbere.csams.modules.fine.entity.FineType;
import rw.terimbere.csams.modules.fine.repository.FinePaymentRepository;
import rw.terimbere.csams.modules.fine.repository.FineRepository;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseApprovalStatus;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseCategory;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseTransaction;
import rw.terimbere.csams.modules.incomeexpense.repository.IncomeExpenseTransactionRepository;
import rw.terimbere.csams.modules.investment.entity.Investment;
import rw.terimbere.csams.modules.investment.entity.InvestmentStatus;
import rw.terimbere.csams.modules.investment.repository.InvestmentRepository;
import rw.terimbere.csams.modules.ledger.entity.LedgerEntry;
import rw.terimbere.csams.modules.ledger.repository.LedgerEntryRepository;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.entity.LoanGuaranteeMode;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;
import rw.terimbere.csams.modules.loanrepayment.repository.LoanRepaymentRepository;
import rw.terimbere.csams.modules.membership.repository.CooperativeMembershipRepository;
import rw.terimbere.csams.modules.payout.entity.PayoutLine;
import rw.terimbere.csams.modules.payout.entity.PayoutLineStatus;
import rw.terimbere.csams.modules.payout.entity.PayoutRun;
import rw.terimbere.csams.modules.payout.entity.PayoutRunStatus;
import rw.terimbere.csams.modules.payout.repository.PayoutLineRepository;
import rw.terimbere.csams.modules.payout.repository.PayoutRunRepository;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HistoricalImportHardeningIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private LoanRepaymentRepository loanRepaymentRepository;

    @Autowired
    private FineRepository fineRepository;

    @Autowired
    private FinePaymentRepository finePaymentRepository;

    @Autowired
    private IncomeExpenseTransactionRepository incomeExpenseRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private PayoutRunRepository payoutRunRepository;

    @Autowired
    private PayoutLineRepository payoutLineRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private CooperativeMembershipRepository membershipRepository;

    private String superAdminToken;
    private UUID cooperativeId;

    @BeforeEach
    void setUp() throws Exception {
        superAdminToken = login("superadmin", "ChangeMe@123!");
        cooperativeId = createCooperative("Hard Coop " + id8());
    }

    @Test
    void blankTemplate_hasNoBusinessRows_andConfirmIsDisabled() throws Exception {
        MvcResult template = mockMvc.perform(get(base() + "/template")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andReturn();
        byte[] bytes = template.getResponse().getContentAsByteArray();
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            for (HistoricalImportSheet sheet : HistoricalImportSheet.values()) {
                assertThat(workbook.getSheet(sheet.getSheetName()).getLastRowNum()).isLessThanOrEqualTo(0);
                assertThat(sheet.getHeaders()).doesNotContain("Ledger Effect");
            }
        }
        mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("blank.xlsx", bytes))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRows").value(0))
                .andExpect(jsonPath("$.data.validRows").value(0))
                .andExpect(jsonPath("$.data.confirmAllowed").value(false));
    }

    @Test
    void preview_detectsOperationalDuplicatesWithoutHistoricalFingerprint() throws Exception {
        JsonNode member = registerMember("opdup_" + id8());
        UUID memberId = UUID.fromString(member.path("userId").asText());
        String username = member.path("username").asText();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                                "/api/v1/cooperatives/" + cooperativeId + "/contributions/period")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .param("year", "2022")
                        .param("month", "3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"lines":[{"memberUserId":"%s","paidAmount":10000,"paymentDate":"2022-03-05"}]}
                                """.formatted(memberId)))
                .andExpect(status().isOk());

        Loan loan = loanRepository.save(Loan.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .requestedAmount(money("100000"))
                .approvedAmount(money("100000"))
                .principalAmount(money("100000"))
                .interestRatePercent(new BigDecimal("10"))
                .interestType(InterestType.FLAT)
                .termMonths(6)
                .interestAmount(money("10000"))
                .outstandingPrincipal(money("0"))
                .outstandingInterest(money("0"))
                .requestDate(LocalDate.of(2022, 5, 1))
                .approvalDate(LocalDate.of(2022, 5, 2))
                .disbursementDate(LocalDate.of(2022, 5, 10))
                .dueDate(LocalDate.of(2022, 11, 10))
                .status(LoanStatus.CLOSED)
                .guaranteeMode(LoanGuaranteeMode.SELF)
                .purpose("Business")
                .requestedBy(memberId)
                .build());
        loanRepaymentRepository.save(LoanRepayment.builder()
                .loanId(loan.getId())
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .paymentDate(LocalDate.of(2022, 8, 10))
                .amountTotal(money("110000"))
                .principalPortion(money("100000"))
                .interestPortion(money("10000"))
                .paymentReference("REP-001")
                .build());

        Fine fine = fineRepository.save(Fine.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .fineType(FineType.MANUAL)
                .calculationMode(FineCalculationMode.FIXED)
                .baseAmount(money("2000"))
                .totalAmount(money("2000"))
                .paidAmount(money("2000"))
                .outstandingAmount(money("0"))
                .reason("Late meeting")
                .issuedDate(LocalDate.of(2022, 7, 1))
                .dueDate(LocalDate.of(2022, 7, 15))
                .status(FineStatus.PAID)
                .issuedBy(memberId)
                .build());
        finePaymentRepository.save(FinePayment.builder()
                .fineId(fine.getId())
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .amount(money("2000"))
                .paymentDate(LocalDate.of(2022, 7, 10))
                .paymentReference("FINE-PAY-001")
                .paymentMethod(FinePaymentMethod.CASH)
                .status(FinePaymentStatus.APPROVED)
                .submittedBy(memberId)
                .reviewedBy(memberId)
                .reviewedAt(Instant.now())
                .build());

        incomeExpenseRepository.save(IncomeExpenseTransaction.builder()
                .cooperativeId(cooperativeId)
                .category(IncomeExpenseCategory.OTHER_INCOME)
                .amount(money("3000"))
                .transactionDate(LocalDate.of(2022, 10, 1))
                .reference("INC-001")
                .description("Donation")
                .approvalStatus(IncomeExpenseApprovalStatus.APPROVED)
                .recordedBy(memberId)
                .approvedBy(memberId)
                .approvedAt(Instant.now())
                .build());
        incomeExpenseRepository.save(IncomeExpenseTransaction.builder()
                .cooperativeId(cooperativeId)
                .category(IncomeExpenseCategory.GENERAL_EXPENSE)
                .amount(money("1500"))
                .transactionDate(LocalDate.of(2022, 10, 15))
                .reference("EXP-001")
                .description("Stationery")
                .approvalStatus(IncomeExpenseApprovalStatus.APPROVED)
                .recordedBy(memberId)
                .approvedBy(memberId)
                .approvedAt(Instant.now())
                .build());

        investmentRepository.save(Investment.builder()
                .cooperativeId(cooperativeId)
                .name("Maize trade")
                .amount(money("50000"))
                .expectedReturnAmount(money("10000"))
                .expectedReturnDate(LocalDate.of(2022, 12, 1))
                .remainingCapital(money("0"))
                .status(InvestmentStatus.COMPLETED)
                .activatedAt(LocalDate.of(2022, 2, 1).atStartOfDay().toInstant(ZoneOffset.UTC))
                .createdBy(memberId)
                .build());

        PayoutRun run = payoutRunRepository.save(PayoutRun.builder()
                .cooperativeId(cooperativeId)
                .name("Year-end")
                .periodFrom(LocalDate.of(2022, 1, 1))
                .periodTo(LocalDate.of(2022, 12, 31))
                .includeRegular(true)
                .includeSpecial(true)
                .availableFundSnapshot(money("10000"))
                .payoutPoolAmount(money("10000"))
                .totalEligibleContributions(money("10000"))
                .status(PayoutRunStatus.PAID)
                .paidAt(LocalDate.of(2023, 1, 15).atStartOfDay().toInstant(ZoneOffset.UTC))
                .createdBy(memberId)
                .build());
        payoutLineRepository.save(PayoutLine.builder()
                .payoutRunId(run.getId())
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .eligibleContributionAmount(money("10000"))
                .percentage(new BigDecimal("100"))
                .payoutAmount(money("10000"))
                .status(PayoutLineStatus.PAID)
                .build());

        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Contributions", List.of(List.of(username, "2022", "3", "10000", "10000", "2022-03-05", "REF", "")));
        sheets.put("Loans", List.of(loanRow(username, "100000", "0", "CLOSED")));
        sheets.put(
                "LoanRepayments",
                List.of(List.of("L-2022-001", username, "2022-08-10", "110000", "100000", "10000", "REP-001", "")));
        sheets.put(
                "Fines",
                List.of(List.of(
                        "F-2022-001", username, "MANUAL", "2000", "2000", "2022-07-01", "2022-07-15", "PAID", "Late meeting")));
        sheets.put(
                "FinePayments",
                List.of(List.of("F-2022-001", username, "2000", "2022-07-10", "FINE-PAY-001", "")));
        sheets.put(
                "Investments",
                List.of(List.of(
                        "INV-2022-01",
                        "Maize trade",
                        "50000",
                        "2022-02-01",
                        "10000",
                        "2022-12-01",
                        "0",
                        "50000",
                        "8000",
                        "COMPLETED",
                        "")));
        sheets.put("Income", List.of(List.of("2022-10-01", "3000", "OTHER_INCOME", "INC-001", "Donation", "")));
        sheets.put("Expenses", List.of(List.of("2022-10-15", "1500", "GENERAL_EXPENSE", "EXP-001", "Stationery", "")));
        sheets.put(
                "Payouts",
                List.of(List.of(
                        "PAY-2022-01", "Year-end", "2022-01-01", "2022-12-31", "2023-01-15", "10000", "10000", "PAID", "")));
        sheets.put("PayoutLines", List.of(List.of("PAY-2022-01", username, "10000", "100", "10000", "PAID")));

        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("ops-dup.xlsx", sheets))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INVALID"))
                .andReturn();
        String body = preview.getResponse().getContentAsString();
        assertThat(body).contains("EXISTING_CONTRIBUTION");
        assertThat(body).contains("EXISTING_RECORD");
        assertThat(body).contains("Possible existing transaction detected");
    }

    @Test
    void parentAlias_mapsExistingLoanWithoutReinserting_andRejectsExistingRepayment() throws Exception {
        JsonNode member = registerMember("alias_" + id8());
        UUID memberId = UUID.fromString(member.path("userId").asText());
        String username = member.path("username").asText();
        loanRepository.save(Loan.builder()
                .cooperativeId(cooperativeId)
                .memberUserId(memberId)
                .requestedAmount(money("100000"))
                .approvedAmount(money("100000"))
                .principalAmount(money("100000"))
                .interestRatePercent(new BigDecimal("10"))
                .interestType(InterestType.FLAT)
                .termMonths(6)
                .interestAmount(money("10000"))
                .outstandingPrincipal(money("0"))
                .outstandingInterest(money("0"))
                .requestDate(LocalDate.of(2022, 5, 1))
                .disbursementDate(LocalDate.of(2022, 5, 10))
                .status(LoanStatus.CLOSED)
                .guaranteeMode(LoanGuaranteeMode.SELF)
                .requestedBy(memberId)
                .build());
        long loansBefore = loanRepository.count();

        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username, "ACTIVE", "MEMBER")));
        sheets.put("Loans", List.of(loanRow(username, "100000", "0", "CLOSED")));
        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("alias.xlsx", sheets))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(preview.getResponse().getContentAsString()).path("data").path("status").asText())
                .isEqualTo("READY");
        assertThat(preview.getResponse().getContentAsString()).contains("matched an existing CSAMS loan");
        UUID importId = UUID.fromString(objectMapper
                .readTree(preview.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());
        mockMvc.perform(post(base() + "/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.loansImported").value(0));
        assertThat(loanRepository.count()).isEqualTo(loansBefore);
    }

    @Test
    void incomeAdjustment_isRejected_andPayoutDateDrivesLedger() throws Exception {
        String username = "paydate_" + id8();
        mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx(
                                "adj.xlsx",
                                Map.of("Income", List.of(List.of("2022-10-01", "3000", "ADJUSTMENT", "ADJ-1", "Open", "")))))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INVALID"))
                .andExpect(jsonPath("$.data.errors[0].code").value("ADJUSTMENT_NOT_ALLOWED"));

        Map<String, List<List<String>>> sheets = validMemberAndContribution(username, "20000");
        sheets.put(
                "Payouts",
                List.of(List.of(
                        "PAY-2022-01",
                        "Year-end",
                        "2022-01-01",
                        "2022-12-31",
                        "2024-01-15",
                        "20000",
                        "20000",
                        "PAID",
                        "")));
        sheets.put("PayoutLines", List.of(List.of("PAY-2022-01", username, "20000", "100", "20000", "PAID")));
        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("payout-date.xlsx", sheets))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andReturn();
        UUID importId = UUID.fromString(objectMapper
                .readTree(preview.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());
        mockMvc.perform(post(base() + "/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());
        List<LedgerEntry> payouts = ledgerEntryRepository.findAll().stream()
                .filter(e -> e.getCooperativeId().equals(cooperativeId)
                        && e.getTransactionType() == LedgerTransactionType.MEMBER_PAYOUT)
                .toList();
        assertThat(payouts).isNotEmpty();
        assertThat(payouts.get(0).getTransactionDate()).isEqualTo(LocalDate.of(2024, 1, 15));
        assertThat(payoutRunRepository.findAll().stream()
                        .filter(r -> r.getCooperativeId().equals(cooperativeId))
                        .findFirst()
                        .orElseThrow()
                        .getPaidAt()
                        .atZone(ZoneOffset.UTC)
                        .toLocalDate())
                .isEqualTo(LocalDate.of(2024, 1, 15));
    }

    @Test
    void investmentReport_usesActivatedDateNotExpectedReturn() throws Exception {
        String username = "invdate_" + id8();
        Map<String, List<List<String>>> sheets = validMemberAndContribution(username, "50000");
        sheets.put(
                "Investments",
                List.of(List.of(
                        "INV-2022-01",
                        "Maize trade 2022",
                        "50000",
                        "2022-03-01",
                        "10000",
                        "2024-03-01",
                        "50000",
                        "0",
                        "0",
                        "ACTIVE",
                        "")));
        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("inv-date.xlsx", sheets))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andReturn();
        UUID importId = UUID.fromString(objectMapper
                .readTree(preview.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());
        mockMvc.perform(post(base() + "/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());

        Investment stored = investmentRepository.findByCooperativeId(cooperativeId, Pageable.unpaged()).getContent()
                .stream()
                .filter(inv -> "Maize trade 2022".equals(inv.getName()))
                .findFirst()
                .orElseThrow();
        assertThat(stored.getActivatedAt().atZone(ZoneOffset.UTC).toLocalDate())
                .isEqualTo(LocalDate.of(2022, 3, 1));
        assertThat(stored.getExpectedReturnDate()).isEqualTo(LocalDate.of(2024, 3, 1));

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/reports/export")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reportType":"INVESTMENTS","fromDate":"2022-01-01","toDate":"2022-12-31"}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/reports/export")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reportType":"INVESTMENTS","fromDate":"2023-01-01","toDate":"2023-12-31"}
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void roleImport_cannotElevateExistingMember_orAssignPresidentAsPresident() throws Exception {
        JsonNode existing = registerMember("roleexist_" + id8());
        String existingUsername = existing.path("username").asText();
        UUID existingUserId = UUID.fromString(existing.path("userId").asText());
        String president = registerAndLogin("PRESIDENT");

        mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx(
                                "elevate.xlsx",
                                Map.of("Members", List.of(memberRow(existingUsername, "ACTIVE", "PRESIDENT")))))
                        .header("Authorization", "Bearer " + president))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INVALID"))
                .andExpect(jsonPath("$.data.errors[0].code").value("ROLE_NOT_ALLOWED"));
        assertThat(membershipRepository
                        .findByCooperativeIdAndUserId(cooperativeId, existingUserId)
                        .orElseThrow()
                        .getRoleInCooperative())
                .isEqualTo("MEMBER");

        mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx(
                                "new-pres.xlsx",
                                Map.of("Members", List.of(memberRow("newpres_" + id8(), "ACTIVE", "PRESIDENT")))))
                        .header("Authorization", "Bearer " + president))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INVALID"))
                .andExpect(jsonPath("$.data.errors[0].code").value("ROLE_NOT_ALLOWED"));
    }

    private String base() {
        return "/api/v1/cooperatives/" + cooperativeId + "/historical-imports";
    }

    private UUID createCooperative(String name) throws Exception {
        MvcResult create = mockMvc.perform(post("/api/v1/cooperatives")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CooperativeTestFixtures.createBody(name)))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(objectMapper
                .readTree(create.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    }

    private JsonNode registerMember(String username) throws Exception {
        MvcResult register = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/members")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName":"Jane",
                                  "lastName":"Uwase",
                                  "username":"%s",
                                  "email":"%s@test.local",
                                  "roleInCooperative":"MEMBER"
                                }
                                """.formatted(username, username)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(register.getResponse().getContentAsString()).path("data");
    }

    private String registerAndLogin(String role) throws Exception {
        String username = role.toLowerCase() + "_" + id8();
        MvcResult register = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/members")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName":"%s",
                                  "lastName":"User",
                                  "username":"%s",
                                  "email":"%s@test.local",
                                  "roleInCooperative":"%s"
                                }
                                """.formatted(role, username, username, role)))
                .andExpect(status().isOk())
                .andReturn();
        String password = objectMapper
                .readTree(register.getResponse().getContentAsString())
                .path("data")
                .path("temporaryPassword")
                .asText();
        return login(username, password);
    }

    private String login(String username, String password) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper
                .readTree(login.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
    }

    private static Map<String, List<List<String>>> validMemberAndContribution(String username, String amount) {
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username, "ACTIVE", "MEMBER")));
        sheets.put("Contributions", List.of(List.of(username, "2022", "3", amount, amount, "2022-03-05", "REF", "")));
        return sheets;
    }

    private static List<String> memberRow(String username, String status, String role) {
        return List.of(
                username,
                "Jane",
                "Uwase",
                username + "@test.local",
                "0781234567",
                "",
                "2022-01-15",
                "1",
                status,
                role);
    }

    private static List<String> loanRow(String username, String principal, String outstanding, String status) {
        return List.of(
                "L-2022-001",
                username,
                principal,
                principal,
                principal,
                "10",
                "FLAT",
                "10000",
                "6",
                outstanding,
                outstanding.equals("0") ? "0" : "10000",
                "2022-05-01",
                "2022-05-02",
                "2022-05-10",
                "2022-11-10",
                status,
                "Business");
    }

    private static MockMultipartFile xlsx(String name, Map<String, List<List<String>>> sheets) throws Exception {
        return xlsx(name, workbookBytes(sheets));
    }

    private static MockMultipartFile xlsx(String name, byte[] bytes) {
        return new MockMultipartFile(
                "file", name, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    private static byte[] workbookBytes(Map<String, List<List<String>>> sheets) throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Instructions").createRow(0).createCell(0).setCellValue("test");
            for (Map.Entry<String, List<List<String>>> entry : sheets.entrySet()) {
                Sheet sheet = workbook.createSheet(entry.getKey());
                HistoricalImportSheet type = HistoricalImportSheet.fromSheetName(entry.getKey()).orElse(null);
                Row header = sheet.createRow(0);
                if (type != null) {
                    for (int i = 0; i < type.getHeaders().size(); i++) {
                        header.createCell(i).setCellValue(type.getHeaders().get(i));
                    }
                }
                int r = 1;
                for (List<String> values : entry.getValue()) {
                    Row row = sheet.createRow(r++);
                    for (int c = 0; c < values.size(); c++) {
                        row.createCell(c).setCellValue(values.get(c));
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static BigDecimal money(String value) {
        return MoneyUtils.scaleForStorage(new BigDecimal(value));
    }

    private static String id8() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
