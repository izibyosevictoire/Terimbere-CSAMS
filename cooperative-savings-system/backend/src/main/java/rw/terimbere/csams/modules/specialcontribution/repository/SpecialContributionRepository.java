package rw.terimbere.csams.modules.specialcontribution.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContribution;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionStatus;

public interface SpecialContributionRepository extends JpaRepository<SpecialContribution, UUID> {

    List<SpecialContribution> findByCampaignIdOrderByCreatedAtDesc(UUID campaignId);

    List<SpecialContribution> findByCooperativeIdAndCampaignId(UUID cooperativeId, UUID campaignId);

    Optional<SpecialContribution> findByIdAndCooperativeId(UUID id, UUID cooperativeId);

    long countByCooperativeIdAndStatus(UUID cooperativeId, SpecialContributionStatus status);

    @Query(
            """
            SELECT COALESCE(SUM(s.amount), 0)
            FROM SpecialContribution s
            WHERE s.cooperativeId = :cooperativeId
              AND s.status = rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionStatus.APPROVED
            """)
    BigDecimal sumApprovedAmount(@Param("cooperativeId") UUID cooperativeId);

    @Query(
            """
            SELECT COALESCE(SUM(s.amount), 0)
            FROM SpecialContribution s
            WHERE s.cooperativeId = :cooperativeId
              AND s.memberUserId = :memberUserId
              AND s.status = rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionStatus.APPROVED
            """)
    BigDecimal sumApprovedAmountByMember(
            @Param("cooperativeId") UUID cooperativeId, @Param("memberUserId") UUID memberUserId);

    List<SpecialContribution> findByCooperativeIdAndStatus(UUID cooperativeId, SpecialContributionStatus status);

    @Query(
            """
            SELECT s.memberUserId, COALESCE(SUM(s.amount), 0)
            FROM SpecialContribution s
            WHERE s.cooperativeId = :cooperativeId
              AND s.status = rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionStatus.APPROVED
              AND s.contributionDate >= :fromDate
              AND s.contributionDate <= :toDate
            GROUP BY s.memberUserId
            """)
    List<Object[]> sumApprovedGroupedByMemberInDateRange(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(
            """
            SELECT s FROM SpecialContribution s
            WHERE s.cooperativeId = :cooperativeId
              AND (:memberUserId IS NULL OR s.memberUserId = :memberUserId)
              AND (:status IS NULL OR s.status = :status)
              AND (:fromDate IS NULL OR s.contributionDate >= :fromDate)
              AND (:toDate IS NULL OR s.contributionDate <= :toDate)
            ORDER BY s.contributionDate DESC, s.createdAt DESC
            """)
    List<SpecialContribution> findFiltered(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("memberUserId") UUID memberUserId,
            @Param("status") SpecialContributionStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
