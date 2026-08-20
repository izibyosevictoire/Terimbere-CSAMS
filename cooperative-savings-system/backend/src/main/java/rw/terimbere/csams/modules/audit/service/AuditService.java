package rw.terimbere.csams.modules.audit.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.terimbere.csams.modules.audit.dto.AuditLogResponse;
import rw.terimbere.csams.modules.audit.entity.AuditLog;
import rw.terimbere.csams.modules.audit.repository.AuditLogRepository;
import rw.terimbere.csams.modules.audit.repository.AuditLogSpecs;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.shared.auditing.AuditableAction;
import rw.terimbere.csams.shared.common.dto.PageResponse;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.pagination.PageMapper;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final CooperativeRepository cooperativeRepository;
    private final CooperativeAuthorizationService authorizationService;

    @Transactional
    public void record(
            UUID userId,
            UUID cooperativeId,
            AuditableAction action,
            String entityType,
            UUID entityId,
            String previousJson,
            String newJson,
            String ip,
            String userAgent) {
        record(
                userId,
                cooperativeId,
                action.name(),
                entityType,
                entityId,
                previousJson,
                newJson,
                ip,
                userAgent);
    }

    @Transactional
    public void record(
            UUID userId,
            UUID cooperativeId,
            String action,
            String entityType,
            UUID entityId,
            String previousJson,
            String newJson,
            String ip,
            String userAgent) {
        AuditLog log = AuditLog.builder()
                .userId(userId)
                .cooperativeId(cooperativeId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .previousValues(previousJson)
                .newValues(newJson)
                .ipAddress(truncate(ip, 64))
                .userAgent(truncate(userAgent, 512))
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> listForCooperative(
            UUID cooperativeId,
            String action,
            UUID userId,
            String entityType,
            Instant from,
            Instant to,
            Pageable pageable) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        Page<AuditLog> page = auditLogRepository.findAll(
                AuditLogSpecs.filtered(cooperativeId, action, userId, entityType, from, to),
                pageable);
        return PageMapper.toPageResponse(page, this::toResponse);
    }

    /** Used by PDF report export — Specification avoids PostgreSQL null Instant binding issues. */
    @Transactional(readOnly = true)
    public List<AuditLog> listForExport(
            UUID cooperativeId, UUID userId, Instant from, Instant to) {
        return auditLogRepository.findAll(
                AuditLogSpecs.filtered(cooperativeId, null, userId, null, from, to),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional(readOnly = true)
    public AuditLogResponse getForCooperative(UUID cooperativeId, UUID auditId) {
        requireCooperative(cooperativeId);
        authorizationService.requireMembership(cooperativeId);
        AuditLog log = auditLogRepository
                .findByIdAndCooperativeId(auditId, cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Audit log not found"));
        return toResponse(log);
    }

    private void requireCooperative(UUID cooperativeId) {
        if (!cooperativeRepository.existsById(cooperativeId)) {
            throw new ResourceNotFoundException("Cooperative not found");
        }
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .cooperativeId(log.getCooperativeId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .previousValues(log.getPreviousValues())
                .newValues(log.getNewValues())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
