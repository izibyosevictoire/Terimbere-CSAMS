package rw.terimbere.csams.modules.incomeexpense.repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseApprovalStatus;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseCategory;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseTransaction;

public interface IncomeExpenseTransactionRepository extends JpaRepository<IncomeExpenseTransaction, UUID> {

    Optional<IncomeExpenseTransaction> findByIdAndCooperativeId(UUID id, UUID cooperativeId);

    @Query(
            """
            SELECT t FROM IncomeExpenseTransaction t
            WHERE t.cooperativeId = :cooperativeId
              AND (:category IS NULL OR t.category = :category)
              AND (:status IS NULL OR t.approvalStatus = :status)
              AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
              AND (:toDate IS NULL OR t.transactionDate <= :toDate)
            """)
    Page<IncomeExpenseTransaction> findFiltered(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("category") IncomeExpenseCategory category,
            @Param("status") IncomeExpenseApprovalStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);
}
