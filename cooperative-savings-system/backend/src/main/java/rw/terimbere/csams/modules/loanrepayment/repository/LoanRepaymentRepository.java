package rw.terimbere.csams.modules.loanrepayment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;

public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, UUID> {

    List<LoanRepayment> findByLoanIdAndCooperativeIdOrderByPaymentDateDescCreatedAtDesc(
            UUID loanId, UUID cooperativeId);

    @Query(
            """
            SELECT r FROM LoanRepayment r
            WHERE r.cooperativeId = :cooperativeId
              AND (:memberUserId IS NULL OR r.memberUserId = :memberUserId)
              AND (:fromDate IS NULL OR r.paymentDate >= :fromDate)
              AND (:toDate IS NULL OR r.paymentDate <= :toDate)
            ORDER BY r.paymentDate DESC, r.createdAt DESC
            """)
    List<LoanRepayment> findFiltered(
            @Param("cooperativeId") UUID cooperativeId,
            @Param("memberUserId") UUID memberUserId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
