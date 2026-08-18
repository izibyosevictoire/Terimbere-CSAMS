package rw.terimbere.csams.modules.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CooperativeSettingsUpdateRequest {

    @NotBlank
    @Size(max = 64)
    private String timezone;

    @NotBlank
    @Size(max = 16)
    private String locale;

    private Boolean notifyContributions;
    private Boolean notifyLoans;
    private Boolean notifyFines;
    private Boolean notifyPayouts;
}
