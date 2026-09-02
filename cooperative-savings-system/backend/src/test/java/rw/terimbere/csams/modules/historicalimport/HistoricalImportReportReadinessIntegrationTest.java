package rw.terimbere.csams.modules.historicalimport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
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
import rw.terimbere.csams.modules.contribution.entity.Contribution;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;
import rw.terimbere.csams.modules.cooperative.CooperativeTestFixtures;
import rw.terimbere.csams.modules.fine.entity.Fine;
import rw.terimbere.csams.modules.fine.entity.FinePayment;
import rw.terimbere.csams.modules.fine.repository.FinePaymentRepository;
import rw.terimbere.csams.modules.fine.repository.FineRepository;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseCategory;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseTransaction;
import rw.terimbere.csams.modules.incomeexpense.repository.IncomeExpenseTransactionRepository;
import rw.terimbere.csams.modules.investment.entity.Investment;
import rw.terimbere.csams.modules.investment.entity.InvestmentReturn;
import rw.terimbere.csams.modules.investment.repository.InvestmentRepository;
import rw.terimbere.csams.modules.investment.repository.InvestmentReturnRepository;
import rw.terimbere.csams.modules.ledger.entity.LedgerEntry;
import rw.terimbere.csams.modules.ledger.repository.LedgerEntryRepository;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;
import rw.terimbere.csams.modules.loanrepayment.repository.LoanRepaymentRepository;
import rw.terimbere.csams.modules.payout.entity.PayoutRun;
import rw.terimbere.csams.modules.payout.repository.PayoutRunRepository;
import rw.terimbere.csams.modules.report.service.ReportTimelineValidator;
import rw.terimbere.csams.modules.socialfund.entity.SocialContribution;
import rw.terimbere.csams.modules.socialfund.entity.SocialDisbursement;
import rw.terimbere.csams.modules.socialfund.repository.SocialContributionRepository;
import rw.terimbere.csams.modules.socialfund.repository.SocialDisbursementRepository;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContribution;
import rw.terimbere.csams.modules.specialcontribution.repository.SpecialContributionRepository;
import rw.terimbere.csams.shared.financial.FinancialCalculationService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HistoricalImportReportReadinessIntegrationTest {

    private static final LocalDate FROM_2023 = LocalDate.of(2023, 1, 1);
    private static final LocalDate TO_2023 = LocalDate.of(2023, 12, 31);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ContributionRepository contributionRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private LoanRepaymentRepository loanRepaymentRepository;

    @Autowired
    private FineRepository fineRepository;

    @Autowired
    private FinePaymentRepository finePaymentRepository;

    @Autowired
    private SpecialContributionRepository specialContributionRepository;

    @Autowired
    private SocialContributionRepository socialContributionRepository;

    @Autowired
    private SocialDisbursementRepository socialDisbursementRepository;

    @Autowired
    private InvestmentRepository investmentRepository;

    @Autowired
    private InvestmentReturnRepository investmentReturnRepository;

    @Autowired
    private IncomeExpenseTransactionRepository incomeExpenseRepository;

    @Autowired
    private PayoutRunRepository payoutRunRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private FinancialCalculationService financialCalculationService;

    private String superAdminToken;
    private UUID cooperativeId;

    @BeforeEach
    void setUp() throws Exception {
        superAdminToken = login("superadmin", "ChangeMe@123!");
        cooperativeId = createCooperative("Report Ready " + id8());
    }

    @Test
    void import2022To2024_then2023ReportsContainOnly2023Activity() throws Exception {
        String username = "hist_years_" + id8();
        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("years.xlsx", multiYearWorkbook(username)))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andExpect(jsonPath("$.data.confirmAllowed").value(true))
                .andExpect(jsonPath("$.data.reportReady").value(true))
                .andReturn();
        JsonNode data = objectMapper.readTree(preview.getResponse().getContentAsString()).path("data");
        assertThat(data.path("yearSummaries").isArray()).isTrue();
        assertThat(yearCount(data, 2023, "contributions")).isEqualTo(2);
        assertThat(yearCount(data, 2023, "loans")).isEqualTo(1);
        assertThat(yearCount(data, 2023, "repayments")).isEqualTo(1);
        assertThat(yearCount(data, 2023, "payouts")).isEqualTo(1);

        UUID importId = UUID.fromString(data.path("importId").asText());
        mockMvc.perform(get(base() + "/" + importId).header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reportReady").value(true))
                .andExpect(jsonPath("$.data.yearSummaries").isArray());

        mockMvc.perform(post(base() + "/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());

        List<Contribution> contributions2023 = contributionRepository
                .search(cooperativeId, null, null, null, null, FROM_2023, TO_2023, Pageable.unpaged())
                .getContent();
        assertThat(contributions2023)
                .extracting(Contribution::getPaymentDate)
                .containsExactlyInAnyOrder(LocalDate.of(2023, 1, 5), LocalDate.of(2023, 6, 10));
        assertThat(contributions2023).noneMatch(c -> c.getYear() == 2024);
        assertThat(contributionRepository
                        .search(cooperativeId, null, 2023, 1, null, null, null, Pageable.unpaged())
                        .getContent())
                .hasSize(1)
                .first()
                .satisfies(c -> assertThat(c.getPaidAmount()).isEqualByComparingTo("0"));

        List<Loan> loans2023 = loanRepository.findByCooperativeId(cooperativeId, Pageable.unpaged()).getContent()
                .stream()
                .filter(loan -> inRange(loan.getRequestDate(), FROM_2023, TO_2023))
                .toList();
        assertThat(loans2023).extracting(Loan::getRequestDate).containsExactly(LocalDate.of(2023, 3, 1));

        List<LoanRepayment> repayments2023 =
                loanRepaymentRepository.findFiltered(cooperativeId, null, FROM_2023, TO_2023);
        assertThat(repayments2023)
                .extracting(LoanRepayment::getPaymentDate)
                .containsExactly(LocalDate.of(2023, 9, 1));

        List<Fine> fines2023 = fineRepository.findByCooperativeId(cooperativeId, Pageable.unpaged()).getContent()
                .stream()
                .filter(fine -> inRange(fine.getIssuedDate(), FROM_2023, TO_2023))
                .toList();
        assertThat(fines2023).extracting(Fine::getIssuedDate).containsExactly(LocalDate.of(2023, 8, 1));

        List<FinePayment> finePayments2023 =
                finePaymentRepository.findFiltered(cooperativeId, null, null, FROM_2023, TO_2023);
        assertThat(finePayments2023)
                .extracting(FinePayment::getPaymentDate)
                .containsExactly(LocalDate.of(2023, 8, 10));

        List<SpecialContribution> specials2023 = specialContributionRepository.findFiltered(
                cooperativeId, null, null, FROM_2023, TO_2023);
        assertThat(specials2023)
                .extracting(SpecialContribution::getContributionDate)
                .containsExactly(LocalDate.of(2023, 7, 15));

        List<SocialContribution> socialIn2023 = socialContributionRepository
                .findByCooperativeId(cooperativeId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(row -> inRange(row.getContributionDate(), FROM_2023, TO_2023))
                .toList();
        assertThat(socialIn2023)
                .extracting(SocialContribution::getContributionDate)
                .containsExactly(LocalDate.of(2023, 4, 10));

        List<SocialDisbursement> socialOut2023 = socialDisbursementRepository
                .findByCooperativeId(cooperativeId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(row -> inRange(row.getDisbursementDate(), FROM_2023, TO_2023))
                .toList();
        assertThat(socialOut2023)
                .extracting(SocialDisbursement::getDisbursementDate)
                .containsExactly(LocalDate.of(2023, 9, 1));

        List<Investment> investments2023 = investmentRepository
                .findByCooperativeId(cooperativeId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(inv -> inRange(activatedDate(inv), FROM_2023, TO_2023))
                .toList();
        assertThat(investments2023).hasSize(1);
        assertThat(activatedDate(investments2023.get(0))).isEqualTo(LocalDate.of(2023, 2, 1));

        List<InvestmentReturn> returns2023 = investmentReturnRepository
                .findByInvestmentIdAndCooperativeIdOrderByReturnDateDescCreatedAtDesc(
                        investments2023.get(0).getId(), cooperativeId);
        assertThat(returns2023).extracting(InvestmentReturn::getReturnDate).containsExactly(LocalDate.of(2023, 11, 1));

        List<IncomeExpenseTransaction> income2023 = incomeExpenseRepository
                .findFiltered(cooperativeId, null, null, FROM_2023, TO_2023, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(tx -> tx.getCategory() == IncomeExpenseCategory.OTHER_INCOME)
                .toList();
        assertThat(income2023)
                .extracting(IncomeExpenseTransaction::getTransactionDate)
                .containsExactly(LocalDate.of(2023, 10, 1));

        List<IncomeExpenseTransaction> expenses2023 = incomeExpenseRepository
                .findFiltered(cooperativeId, null, null, FROM_2023, TO_2023, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(tx -> tx.getCategory() == IncomeExpenseCategory.GENERAL_EXPENSE)
                .toList();
        assertThat(expenses2023)
                .extracting(IncomeExpenseTransaction::getTransactionDate)
                .containsExactly(LocalDate.of(2023, 10, 15));

        List<PayoutRun> payouts2023 = payoutRunRepository
                .findByCooperativeId(cooperativeId, Pageable.unpaged())
                .getContent()
                .stream()
                .filter(run -> overlaps(run.getPeriodFrom(), run.getPeriodTo(), FROM_2023, TO_2023))
                .toList();
        assertThat(payouts2023).hasSize(1);
        assertThat(payouts2023.get(0).getPeriodFrom()).isEqualTo(LocalDate.of(2023, 1, 1));
        assertThat(payouts2023.get(0).getPaidAt()).isNotNull();

        List<LedgerEntry> ledger2023 = ledgerEntryRepository
                .findFiltered(cooperativeId, null, FROM_2023, TO_2023, null, null, Pageable.unpaged())
                .getContent();
        assertThat(ledger2023).isNotEmpty();
        assertThat(ledger2023)
                .extracting(LedgerEntry::getTransactionDate)
                .allMatch(date -> !date.isBefore(FROM_2023) && !date.isAfter(TO_2023));
        assertThat(ledger2023)
                .extracting(LedgerEntry::getTransactionDate)
                .doesNotContain(LocalDate.of(2022, 3, 10), LocalDate.of(2024, 2, 10));

        for (String reportType : List.of(
                "CONTRIBUTIONS",
                "LOANS",
                "REPAYMENTS",
                "FINES",
                "FINE_PAYMENTS",
                "SOCIAL_FUND",
                "INVESTMENTS",
                "INCOME",
                "EXPENSES",
                "PAYOUTS",
                "FINANCIAL_LEDGER",
                "FULL_FINANCIAL")) {
            mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/reports/export")
                            .header("Authorization", "Bearer " + superAdminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"reportType":"%s","fromDate":"2023-01-01","toDate":"2023-12-31"}
                                    """.formatted(reportType)))
                    .andExpect(status().isOk());
        }

        BigDecimal available = financialCalculationService.calculateAvailableGroupFund(cooperativeId);
        BigDecimal paid2023 = contributions2023.stream()
                .map(Contribution::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(available).isGreaterThan(paid2023);
    }

    @Test
    void unpaidContributionMayOmitPaymentDate_butPaidContributionCannot() throws Exception {
        String username = "hist_unpaid_" + id8();
        Map<String, List<List<String>>> unpaid = new LinkedHashMap<>();
        unpaid.put("Members", List.of(memberRow(username)));
        unpaid.put(
                "Contributions",
                List.of(List.of(username, "2023", "1", "10000", "0", "", "UNPAID-2023-01", "")));
        mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("unpaid.xlsx", unpaid))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andExpect(jsonPath("$.data.reportReady").value(true));
    }

    @Test
    void missingReportDates_blockPreviewAndLeaveOperationalTablesEmpty() throws Exception {
        assertInvalid("Payment Date is required for a paid historical contribution", paidContributionMissingDate());
        assertInvalid("Request Date is required because the Loans report", loanMissingRequestDate());
        assertInvalid("Disbursement Date is required because the loan disbursement ledger", loanMissingDisbursementDate());
        assertInvalid("Payment Date is required because loan repayment reports", repaymentMissingDate());
        assertInvalid("Issued Date is required because the Fines report", fineMissingIssuedDate());
        assertInvalid("Payment Date is required because fine payment reports", finePaymentMissingDate());
        assertInvalid("Investment Date is required for historical investments", investmentMissingDate());
        assertInvalid("Return Date is required because investment return ledger", investmentReturnMissingDate());
        assertInvalid("Transaction Date is required because income and expense reports", incomeMissingDate());
        assertInvalid("Transaction Date is required because income and expense reports", expenseMissingDate());
        assertInvalid("Payout Date is required for PAID payouts", paidPayoutMissingDate());

        assertThat(contributionRepository
                        .search(cooperativeId, null, null, null, null, null, null, Pageable.unpaged())
                        .getContent())
                .isEmpty();
        assertThat(loanRepository.findByCooperativeId(cooperativeId, Pageable.unpaged()).getContent()).isEmpty();
        assertThat(ledgerEntryRepository
                        .findFiltered(cooperativeId, null, null, null, null, null, Pageable.unpaged())
                        .getContent())
                .isEmpty();
    }

    private void assertInvalid(String messageFragment, Map<String, List<List<String>>> sheets) throws Exception {
        MvcResult preview = mockMvc.perform(multipart(base() + "/preview")
                        .file(xlsx("invalid-" + id8() + ".xlsx", sheets))
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INVALID"))
                .andExpect(jsonPath("$.data.confirmAllowed").value(false))
                .andExpect(jsonPath("$.data.reportReady").value(false))
                .andReturn();
        String body = preview.getResponse().getContentAsString();
        assertThat(body).contains(messageFragment);
        UUID importId = UUID.fromString(objectMapper.readTree(body).path("data").path("importId").asText());
        mockMvc.perform(post(base() + "/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().is4xxClientError());
    }

    private Map<String, List<List<String>>> paidContributionMissingDate() {
        String username = "miss_pay_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put("Contributions", List.of(List.of(username, "2023", "4", "10000", "10000", "", "REF", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> loanMissingRequestDate() {
        String username = "miss_req_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Loans",
                List.of(loanRow(
                        "L-MISS-REQ", username, "15000", "15000", "1500", "", "2023-03-02", "2023-03-10", "2023-09-10",
                        "ACTIVE")));
        return sheets;
    }

    private Map<String, List<List<String>>> loanMissingDisbursementDate() {
        String username = "miss_disb_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Loans",
                List.of(loanRow(
                        "L-MISS-DISB",
                        username,
                        "15000",
                        "15000",
                        "1500",
                        "2023-03-01",
                        "2023-03-02",
                        "",
                        "2023-09-10",
                        "ACTIVE")));
        return sheets;
    }

    private Map<String, List<List<String>>> repaymentMissingDate() {
        String username = "miss_rep_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Loans",
                List.of(loanRow(
                        "L-MISS-REP", username, "15000", "15000", "1500", "2023-03-01", "2023-03-02", "2023-03-10",
                        "2023-09-10", "ACTIVE")));
        sheets.put(
                "LoanRepayments",
                List.of(List.of("L-MISS-REP", username, "", "5000", "4000", "1000", "REP", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> fineMissingIssuedDate() {
        String username = "miss_fine_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Fines",
                List.of(List.of("F-MISS-ISS", username, "MANUAL", "2000", "0", "", "2023-08-15", "UNPAID", "Late")));
        return sheets;
    }

    private Map<String, List<List<String>>> finePaymentMissingDate() {
        String username = "miss_fp_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Fines",
                List.of(List.of("F-MISS-PAY", username, "MANUAL", "2000", "2000", "2023-08-01", "2023-08-15", "PAID", "Late")));
        sheets.put("FinePayments", List.of(List.of("F-MISS-PAY", username, "2000", "", "FP", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> investmentMissingDate() {
        String username = "miss_inv_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put("Contributions", List.of(List.of(username, "2023", "6", "30000", "30000", "2023-06-10", "REF", "")));
        sheets.put(
                "Investments",
                List.of(List.of(
                        "INV-MISS", "Trade", "10000", "", "1000", "2023-12-01", "10000", "0", "0", "ACTIVE", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> investmentReturnMissingDate() {
        String username = "miss_ret_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put("Contributions", List.of(List.of(username, "2023", "6", "30000", "30000", "2023-06-10", "REF", "")));
        sheets.put(
                "Investments",
                List.of(List.of(
                        "INV-RET", "Trade", "10000", "2023-02-01", "1000", "2023-12-01", "10000", "0", "0", "ACTIVE", "")));
        sheets.put(
                "InvestmentReturns",
                List.of(List.of("INV-RET", "", "5000", "1000", "6000", "RET", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> incomeMissingDate() {
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Income", List.of(List.of("", "4000", "OTHER_INCOME", "INC", "Donation", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> expenseMissingDate() {
        String username = "miss_exp_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put("Contributions", List.of(List.of(username, "2023", "6", "30000", "30000", "2023-06-10", "REF", "")));
        sheets.put("Expenses", List.of(List.of("", "2000", "GENERAL_EXPENSE", "EXP", "Stationery", "")));
        return sheets;
    }

    private Map<String, List<List<String>>> paidPayoutMissingDate() {
        String username = "miss_payo_" + id8();
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put("Contributions", List.of(List.of(username, "2023", "6", "20000", "20000", "2023-06-10", "REF", "")));
        sheets.put(
                "Payouts",
                List.of(List.of(
                        "PAY-MISS", "Share-out", "2023-01-01", "2023-12-31", "", "20000", "20000", "PAID", "")));
        sheets.put("PayoutLines", List.of(List.of("PAY-MISS", username, "20000", "100", "20000", "PAID")));
        return sheets;
    }

    private Map<String, List<List<String>>> multiYearWorkbook(String username) {
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put("Members", List.of(memberRow(username)));
        sheets.put(
                "Contributions",
                List.of(
                        List.of(username, "2022", "3", "100000", "100000", "2022-03-10", "C-2022-03", ""),
                        List.of(username, "2022", "12", "10000", "10000", "2023-01-05", "C-2022-12-LATE", ""),
                        List.of(username, "2023", "1", "10000", "0", "", "C-2023-01-UNPAID", ""),
                        List.of(username, "2023", "6", "100000", "100000", "2023-06-10", "C-2023-06", ""),
                        List.of(username, "2024", "2", "100000", "100000", "2024-02-10", "C-2024-02", "")));
        sheets.put(
                "SpecialCampaigns",
                List.of(List.of(
                        "CAMP-2023", "School", "Fees", "5000", "5000", "2023-06-01", "2023-08-31", "CLOSED")));
        sheets.put(
                "SpecialContributions",
                List.of(List.of(username, "CAMP-2023", "5000", "2023-07-15", "SPEC-2023", "")));
        sheets.put(
                "SocialContributions",
                List.of(
                        List.of(username, "3000", "2022-04-10", "SOC-2022", ""),
                        List.of(username, "4000", "2023-04-10", "SOC-2023", ""),
                        List.of(username, "2000", "2024-04-10", "SOC-2024", "")));
        sheets.put(
                "SocialDisbursements",
                List.of(List.of(username, "2500", "2023-09-01", "Funeral support", "")));
        sheets.put(
                "Loans",
                List.of(
                        loanRow(
                                "L-2022-001",
                                username,
                                "20000",
                                "0",
                                "0",
                                "2022-05-01",
                                "2022-05-02",
                                "2022-05-10",
                                "2022-11-10",
                                "CLOSED"),
                        loanRow(
                                "L-2023-001",
                                username,
                                "30000",
                                "0",
                                "0",
                                "2023-03-01",
                                "2023-03-02",
                                "2023-03-10",
                                "2023-09-10",
                                "CLOSED"),
                        loanRow(
                                "L-2024-001",
                                username,
                                "15000",
                                "15000",
                                "1500",
                                "2024-01-05",
                                "2024-01-06",
                                "2024-01-15",
                                "2024-07-15",
                                "ACTIVE")));
        sheets.put(
                "LoanRepayments",
                List.of(
                        List.of("L-2022-001", username, "2022-11-01", "22000", "20000", "2000", "REP-2022", ""),
                        List.of("L-2023-001", username, "2023-09-01", "33000", "30000", "3000", "REP-2023", "")));
        sheets.put(
                "Fines",
                List.of(
                        List.of("F-2022-001", username, "MANUAL", "2000", "2000", "2022-07-01", "2022-07-15", "PAID", "Late"),
                        List.of("F-2023-001", username, "MANUAL", "3000", "3000", "2023-08-01", "2023-08-15", "PAID", "Late"),
                        List.of(
                                "F-2024-001",
                                username,
                                "MANUAL",
                                "1000",
                                "0",
                                "2024-03-01",
                                "2024-03-15",
                                "UNPAID",
                                "Late")));
        sheets.put(
                "FinePayments",
                List.of(
                        List.of("F-2022-001", username, "2000", "2022-07-10", "FP-2022", ""),
                        List.of("F-2023-001", username, "3000", "2023-08-10", "FP-2023", "")));
        sheets.put(
                "Investments",
                List.of(List.of(
                        "INV-2023-01",
                        "Maize trade",
                        "20000",
                        "2023-02-01",
                        "3000",
                        "2023-11-01",
                        "0",
                        "20000",
                        "3000",
                        "COMPLETED",
                        "")));
        sheets.put(
                "InvestmentReturns",
                List.of(List.of("INV-2023-01", "2023-11-01", "20000", "3000", "23000", "INV-RET-2023", "")));
        sheets.put(
                "Income",
                List.of(
                        List.of("2022-10-01", "3000", "OTHER_INCOME", "INC-2022", "Donation", ""),
                        List.of("2023-10-01", "4000", "OTHER_INCOME", "INC-2023", "Donation", ""),
                        List.of("2024-10-01", "5000", "OTHER_INCOME", "INC-2024", "Donation", "")));
        sheets.put(
                "Expenses",
                List.of(
                        List.of("2022-10-15", "1500", "GENERAL_EXPENSE", "EXP-2022", "Stationery", ""),
                        List.of("2023-10-15", "2000", "GENERAL_EXPENSE", "EXP-2023", "Stationery", ""),
                        List.of("2024-10-15", "1000", "GENERAL_EXPENSE", "EXP-2024", "Stationery", "")));
        sheets.put(
                "Payouts",
                List.of(
                        List.of(
                                "PAY-2022-01",
                                "2022 share-out",
                                "2022-01-01",
                                "2022-12-31",
                                "2022-12-20",
                                "5000",
                                "5000",
                                "PAID",
                                ""),
                        List.of(
                                "PAY-2023-01",
                                "2023 share-out",
                                "2023-01-01",
                                "2023-12-31",
                                "2023-12-20",
                                "10000",
                                "10000",
                                "PAID",
                                ""),
                        List.of(
                                "PAY-2024-01",
                                "2024 share-out",
                                "2024-01-01",
                                "2024-12-31",
                                "2024-12-20",
                                "5000",
                                "5000",
                                "PAID",
                                "")));
        sheets.put(
                "PayoutLines",
                List.of(
                        List.of("PAY-2022-01", username, "5000", "100", "5000", "PAID"),
                        List.of("PAY-2023-01", username, "10000", "100", "10000", "PAID"),
                        List.of("PAY-2024-01", username, "5000", "100", "5000", "PAID")));
        return sheets;
    }

    private static List<String> memberRow(String username) {
        return List.of(
                username,
                "Jane",
                "Uwase",
                username + "@test.local",
                "0781234567",
                "",
                "2021-06-01",
                "1",
                "ACTIVE",
                "MEMBER");
    }

    private static List<String> loanRow(
            String code,
            String username,
            String principal,
            String outstandingPrincipal,
            String outstandingInterest,
            String request,
            String approval,
            String disbursement,
            String due,
            String status) {
        BigDecimal principalAmount = new BigDecimal(principal);
        String interest = principalAmount.multiply(new BigDecimal("0.10")).stripTrailingZeros().toPlainString();
        return List.of(
                code,
                username,
                principal,
                principal,
                principal,
                "10",
                "FLAT",
                interest,
                "6",
                outstandingPrincipal,
                outstandingInterest,
                request,
                approval,
                disbursement,
                due,
                status,
                "Business");
    }

    private static int yearCount(JsonNode data, int year, String field) {
        for (JsonNode summary : data.path("yearSummaries")) {
            if (summary.path("year").asInt() == year) {
                return summary.path(field).asInt();
            }
        }
        return 0;
    }

    private static LocalDate activatedDate(Investment investment) {
        if (investment.getActivatedAt() == null) {
            return null;
        }
        return investment.getActivatedAt().atZone(ReportTimelineValidator.ZONE).toLocalDate();
    }

    private static boolean inRange(LocalDate value, LocalDate from, LocalDate to) {
        return value != null && !value.isBefore(from) && !value.isAfter(to);
    }

    private static boolean overlaps(LocalDate periodFrom, LocalDate periodTo, LocalDate from, LocalDate to) {
        return !periodTo.isBefore(from) && !periodFrom.isAfter(to);
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

    private static String id8() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private static MockMultipartFile xlsx(String name, Map<String, List<List<String>>> sheets) throws Exception {
        return new MockMultipartFile(
                "file",
                name,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbookBytes(sheets));
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
}
