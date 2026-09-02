package rw.terimbere.csams.modules.historicalimport.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import rw.terimbere.csams.modules.fine.entity.Fine;
import rw.terimbere.csams.modules.fine.entity.FinePayment;
import rw.terimbere.csams.modules.fine.repository.FinePaymentRepository;
import rw.terimbere.csams.modules.fine.repository.FineRepository;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseCategory;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseTransaction;
import rw.terimbere.csams.modules.incomeexpense.repository.IncomeExpenseTransactionRepository;
import rw.terimbere.csams.modules.investment.entity.Investment;
import rw.terimbere.csams.modules.investment.entity.InvestmentReturn;
import rw.terimbere.csams.modules.investment.repository.InvestmentRepository;
import rw.terimbere.csams.modules.investment.repository.InvestmentReturnRepository;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;
import rw.terimbere.csams.modules.loanrepayment.repository.LoanRepaymentRepository;
import rw.terimbere.csams.modules.payout.entity.PayoutLine;
import rw.terimbere.csams.modules.payout.entity.PayoutRun;
import rw.terimbere.csams.modules.payout.repository.PayoutLineRepository;
import rw.terimbere.csams.modules.payout.repository.PayoutRunRepository;
import rw.terimbere.csams.modules.socialfund.entity.SocialContribution;
import rw.terimbere.csams.modules.socialfund.entity.SocialDisbursement;
import rw.terimbere.csams.modules.socialfund.repository.SocialContributionRepository;
import rw.terimbere.csams.modules.socialfund.repository.SocialDisbursementRepository;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContribution;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionCampaign;
import rw.terimbere.csams.modules.specialcontribution.repository.SpecialContributionCampaignRepository;
import rw.terimbere.csams.modules.specialcontribution.repository.SpecialContributionRepository;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

/**
 * Cooperative-scoped lookups against live operational tables. Used so historical import
 * can detect records created outside this importer and alias existing parents.
 */
@Component
@RequiredArgsConstructor
class HistoricalOperationalLookup {

    private final SpecialContributionCampaignRepository campaignRepository;
    private final SpecialContributionRepository specialContributionRepository;
    private final SocialContributionRepository socialContributionRepository;
    private final SocialDisbursementRepository socialDisbursementRepository;
    private final LoanRepository loanRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final FineRepository fineRepository;
    private final FinePaymentRepository finePaymentRepository;
    private final InvestmentRepository investmentRepository;
    private final InvestmentReturnRepository investmentReturnRepository;
    private final IncomeExpenseTransactionRepository incomeExpenseRepository;
    private final PayoutRunRepository payoutRunRepository;
    private final PayoutLineRepository payoutLineRepository;

    record Match(UUID id, boolean ambiguous, String detail) {
        static Match none() {
            return new Match(null, false, null);
        }

        static Match one(UUID id, String detail) {
            return new Match(id, false, detail);
        }

        static Match many(String detail) {
            return new Match(null, true, detail);
        }

        boolean found() {
            return id != null && !ambiguous;
        }
    }

    Match matchCampaign(UUID cooperativeId, String name, LocalDate startDate) {
        if (!StringUtils.hasText(name)) {
            return Match.none();
        }
        List<SpecialContributionCampaign> matches = campaignRepository
                .findByCooperativeIdAndNameIgnoreCase(cooperativeId, name.trim())
                .stream()
                .filter(c -> startDate == null || startDate.equals(c.getStartDate()))
                .toList();
        return finish(matches, "campaign name '" + name + "'" + (startDate == null ? "" : " / start " + startDate));
    }

    Match matchLoan(UUID cooperativeId, UUID memberId, LocalDate disbursementDate, BigDecimal principal) {
        if (memberId == null || disbursementDate == null || principal == null) {
            return Match.none();
        }
        List<Loan> matches = loanRepository
                .findByCooperativeIdAndMemberUserIdAndDisbursementDate(cooperativeId, memberId, disbursementDate)
                .stream()
                .filter(loan -> sameMoney(loan.getPrincipalAmount(), principal))
                .toList();
        return finish(
                matches,
                "member loan disbursed " + disbursementDate + " for " + money(principal));
    }

    Match matchFine(UUID cooperativeId, UUID memberId, LocalDate issuedDate, BigDecimal total) {
        if (memberId == null || issuedDate == null || total == null) {
            return Match.none();
        }
        List<Fine> matches = fineRepository
                .findByCooperativeIdAndMemberUserIdAndIssuedDate(cooperativeId, memberId, issuedDate)
                .stream()
                .filter(fine -> sameMoney(fine.getTotalAmount(), total))
                .toList();
        return finish(matches, "member fine issued " + issuedDate + " for " + money(total));
    }

    Match matchInvestment(UUID cooperativeId, String name, BigDecimal amount, LocalDate investmentDate) {
        if (!StringUtils.hasText(name) || amount == null) {
            return Match.none();
        }
        List<Investment> matches = investmentRepository
                .findByCooperativeIdAndNameIgnoreCase(cooperativeId, name.trim())
                .stream()
                .filter(inv -> sameMoney(inv.getAmount(), amount))
                .filter(inv -> investmentDate == null || sameUtcDate(inv.getActivatedAt(), investmentDate))
                .toList();
        return finish(
                matches,
                "investment '" + name + "' amount " + money(amount)
                        + (investmentDate == null ? "" : " activated " + investmentDate));
    }

    Match matchPayout(UUID cooperativeId, LocalDate periodFrom, LocalDate periodTo, BigDecimal pool) {
        if (periodFrom == null || periodTo == null || pool == null) {
            return Match.none();
        }
        List<PayoutRun> matches = payoutRunRepository
                .findByCooperativeIdAndPeriodFromAndPeriodTo(cooperativeId, periodFrom, periodTo)
                .stream()
                .filter(run -> sameMoney(run.getPayoutPoolAmount(), pool))
                .toList();
        return finish(matches, "payout " + periodFrom + "–" + periodTo + " pool " + money(pool));
    }

    boolean hasSpecialContribution(
            UUID cooperativeId, UUID memberId, UUID campaignId, LocalDate date, BigDecimal amount) {
        if (memberId == null || campaignId == null || date == null || amount == null) {
            return false;
        }
        return !specialContributionRepository
                .findByCooperativeIdAndMemberUserIdAndCampaignIdAndContributionDateAndAmount(
                        cooperativeId, memberId, campaignId, date, money(amount))
                .isEmpty();
    }

    boolean hasSocialContribution(UUID cooperativeId, UUID memberId, LocalDate date, BigDecimal amount) {
        if (memberId == null || date == null || amount == null) {
            return false;
        }
        return !socialContributionRepository
                .findByCooperativeIdAndMemberUserIdAndContributionDateAndAmount(
                        cooperativeId, memberId, date, money(amount))
                .isEmpty();
    }

    boolean hasSocialDisbursement(UUID cooperativeId, UUID memberId, LocalDate date, BigDecimal amount) {
        if (memberId == null || date == null || amount == null) {
            return false;
        }
        return !socialDisbursementRepository
                .findByCooperativeIdAndBeneficiaryMemberUserIdAndDisbursementDateAndAmount(
                        cooperativeId, memberId, date, money(amount))
                .isEmpty();
    }

    boolean hasRepayment(UUID cooperativeId, UUID loanId, LocalDate date, BigDecimal total) {
        if (loanId == null || date == null || total == null) {
            return false;
        }
        return !loanRepaymentRepository
                .findByCooperativeIdAndLoanIdAndPaymentDateAndAmountTotal(cooperativeId, loanId, date, money(total))
                .isEmpty();
    }

    boolean hasFinePayment(UUID cooperativeId, UUID fineId, LocalDate date, BigDecimal amount) {
        if (fineId == null || date == null || amount == null) {
            return false;
        }
        return !finePaymentRepository
                .findByCooperativeIdAndFineIdAndPaymentDateAndAmount(cooperativeId, fineId, date, money(amount))
                .isEmpty();
    }

    boolean hasInvestmentReturn(UUID cooperativeId, UUID investmentId, LocalDate date, BigDecimal total) {
        if (investmentId == null || date == null || total == null) {
            return false;
        }
        return !investmentReturnRepository
                .findByCooperativeIdAndInvestmentIdAndReturnDateAndAmountTotal(
                        cooperativeId, investmentId, date, money(total))
                .isEmpty();
    }

    Match matchIncomeExpense(
            UUID cooperativeId,
            LocalDate date,
            BigDecimal amount,
            IncomeExpenseCategory category,
            String reference) {
        if (date == null || amount == null || category == null) {
            return Match.none();
        }
        List<IncomeExpenseTransaction> sameCore = incomeExpenseRepository
                .findByCooperativeIdAndTransactionDateAndCategory(cooperativeId, date, category)
                .stream()
                .filter(tx -> sameMoney(tx.getAmount(), amount))
                .toList();
        if (StringUtils.hasText(reference)) {
            String ref = reference.trim();
            List<IncomeExpenseTransaction> exact = sameCore.stream()
                    .filter(tx -> ref.equalsIgnoreCase(tx.getReference() == null ? "" : tx.getReference().trim()))
                    .toList();
            return finish(exact, "transaction " + date + " / " + money(amount) + " / " + category + " / " + ref);
        }
        if (sameCore.size() == 1) {
            return Match.one(
                    sameCore.get(0).getId(),
                    "transaction " + date + " / " + money(amount) + " / " + category);
        }
        if (sameCore.size() > 1) {
            return Match.many(
                    "transaction " + date + " / " + money(amount) + " / " + category);
        }
        return Match.none();
    }

    boolean hasPayoutLine(UUID cooperativeId, UUID payoutRunId, UUID memberId, BigDecimal amount) {
        if (payoutRunId == null || memberId == null || amount == null) {
            return false;
        }
        return !payoutLineRepository
                .findByCooperativeIdAndPayoutRunIdAndMemberUserIdAndPayoutAmount(
                        cooperativeId, payoutRunId, memberId, money(amount))
                .isEmpty();
    }

    static String existingMessage(String detail) {
        return "Possible existing transaction detected. Review the existing CSAMS record before importing ("
                + detail
                + ").";
    }

    private static <T> Match finish(List<T> matches, String detail) {
        if (matches == null || matches.isEmpty()) {
            return Match.none();
        }
        if (matches.size() > 1) {
            return Match.many(detail);
        }
        UUID id = extractId(matches.get(0));
        return Match.one(id, detail);
    }

    private static UUID extractId(Object entity) {
        if (entity instanceof SpecialContributionCampaign c) {
            return c.getId();
        }
        if (entity instanceof SpecialContribution c) {
            return c.getId();
        }
        if (entity instanceof SocialContribution c) {
            return c.getId();
        }
        if (entity instanceof SocialDisbursement d) {
            return d.getId();
        }
        if (entity instanceof Loan loan) {
            return loan.getId();
        }
        if (entity instanceof LoanRepayment r) {
            return r.getId();
        }
        if (entity instanceof Fine fine) {
            return fine.getId();
        }
        if (entity instanceof FinePayment p) {
            return p.getId();
        }
        if (entity instanceof Investment inv) {
            return inv.getId();
        }
        if (entity instanceof InvestmentReturn r) {
            return r.getId();
        }
        if (entity instanceof IncomeExpenseTransaction tx) {
            return tx.getId();
        }
        if (entity instanceof PayoutRun run) {
            return run.getId();
        }
        if (entity instanceof PayoutLine line) {
            return line.getId();
        }
        throw new IllegalStateException("Unsupported operational entity " + entity.getClass().getName());
    }

    private static boolean sameUtcDate(Instant instant, LocalDate date) {
        if (instant == null || date == null) {
            return false;
        }
        return instant.atZone(ZoneOffset.UTC).toLocalDate().equals(date);
    }

    private static boolean sameMoney(BigDecimal left, BigDecimal right) {
        return left != null && right != null && money(left).compareTo(money(right)) == 0;
    }

    private static BigDecimal money(BigDecimal value) {
        return MoneyUtils.scaleForStorage(value);
    }
}
