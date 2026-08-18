package rw.terimbere.csams.modules.fine.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.terimbere.csams.modules.fine.entity.FinePayment;
import rw.terimbere.csams.modules.fine.entity.FinePaymentStatus;

public interface FinePaymentRepository extends JpaRepository<FinePayment, UUID> {

    Optional<FinePayment> findByIdAndCooperativeIdAndFineId(UUID id, UUID cooperativeId, UUID fineId);

    List<FinePayment> findByFineIdAndCooperativeIdOrderByCreatedAtDesc(UUID fineId, UUID cooperativeId);

    long countByCooperativeIdAndStatus(UUID cooperativeId, FinePaymentStatus status);

    @Query(
            """
            SELECT p FROM FinePayment p
            WHERE p.cooperativeId = :cooperativeId
              AND (:memberUserId IS NULL OR p.memberUserId = :memberUserId)
              AND (:status IS NULL OR p.status = :status)
              AND (:fromDate IS NULL OR p.paymentDate >= :fromDate)
              AND (:toDate IS NULL OR p.paymentDate <= :toDate)
            ORDER BY p.paymentDate DESC, p.createdAt DESC
            """)
    List<FinePayment> findFiltered(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("memberUserId") UUID memberUserId,
            @Param("status") FinePaymentStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(
            """
            SELECT p FROM FinePayment p
            WHERE p.cooperativeId = :cooperativeId
              AND (:status IS NULL OR p.status = :status)
              AND (:fromDate IS NULL OR p.paymentDate >= :fromDate)
              AND (:toDate IS NULL OR p.paymentDate <= :toDate)
              AND (
                    :q IS NULL
                    OR LOWER(COALESCE(p.paymentReference, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                    OR EXISTS (
                        SELECT 1 FROM rw.terimbere.csams.modules.user.entity.User u
                        WHERE u.id = p.memberUserId
                          AND (
                            LOWER(COALESCE(u.firstName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                            OR LOWER(COALESCE(u.lastName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                            OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                            OR LOWER(CONCAT(COALESCE(u.firstName, ''), ' ', COALESCE(u.lastName, '')))
                                LIKE LOWER(CONCAT('%', :q, '%'))
                          )
                    )
                  )
            """)
    Page<FinePayment> findQueuePage(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("status") FinePaymentStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("q") String q,
            Pageable pageable);

    @Query(
            """
            SELECT COALESCE(SUM(p.amount), 0)
            FROM FinePayment p
            WHERE p.fineId = :fineId
              AND p.status = rw.terimbere.csams.modules.fine.entity.FinePaymentStatus.PENDING
            """)
    BigDecimal sumPendingAmountByFineId(@Param("fineId") UUID fineId);

    @Query(
            """
            SELECT COALESCE(SUM(p.amount), 0)
            FROM FinePayment p
            WHERE p.cooperativeId = :cooperativeId
              AND p.memberUserId = :memberUserId
              AND p.status = rw.terimbere.csams.modules.fine.entity.FinePaymentStatus.APPROVED
            """)
    BigDecimal sumApprovedAmountByMember(
            @Param("cooperativeId") UUID cooperativeId, @Param("memberUserId") UUID memberUserId);
}
