package rw.terimbere.csams.modules.dashboard.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.terimbere.csams.modules.contribution.dto.MonthlyContributionChartPoint;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;
import rw.terimbere.csams.modules.contribution.service.ContributionService;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.dashboard.dto.DashboardSummaryResponse;
import rw.terimbere.csams.modules.fine.service.FineService;
import rw.terimbere.csams.modules.investment.service.InvestmentService;
import rw.terimbere.csams.modules.loan.service.LoanService;
import rw.terimbere.csams.modules.membership.repository.CooperativeMembershipRepository;
import rw.terimbere.csams.modules.payout.service.PayoutService;
import rw.terimbere.csams.modules.socialfund.service.SocialFundBalanceService;
import rw.terimbere.csams.modules.socialfund.service.SocialFundService;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialContributionStatus;
import rw.terimbere.csams.modules.specialcontribution.repository.SpecialContributionRepository;
import rw.terimbere.csams.security.CooperativeAuthorizationService;
import rw.terimbere.csams.shared.exceptions.ResourceNotFoundException;
import rw.terimbere.csams.shared.financial.LedgerFinancialCalculationService;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CooperativeRepository cooperativeRepository;
    private final CooperativeMembershipRepository membershipRepository;
    private final ContributionRepository contributionRepository;
    private final SpecialContributionRepository specialContributionRepository;
    private final ContributionService contributionService;
    private final LoanService loanService;
    private final FineService fineService;
    private final SocialFundBalanceService socialFundBalanceService;
    private final SocialFundService socialFundService;
    private final InvestmentService investmentService;
    private final PayoutService payoutService;
    private final LedgerFinancialCalculationService financialCalculationService;
    private final CooperativeAuthorizationService authorizationService;

    @Transactional
    public DashboardSummaryResponse summary(UUID cooperativeId) {
        Cooperative cooperative = cooperativeRepository
                .findByIdAndDeletedFalse(cooperativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Cooperative", cooperativeId));
        authorizationService.requireMembership(cooperativeId);

        loanService.refreshOverdueStatuses(cooperativeId);

        long totalMembers = membershipRepository.countByCooperativeId(cooperativeId);
        long activeMembers = membershipRepository.countByCooperativeIdAndMembershipStatus(cooperativeId, "ACTIVE");

        BigDecimal regularFromTable = contributionRepository.sumPaidForPeriod(cooperativeId, null, null);
        BigDecimal regular = MoneyUtils.scale(regularFromTable == null ? BigDecimal.ZERO : regularFromTable);

        BigDecimal special = financialCalculationService.sumApprovedCreditsByType(
                cooperativeId, LedgerTransactionType.SPECIAL_CONTRIBUTION);

        BigDecimal actual = MoneyUtils.add(regular, special);
        BigDecimal available = financialCalculationService.calculateAvailableGroupFund(cooperativeId);
        long pending = specialContributionRepository.countByCooperativeIdAndStatus(
                cooperativeId, SpecialContributionStatus.PENDING);

        BigDecimal totalLoanPrincipal = loanService.sumDisbursedPrincipal(cooperativeId);
        BigDecimal outstandingLoanPrincipal = loanService.sumOutstandingPrincipalActiveOverdue(cooperativeId);
        BigDecimal loanInterestEarned = financialCalculationService.sumApprovedCreditsByType(
                cooperativeId, LedgerTransactionType.LOAN_INTEREST_PAYMENT);
        long overdueLoansCount = loanService.countOverdue(cooperativeId);

        long totalFines = fineService.countTotal(cooperativeId);
        long unpaidFines = fineService.countUnpaid(cooperativeId);
        long paidFines = fineService.countPaid(cooperativeId);
        long membersWithFines = fineService.countMembersWithOpenFines(cooperativeId);
        BigDecimal approvedFineIncome = financialCalculationService.sumApprovedCreditsByType(
                cooperativeId, LedgerTransactionType.FINE_PAYMENT);
        long pendingFinePayments = fineService.countPendingPayments(cooperativeId);
        long approvedFinePayments =
                fineService.countPaymentsByStatus(cooperativeId, rw.terimbere.csams.modules.fine.entity.FinePaymentStatus.APPROVED);
        long rejectedFinePayments =
                fineService.countPaymentsByStatus(cooperativeId, rw.terimbere.csams.modules.fine.entity.FinePaymentStatus.REJECTED);

        BigDecimal socialContributionsTotal = socialFundBalanceService.sumApprovedContributions(cooperativeId);
        BigDecimal socialDisbursementsTotal = socialFundBalanceService.sumApprovedDisbursements(cooperativeId);
        BigDecimal socialFundBalance = socialFundBalanceService.calculateBalance(cooperativeId);
        long pendingSocialApprovals = socialFundService.countPendingApprovals(cooperativeId);

        long activeInvestmentsCount = investmentService.countActiveInvestments(cooperativeId);
        BigDecimal investmentCapital = financialCalculationService.sumActiveInvestmentCapital(cooperativeId);
        BigDecimal investmentProfits = financialCalculationService.sumApprovedCreditsByType(
                cooperativeId, LedgerTransactionType.INVESTMENT_PROFIT);
        BigDecimal otherIncomeTotal = financialCalculationService.sumApprovedCreditsByType(
                cooperativeId, LedgerTransactionType.OTHER_INCOME);
        BigDecimal generalExpensesTotal = financialCalculationService.sumApprovedDebitsByType(
                cooperativeId, LedgerTransactionType.GENERAL_EXPENSE);
        BigDecimal interestExpensesTotal = financialCalculationService.sumApprovedDebitsByType(
                cooperativeId, LedgerTransactionType.INTEREST_EXPENSE);
        BigDecimal availableInterest = financialCalculationService.calculateAvailableInterest(cooperativeId);

        long pendingPayoutsCount = payoutService.countPendingPreviews(cooperativeId);
        BigDecimal totalConfirmedPayouts = financialCalculationService.sumApprovedDebitsByType(
                cooperativeId, LedgerTransactionType.MEMBER_PAYOUT);

        return DashboardSummaryResponse.builder()
                .totalMembers(totalMembers)
                .activeMembers(activeMembers)
                .regularContributionsTotal(regular)
                .specialContributionsTotal(special)
                .actualContributionsTotal(actual)
                .availableGroupFunds(available)
                .pendingSpecialApprovals(pending)
                .totalLoanPrincipal(totalLoanPrincipal)
                .outstandingLoanPrincipal(outstandingLoanPrincipal)
                .loanInterestEarned(loanInterestEarned)
                .overdueLoansCount(overdueLoansCount)
                .totalFines(totalFines)
                .unpaidFines(unpaidFines)
                .paidFines(paidFines)
                .membersWithFines(membersWithFines)
                .approvedFineIncome(approvedFineIncome)
                .pendingFinePayments(pendingFinePayments)
                .approvedFinePayments(approvedFinePayments)
                .rejectedFinePayments(rejectedFinePayments)
                .socialFundBalance(socialFundBalance)
                .socialContributionsTotal(socialContributionsTotal)
                .socialDisbursementsTotal(socialDisbursementsTotal)
                .pendingSocialApprovals(pendingSocialApprovals)
                .activeInvestmentsCount(activeInvestmentsCount)
                .investmentCapital(investmentCapital)
                .investmentProfits(investmentProfits)
                .otherIncomeTotal(otherIncomeTotal)
                .generalExpensesTotal(generalExpensesTotal)
                .interestExpensesTotal(interestExpensesTotal)
                .availableInterest(availableInterest)
                .pendingPayoutsCount(pendingPayoutsCount)
                .totalConfirmedPayouts(totalConfirmedPayouts)
                .currency(cooperative.getCurrency())
                .build();
    }

    @Transactional(readOnly = true)
    public List<MonthlyContributionChartPoint> monthlyContributionsChart(UUID cooperativeId, int year) {
        return contributionService.monthlyChart(cooperativeId, year);
    }
}
