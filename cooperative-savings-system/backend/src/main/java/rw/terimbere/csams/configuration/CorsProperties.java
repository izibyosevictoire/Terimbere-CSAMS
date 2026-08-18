package rw.terimbere.csams.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    /**
     * Comma-separated list of allowed origins.
     */
    private String allowedOrigins = "http://localhost:5173";
}
