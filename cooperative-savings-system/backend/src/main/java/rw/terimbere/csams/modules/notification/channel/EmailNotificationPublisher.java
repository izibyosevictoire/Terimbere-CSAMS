package rw.terimbere.csams.modules.notification.channel;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import rw.terimbere.csams.modules.notification.entity.NotificationType;

/**
 * Stub email channel — logs only. Swap for a real mailer without changing callers.
 *
 * <p>Must never throw into financial flows: all errors are swallowed here (and
 * {@link rw.terimbere.csams.modules.notification.service.NotificationFacade} also catches per-channel).
 */
@Component
public class EmailNotificationPublisher implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationPublisher.class);

    @Override
    public void publish(
            UUID userId,
            UUID cooperativeId,
            NotificationType type,
            String title,
            String body,
            String entityType,
            UUID entityId) {
        try {
            log.debug(
                    "Email notification stub (no-op): userId={}, type={}, title={}, entityType={}, entityId={}",
                    userId,
                    type,
                    title,
                    entityType,
                    entityId);
        } catch (Exception ex) {
            // Never fail loans/fines/contributions because the email stub misbehaved.
            log.warn(
                    "Email notification stub failed (ignored): userId={}, type={}, error={}",
                    userId,
                    type,
                    ex.getMessage());
        }
    }
}
