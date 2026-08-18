package rw.terimbere.csams.modules.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
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
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import rw.terimbere.csams.modules.contribution.repository.ContributionImportRepository;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportAndContributionImportIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ContributionRepository contributionRepository;

    @Autowired
    private ContributionImportRepository contributionImportRepository;

    private String superAdminToken;
    private UUID cooperativeId;
    private UUID memberUserId;
    private String memberUsername;
    private UUID otherCooperativeId;

    @BeforeEach
    void setUp() throws Exception {
        superAdminToken = loginAccessToken("superadmin", "ChangeMe@123!");

        cooperativeId = createCooperative("Report Coop " + UUID.randomUUID().toString().substring(0, 8));
        otherCooperativeId = createCooperative("Other Coop " + UUID.randomUUID().toString().substring(0, 8));

        memberUsername = "rmember_" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode memberData = registerMember(cooperativeId, memberUsername, "Report", "Member");
        memberUserId = UUID.fromString(memberData.path("userId").asText());
    }

    @Test
    void templateDownload_returnsXlsx() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/contributions/import/template")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn();

        byte[] body = result.getResponse().getContentAsByteArray();
        assertThat(body.length).isGreaterThan(100);
        assertThat(body[0]).isEqualTo((byte) 0x50); // PK zip/xlsx
        assertThat(body[1]).isEqualTo((byte) 0x4B);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            Sheet sheet = workbook.getSheetAt(0);
            Row header = sheet.getRow(0);
            assertThat(header.getCell(0).getStringCellValue()).isEqualTo("Username");
            assertThat(header.getCell(2).getStringCellValue()).isEqualTo("Amount");
        }
    }

    @Test
    void preview_marksInvalidUsername_andDoesNotCreateContributions() throws Exception {
        long before = contributionRepository.count();
        byte[] xlsx = buildImportWorkbook(
                memberUsername, "Report Member", "500.00", "2026-04-01", "REF-OK", "ok",
                "unknown_user_xyz", "Ghost", "100.00", "2026-04-02", "REF-BAD", "bad");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx);

        mockMvc.perform(multipart("/api/v1/cooperatives/" + cooperativeId + "/contributions/import/preview")
                        .file(file)
                        .param("year", "2026")
                        .param("month", "4")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.importId").isNotEmpty())
                .andExpect(jsonPath("$.data.validCount").value(1))
                .andExpect(jsonPath("$.data.invalidCount").value(1))
                .andExpect(jsonPath("$.data.rows[0].valid").value(true))
                .andExpect(jsonPath("$.data.rows[1].valid").value(false))
                .andExpect(jsonPath("$.data.rows[1].errors[0]").exists());

        assertThat(contributionRepository.count()).isEqualTo(before);
        assertThat(contributionImportRepository.findByCooperativeIdOrderByCreatedAtDesc(cooperativeId)).isNotEmpty();
    }

    @Test
    void confirm_importsValidRows_andBatchUpsertsDuplicatePeriod() throws Exception {
        byte[] xlsx = buildImportWorkbook(
                memberUsername, "Report Member", "1000.00", "2026-05-03", "REF-MAY", "first");

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx);

        MvcResult preview = mockMvc.perform(multipart(
                                "/api/v1/cooperatives/" + cooperativeId + "/contributions/import/preview")
                        .file(file)
                        .param("year", "2026")
                        .param("month", "5")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.validCount").value(1))
                .andReturn();

        UUID importId = UUID.fromString(objectMapper
                .readTree(preview.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());

        long beforeConfirm = contributionRepository.count();
        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/contributions/import/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberUserId").value(memberUserId.toString()))
                .andExpect(jsonPath("$.data[0].status").value("PAID"))
                .andExpect(jsonPath("$.data[0].paidAmount").value(1000.0));

        assertThat(contributionRepository.count()).isEqualTo(beforeConfirm + 1);
        assertThat(contributionRepository
                        .findByCooperativeIdAndMemberUserIdAndYearAndMonth(cooperativeId, memberUserId, 2026, 5))
                .isPresent();

        // Second import for same period upserts via batchSave
        byte[] xlsx2 = buildImportWorkbook(
                memberUsername, "Report Member", "400.00", "2026-05-10", "REF-MAY-2", "upsert");
        MockMultipartFile file2 = new MockMultipartFile(
                "file",
                "import2.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx2);

        MvcResult preview2 = mockMvc.perform(multipart(
                                "/api/v1/cooperatives/" + cooperativeId + "/contributions/import/preview")
                        .file(file2)
                        .param("year", "2026")
                        .param("month", "5")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andReturn();
        UUID importId2 = UUID.fromString(objectMapper
                .readTree(preview2.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/contributions/import/" + importId2 + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("PARTIALLY_PAID"))
                .andExpect(jsonPath("$.data[0].paidAmount").value(400.0));

        assertThat(contributionRepository.count()).isEqualTo(beforeConfirm + 1);
    }

    @Test
    void exportContributions_returnsNonEmptyXlsxWithHeader() throws Exception {
        // seed a contribution via batch API
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                                "/api/v1/cooperatives/" + cooperativeId + "/contributions/period")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .param("year", "2026")
                        .param("month", "6")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "lines": [
                                    {
                                      "memberUserId": "%s",
                                      "paidAmount": 750.0000,
                                      "paymentDate": "2026-06-02",
                                      "paymentReference": "EXP-1"
                                    }
                                  ]
                                }
                                """.formatted(memberUserId)))
                .andExpect(status().isOk());

        MvcResult export = mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/reports/export")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reportType":"CONTRIBUTIONS","year":2026,"month":6}
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        "Content-Type",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(header().exists("Content-Disposition"))
                .andReturn();

        byte[] body = export.getResponse().getContentAsByteArray();
        assertThat(body.length).isGreaterThan(200);
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            assertThat(workbook.getNumberOfSheets()).isGreaterThanOrEqualTo(2);
            Sheet headerSheet = workbook.getSheet("Report Header");
            assertThat(headerSheet).isNotNull();
            assertThat(headerSheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Cooperative");
            assertThat(headerSheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("Contributions");

            Sheet data = workbook.getSheet("Contributions");
            assertThat(data).isNotNull();
            // header meta then blank then column headers
            boolean foundPaid = false;
            for (Row row : data) {
                if (row.getCell(0) != null && "Member".equals(row.getCell(0).getStringCellValue())) {
                    foundPaid = true;
                    break;
                }
            }
            assertThat(foundPaid).isTrue();
        }
    }

    @Test
    void coopIsolation_onImportAndExport() throws Exception {
        byte[] xlsx = buildImportWorkbook(
                memberUsername, "Report Member", "100.00", "2026-07-01", "REF", "x");
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsx);

        // member exists only in cooperativeId — preview against other coop marks username invalid
        mockMvc.perform(multipart("/api/v1/cooperatives/" + otherCooperativeId + "/contributions/import/preview")
                        .file(file)
                        .param("year", "2026")
                        .param("month", "7")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.validCount").value(0))
                .andExpect(jsonPath("$.data.invalidCount").value(1));

        // export for other coop succeeds for superadmin membership-bypass but contains no contrib rows for our member
        MvcResult export = mockMvc.perform(post("/api/v1/cooperatives/" + otherCooperativeId + "/reports/export")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reportType":"CONTRIBUTIONS","year":2026,"month":7}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(export.getResponse().getContentAsByteArray().length).isGreaterThan(100);

        // member of coop A cannot access coop B import/export
        String freshUser = "iso_" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode fresh = registerMember(cooperativeId, freshUser, "Iso", "Member");
        String freshToken = loginAccessToken(freshUser, fresh.path("temporaryPassword").asText());

        mockMvc.perform(get("/api/v1/cooperatives/" + otherCooperativeId + "/contributions/import/template")
                        .header("Authorization", "Bearer " + freshToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/cooperatives/" + otherCooperativeId + "/reports/export")
                        .header("Authorization", "Bearer " + freshToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reportType":"CONTRIBUTIONS"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void reportTypes_listsAvailableTypes() throws Exception {
        mockMvc.perform(get("/api/v1/cooperatives/" + cooperativeId + "/reports/types")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(15))
                .andExpect(jsonPath("$.data[0].code").isNotEmpty())
                .andExpect(jsonPath("$.data[0].label").isNotEmpty());
    }

    private UUID createCooperative(String name) throws Exception {
        MvcResult create = mockMvc.perform(post("/api/v1/cooperatives")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","currency":"RWF","monthlyContributionAmount":1000.0000}
                                """.formatted(name)))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(objectMapper
                .readTree(create.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    }

    private JsonNode registerMember(UUID coopId, String username, String first, String last) throws Exception {
        MvcResult register = mockMvc.perform(post("/api/v1/cooperatives/" + coopId + "/members")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName":"%s",
                                  "lastName":"%s",
                                  "username":"%s",
                                  "email":"%s@test.local",
                                  "roleInCooperative":"MEMBER"
                                }
                                """.formatted(first, last, username, username)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(register.getResponse().getContentAsString()).path("data");
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

    private static byte[] buildImportWorkbook(String... rowTriples) throws Exception {
        // each logical row: username, memberName, amount, paymentDate, reference, notes (6 fields)
        try (Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Import");
            Row header = sheet.createRow(0);
            String[] headers = {"Username", "Member Name", "Amount", "Payment Date", "Reference", "Notes"};
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }
            int rowNum = 1;
            for (int i = 0; i + 5 < rowTriples.length; i += 6) {
                Row row = sheet.createRow(rowNum++);
                for (int c = 0; c < 6; c++) {
                    row.createCell(c).setCellValue(rowTriples[i + c]);
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
