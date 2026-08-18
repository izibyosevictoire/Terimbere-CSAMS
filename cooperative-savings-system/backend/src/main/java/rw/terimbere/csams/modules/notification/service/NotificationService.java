package rw.terimbere.csams.modules.notification.service;

import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.notification.dto.NotificationResponse;
import rw.terimbere.csams.modules.notification.entity.Notification;
import rw.terimbere.csams.modules.notification.entity.NotificationType;
import rw.terimbere.csams.modules.notification.repository.NotificationRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.security.UserPrincipal;
import rw.terimbere.csams.shared.common.dto.PageResponse;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.pagination.PageMapper;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CooperativeAuthorizationService authorizationService;

    @Transactional
    public Notification create(
            UUID userId,
            UUID cooperativeId,
            NotificationType type,
            String title,
            String body,
            String entityType,
            UUID entityId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .cooperativeId(cooperativeId)
                .type(type)
                .title(truncate(title, 255))
                .body(truncate(body, 2000))
                .entityType(truncate(entityType, 128))
                .entityId(entityId)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> listMine(boolean unreadOnly, Pageable pageable) {
        UserPrincipal principal = authorizationService.currentPrincipal();
        Page<Notification> page = unreadOnly
                ? notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(
                        principal.getId(), pageable)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(principal.getId(), pageable);
        return PageMapper.toPageResponse(page, this::toResponse);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        UserPrincipal principal = authorizationService.currentPrincipal();
        return notificationRepository.countByUserIdAndReadFalse(principal.getId());
    }

    @Transactional
    public NotificationResponse markRead(UUID notificationId) {
        UserPrincipal principal = authorizationService.currentPrincipal();
        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return toResponse(notification);
    }

    @Transactional
    public int markAllRead() {
        UserPrincipal principal = authorizationService.currentPrincipal();
        return notificationRepository.markAllRead(principal.getId(), Instant.now());
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .cooperativeId(n.getCooperativeId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .entityType(n.getEntityType())
                .entityId(n.getEntityId())
                .read(n.isRead())
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }

    private static String truncate(String value, int max) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
