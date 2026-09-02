package rw.terimbere.csams.modules.historicalimport.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImport;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportStatus;

public interface HistoricalImportRepository extends JpaRepository<HistoricalImport, UUID> {

    Optional<HistoricalImport> findByIdAndCooperativeId(UUID id, UUID cooperativeId);

    List<HistoricalImport> findByCooperativeIdOrderByCreatedAtDesc(UUID cooperativeId);

    boolean existsByCooperativeIdAndFileHashAndStatus(
            UUID cooperativeId, String fileHash, HistoricalImportStatus status);
}
