package rw.terimbere.csams.modules.report.whatsapp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import rw.terimbere.csams.shared.exceptions.BusinessException;

/**
 * Sends PDF documents through the official Meta WhatsApp Cloud API (Graph).
 * Media is uploaded to Meta — the PDF is never published as a public URL on this server.
 */
@Component
public class GraphWhatsAppCloudClient implements WhatsAppCloudClient {

    private static final Logger log = LoggerFactory.getLogger(GraphWhatsAppCloudClient.class);

    private final WhatsAppProperties properties;

    public GraphWhatsAppCloudClient(WhatsAppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendDocument(String recipient, byte[] pdf, String filename, String caption) {
        if (!properties.isConfigured()) {
            throw new BusinessException("WHATSAPP_NOT_CONFIGURED", "WhatsApp sharing is not configured");
        }
        try {
            RestClient client = RestClient.builder()
                    .baseUrl("https://graph.facebook.com/" + properties.getApiVersion().trim())
                    .defaultHeader("Authorization", "Bearer " + properties.getAccessToken().trim())
                    .build();
            String mediaId = uploadMedia(client, pdf, filename);
            if (properties.hasTemplate()) {
                sendTemplate(client, recipient, mediaId, filename);
            } else {
                sendSessionDocument(client, recipient, mediaId, filename, caption);
            }
        } catch (BusinessException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            log.warn("WhatsApp Cloud API HTTP {} (token not logged)", ex.getStatusCode().value());
            throw new BusinessException("WHATSAPP_SEND_FAILED", "WhatsApp could not send the report");
        } catch (RuntimeException ex) {
            log.warn("WhatsApp Cloud API call failed: {}", ex.getClass().getSimpleName());
            throw new BusinessException("WHATSAPP_SEND_FAILED", "WhatsApp could not send the report");
        }
    }

    private String uploadMedia(RestClient client, byte[] pdf, String filename) {
        ByteArrayResource file = new ByteArrayResource(pdf) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("messaging_product", "whatsapp");
        builder.part("type", MediaType.APPLICATION_PDF_VALUE);
        builder.part("file", file).contentType(MediaType.APPLICATION_PDF);
        MediaUploadResponse response = client.post()
                .uri("/{phoneNumberId}/media", properties.getPhoneNumberId().trim())
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .retrieve()
                .body(MediaUploadResponse.class);
        if (response == null || !StringUtils.hasText(response.id())) {
            throw new BusinessException("WHATSAPP_SEND_FAILED", "WhatsApp could not send the report");
        }
        return response.id();
    }

    private void sendSessionDocument(
            RestClient client, String recipient, String mediaId, String filename, String caption) {
        Map<String, Object> document = new java.util.LinkedHashMap<>();
        document.put("id", mediaId);
        document.put("filename", filename);
        if (StringUtils.hasText(caption)) {
            document.put("caption", caption);
        }
        client.post()
                .uri("/{phoneNumberId}/messages", properties.getPhoneNumberId().trim())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "messaging_product", "whatsapp",
                        "to", recipient,
                        "type", "document",
                        "document", document))
                .retrieve()
                .toBodilessEntity();
    }

    private void sendTemplate(RestClient client, String recipient, String mediaId, String filename) {
        Map<String, Object> header = Map.of(
                "type", "header",
                "parameters",
                List.of(Map.of(
                        "type", "document",
                        "document",
                        Map.of("id", mediaId, "filename", filename))));
        client.post()
                .uri("/{phoneNumberId}/messages", properties.getPhoneNumberId().trim())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "messaging_product", "whatsapp",
                        "to", recipient,
                        "type", "template",
                        "template",
                        Map.of(
                                "name", properties.getTemplateName().trim(),
                                "language", Map.of("code", properties.getTemplateLanguage().trim()),
                                "components", List.of(header))))
                .retrieve()
                .toBodilessEntity();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MediaUploadResponse(String id) {}
}
