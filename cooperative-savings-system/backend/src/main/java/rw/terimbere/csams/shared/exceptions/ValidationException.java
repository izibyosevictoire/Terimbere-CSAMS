package rw.terimbere.csams.shared.exceptions;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import rw.terimbere.csams.shared.common.dto.ErrorResponse.FieldErrorDetail;

@Getter
public class ValidationException extends RuntimeException {

    private final List<FieldErrorDetail> fieldErrors;

    public ValidationException(String message) {
        super(message);
        this.fieldErrors = Collections.emptyList();
    }

    public ValidationException(String message, List<FieldErrorDetail> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors == null ? Collections.emptyList() : List.copyOf(fieldErrors);
    }

    public ValidationException(String message, Map<String, String> errors) {
        super(message);
        this.fieldErrors = errors == null
                ? Collections.emptyList()
                : errors.entrySet().stream()
                        .map(e -> FieldErrorDetail.builder()
                                .field(e.getKey())
                                .message(e.getValue())
                                .build())
                        .toList();
    }
}
