package rw.terimbere.csams.modules.loan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loan.service.LoanService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoanControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private LoanService loanService;

    private String superAdminToken;
    private UUID cooperativeId;
    private UUID memberUserId;
    private String memberUsername;
    private String memberPassword;

    @BeforeEach
    void setUp() throws Exception {
        superAdminToken = loginAccessToken("superadmin", "ChangeMe@123!");

        String name = "Loan Coop " + UUID.randomUUID().toString().substring(0, 8);
        MvcResult create = mockMvc.perform(post("/api/v1/cooperatives")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","currency":"RWF","monthlyContributionAmount":5000.0000}
                                """.formatted(name)))
                .andExpect(status().isOk())
                .andReturn();
        cooperativeId = UUID.fromString(objectMapper
                .readTree(create.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

        memberUsername = "lmember_" + UUID.randomUUID().toString().substring(0, 8);
        MvcResult register = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/members")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName":"Loan",
                                  "lastName":"Member",
                                  "username":"%s",
                                  "email":"%s@test.local",
                                  "roleInCooperative":"MEMBER"
                                }
                                """.formatted(memberUsername, memberUsername)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode memberData =
                objectMapper.readTree(register.getResponse().getContentAsString()).path("data");
        memberUserId = UUID.fromString(memberData.path("userId").asText());
        memberPassword = memberData.path("temporaryPassword").asText();

        mockMvc.perform(put("/api/v1/cooperatives/" + cooperativeId + "/loan-settings")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "interestRatePercent": 10.0000,
                                  "interestType": "FLAT",
                                  "maxLoanAmount": 100000.0000,
                                  "maxTermMonths": 12,
                                  "minMembershipMonths": 0,
                                  "allowMemberRequests": true,
                                  "lateFeeEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestRatePercent").value(10.0));
    }

    @Test
    void requestApproveDisbursePartialAndFullRepayCloses() throws Exception {
        fundGroup(10000.0000);

        UUID loanId = requestAndApprove(2000.0000, 6);

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.interestAmount").value(200.0))
                .andExpect(jsonPath("$.data.interestRatePercent").value(10.0));

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/disburse")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.principalAmount").value(2000.0))
                .andExpect(jsonPath("$.data.outstandingPrincipal").value(2000.0))
                .andExpect(jsonPath("$.data.outstandingInterest").value(200.0));

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/dashboard/summary")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableGroupFunds").value(8000.0))
                .andExpect(jsonPath("$.data.outstandingLoanPrincipal").value(2000.0))
                .andExpect(jsonPath("$.data.totalLoanPrincipal").value(2000.0));

        // Partial: 300 — interest first → 200 interest + 100 principal
        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/repayments")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 300.0000,
                                  "paymentDate": "2026-08-01",
                                  "paymentReference": "RP-1",
                                  "allocateInterestFirst": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestPortion").value(200.0))
                .andExpect(jsonPath("$.data.principalPortion").value(100.0));

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.outstandingPrincipal").value(1900.0))
                .andExpect(jsonPath("$.data.outstandingInterest").value(0.0));

        // Full remaining principal
        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/repayments")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 1900.0000,
                                  "paymentDate": "2026-08-02",
                                  "paymentReference": "RP-2"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.outstandingPrincipal").value(0.0))
                .andExpect(jsonPath("$.data.outstandingInterest").value(0.0));

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/dashboard/summary")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                // Phase 8: availableInterest (loan interest earned) is included in available group fund
                .andExpect(jsonPath("$.data.availableGroupFunds").value(10200.0))
                .andExpect(jsonPath("$.data.outstandingLoanPrincipal").value(0.0))
                .andExpect(jsonPath("$.data.loanInterestEarned").value(200.0))
                .andExpect(jsonPath("$.data.availableInterest").value(200.0));
    }

    @Test
    void repaymentCannotExceedOutstanding() throws Exception {
        fundGroup(5000.0000);
        UUID loanId = requestApproveDisburse(1000.0000);

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/repayments")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": 2000.0000,
                                  "paymentDate": "2026-08-01"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void disburseBlockedWhenFundInsufficient() throws Exception {
        fundGroup(500.0000);
        UUID loanId = requestAndApprove(1000.0000, 6);

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/disburse")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void interestSnapshotPreservedWhenSettingsChange() throws Exception {
        fundGroup(5000.0000);

        MvcResult requestResult = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "memberUserId": "%s",
                                  "amount": 1000.0000,
                                  "termMonths": 6,
                                  "purpose": "Snapshot test"
                                }
                                """.formatted(memberUserId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestRatePercent").value(10.0))
                .andReturn();
        UUID loanId = UUID.fromString(objectMapper
                .readTree(requestResult.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

        mockMvc.perform(put("/api/v1/cooperatives/" + cooperativeId + "/loan-settings")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "interestRatePercent": 25.0000,
                                  "interestType": "FLAT",
                                  "maxTermMonths": 12,
                                  "allowMemberRequests": true
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/approve")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.interestRatePercent").value(10.0))
                .andExpect(jsonPath("$.data.interestAmount").value(100.0));
    }

    @Test
    void coopIsolation_memberCannotAccessOtherCoopLoans() throws Exception {
        String otherName = "Other Coop " + UUID.randomUUID().toString().substring(0, 8);
        MvcResult other = mockMvc.perform(post("/api/v1/cooperatives")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","currency":"RWF","monthlyContributionAmount":1000.0000}
                                """.formatted(otherName)))
                .andExpect(status().isOk())
                .andReturn();
        UUID otherCoopId = UUID.fromString(objectMapper
                .readTree(other.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

        String memberToken = loginAccessToken(memberUsername, memberPassword);
        mockMvc.perform(get("/api/v1/cooperatives/" + otherCoopId + "/loans")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void overdueTransitionOnRefresh() throws Exception {
        fundGroup(5000.0000);
        UUID loanId = requestApproveDisburse(1000.0000);

        Loan loan = loanRepository.findById(loanId).orElseThrow();
        loan.setDueDate(LocalDate.now().minusDays(1));
        loanRepository.save(loan);

        loanService.refreshOverdueStatuses(cooperativeId);

        Loan refreshed = loanRepository.findById(loanId).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(LoanStatus.OVERDUE);

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OVERDUE"));

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/dashboard/summary")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overdueLoansCount").value(1))
                .andExpect(jsonPath("$.data.outstandingLoanPrincipal").value(1000.0));
    }

    @Test
    void memberCanRequestOwnLoanAndListMy() throws Exception {
        String memberToken = loginAccessToken(memberUsername, memberPassword);

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"amount": 500.0000, "termMonths": 3, "purpose": "Self request"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.memberUserId").value(memberUserId.toString()));

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/loans/my")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void memberDetailIncludesLoans() throws Exception {
        fundGroup(3000.0000);
        UUID loanId = requestApproveDisburse(500.0000);

        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/members/" + memberUserId)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.loans[0].id").value(loanId.toString()))
                .andExpect(jsonPath("$.data.loans[0].status").value("ACTIVE"));
    }

    private void fundGroup(double amount) throws Exception {
        mockMvc.perform(put("/api/v1/cooperatives/" + cooperativeId + "/contributions/period")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .param("year", "2026")
                        .param("month", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lines": [
                                    {
                                      "memberUserId": "%s",
                                      "paidAmount": %s,
                                      "paymentDate": "2026-01-10",
                                      "paymentReference": "FUND"
                                    }
                                  ]
                                }
                                """.formatted(memberUserId, BigDecimal.valueOf(amount).toPlainString())))
                .andExpect(status().isOk());
    }

    private UUID requestAndApprove(double amount, int termMonths) throws Exception {
        MvcResult requestResult = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "memberUserId": "%s",
                                  "amount": %s,
                                  "termMonths": %d,
                                  "purpose": "Business"
                                }
                                """.formatted(
                                memberUserId,
                                BigDecimal.valueOf(amount).toPlainString(),
                                termMonths)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();
        UUID loanId = UUID.fromString(objectMapper
                .readTree(requestResult.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/approve")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
        return loanId;
    }

    private UUID requestApproveDisburse(double amount) throws Exception {
        UUID loanId = requestAndApprove(amount, 6);
        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/loans/" + loanId + "/disburse")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
        return loanId;
    }

    private String loginAccessToken(String username, String password) throws Exception {
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
}
