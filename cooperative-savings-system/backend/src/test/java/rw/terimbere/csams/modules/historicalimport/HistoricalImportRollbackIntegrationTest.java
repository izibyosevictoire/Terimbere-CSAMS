package rw.terimbere.csams.modules.historicalimport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
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
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;
import rw.terimbere.csams.modules.cooperative.CooperativeTestFixtures;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportStatus;
import rw.terimbere.csams.modules.historicalimport.repository.HistoricalImportRepository;
import rw.terimbere.csams.modules.ledger.service.LedgerService;
import rw.terimbere.csams.modules.user.repository.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HistoricalImportRollbackIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ContributionRepository contributionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HistoricalImportRepository historicalImportRepository;

    @MockBean
    private LedgerService ledgerService;

    private String superAdminToken;
    private UUID cooperativeId;

    @BeforeEach
    void setUp() throws Exception {
        when(ledgerService.appendApproved(any())).thenThrow(new RuntimeException("ledger write failed"));
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"superadmin","password":"ChangeMe@123!"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        superAdminToken = objectMapper
                .readTree(login.getResponse().getContentAsString())
                .path("data")
                .path("accessToken")
                .asText();
        MvcResult create = mockMvc.perform(post("/api/v1/cooperatives")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CooperativeTestFixtures.createBody("Rollback Coop " + UUID.randomUUID().toString().substring(0, 8))))
                .andExpect(status().isOk())
                .andReturn();
        cooperativeId = UUID.fromString(objectMapper
                .readTree(create.getResponse().getContentAsString())
                .path("data")
                .path("id")
                .asText());
    }

    @Test
    void failedLedgerWrite_rollsBackEntireImport() throws Exception {
        String username = "hist_rollback_" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, List<List<String>>> sheets = new LinkedHashMap<>();
        sheets.put(
                "Members",
                List.of(List.of(
                        username,
                        "Jane",
                        "Uwase",
                        username + "@test.local",
                        "0781234567",
                        "",
                        "2022-01-15",
                        "1",
                        "ACTIVE",
                        "MEMBER")));
        sheets.put(
                "Contributions",
                List.of(List.of(username, "2022", "3", "10000", "10000", "2022-03-05", "REF", "")));
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "rollback.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                workbook(sheets));

        MvcResult preview = mockMvc.perform(multipart(
                                "/api/v1/cooperatives/" + cooperativeId + "/historical-imports/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY"))
                .andReturn();
        UUID importId = UUID.fromString(objectMapper
                .readTree(preview.getResponse().getContentAsString())
                .path("data")
                .path("importId")
                .asText());

        mockMvc.perform(post("/api/v1/cooperatives/" + cooperativeId + "/historical-imports/" + importId + "/confirm")
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().is5xxServerError());

        assertThat(userRepository.findByUsernameIgnoreCaseAndDeletedFalse(username)).isEmpty();
        assertThat(contributionRepository
                        .findByCooperativeIdAndMemberUserIdAndYearAndMonth(cooperativeId, UUID.randomUUID(), 2022, 3))
                .isEmpty();
        assertThat(historicalImportRepository.findById(importId))
                .get()
                .extracting(imp -> imp.getStatus())
                .isEqualTo(HistoricalImportStatus.FAILED);
    }

    private static byte[] workbook(Map<String, List<List<String>>> sheets) throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Instructions").createRow(0).createCell(0).setCellValue("test");
            for (Map.Entry<String, List<List<String>>> entry : sheets.entrySet()) {
                Sheet sheet = workbook.createSheet(entry.getKey());
                HistoricalImportSheet type = HistoricalImportSheet.fromSheetName(entry.getKey()).orElseThrow();
                Row header = sheet.createRow(0);
                for (int i = 0; i < type.getHeaders().size(); i++) {
                    header.createCell(i).setCellValue(type.getHeaders().get(i));
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
