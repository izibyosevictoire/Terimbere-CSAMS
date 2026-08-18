export interface DashboardSummary {
  totalMembers: number
  activeMembers: number
  regularContributionsTotal: string | number
  specialContributionsTotal: string | number
  actualContributionsTotal: string | number
  availableGroupFunds: string | number
  pendingSpecialApprovals?: number
  /** Present once Phase 5 loans backend is live. */
  totalLoanPrincipal?: string | number
  outstandingLoanPrincipal?: string | number
  loanInterestEarned?: string | number
  overdueLoansCount?: number
  /** Present once Phase 6 fines backend is live. */
  totalFines?: string | number
  unpaidFines?: string | number
  paidFines?: string | number
  approvedFineIncome?: string | number
  pendingFinePayments?: number
  membersWithFines?: number
  approvedFinePayments?: number
  rejectedFinePayments?: number
  /** Present once Phase 7 social fund backend is live. Separate from availableGroupFunds. */
  socialFundBalance?: string | number
  socialContributionsTotal?: string | number
  socialDisbursementsTotal?: string | number
  pendingSocialApprovals?: number
  /** Present once Phase 8 investments / income-expense backend is live. */
  activeInvestmentsCount?: number
  investmentCapital?: string | number
  investmentProfits?: string | number
  otherIncomeTotal?: string | number
  generalExpensesTotal?: string | number
  interestExpensesTotal?: string | number
  availableInterest?: string | number
  /** Present once Phase 9 payouts backend is live. */
  pendingPayoutsCount?: number
  totalConfirmedPayouts?: string | number
  currency?: string
}

export interface MonthlyContributionChartPoint {
  month: number
  totalPaid: string | number
}

export function mapDashboardSummary(raw: DashboardSummary): DashboardSummary {
  return {
    totalMembers: Number(raw.totalMembers ?? 0),
    activeMembers: Number(raw.activeMembers ?? 0),
    regularContributionsTotal: raw.regularContributionsTotal ?? 0,
    specialContributionsTotal: raw.specialContributionsTotal ?? 0,
    actualContributionsTotal: raw.actualContributionsTotal ?? 0,
    availableGroupFunds: raw.availableGroupFunds ?? 0,
    pendingSpecialApprovals: raw.pendingSpecialApprovals ?? 0,
    totalLoanPrincipal:
      raw.totalLoanPrincipal != null ? raw.totalLoanPrincipal : undefined,
    outstandingLoanPrincipal:
      raw.outstandingLoanPrincipal != null ? raw.outstandingLoanPrincipal : undefined,
    loanInterestEarned:
      raw.loanInterestEarned != null ? raw.loanInterestEarned : undefined,
    overdueLoansCount:
      raw.overdueLoansCount != null ? Number(raw.overdueLoansCount) : undefined,
    totalFines: raw.totalFines != null ? raw.totalFines : undefined,
    unpaidFines: raw.unpaidFines != null ? raw.unpaidFines : undefined,
    paidFines: raw.paidFines != null ? raw.paidFines : undefined,
    approvedFineIncome:
      raw.approvedFineIncome != null ? raw.approvedFineIncome : undefined,
    pendingFinePayments:
      raw.pendingFinePayments != null ? Number(raw.pendingFinePayments) : undefined,
    membersWithFines:
      raw.membersWithFines != null ? Number(raw.membersWithFines) : undefined,
    approvedFinePayments:
      raw.approvedFinePayments != null ? Number(raw.approvedFinePayments) : undefined,
    rejectedFinePayments:
      raw.rejectedFinePayments != null ? Number(raw.rejectedFinePayments) : undefined,
    socialFundBalance:
      raw.socialFundBalance != null ? raw.socialFundBalance : undefined,
    socialContributionsTotal:
      raw.socialContributionsTotal != null ? raw.socialContributionsTotal : undefined,
    socialDisbursementsTotal:
      raw.socialDisbursementsTotal != null ? raw.socialDisbursementsTotal : undefined,
    pendingSocialApprovals:
      raw.pendingSocialApprovals != null ? Number(raw.pendingSocialApprovals) : undefined,
    activeInvestmentsCount:
      raw.activeInvestmentsCount != null ? Number(raw.activeInvestmentsCount) : undefined,
    investmentCapital:
      raw.investmentCapital != null ? raw.investmentCapital : undefined,
    investmentProfits:
      raw.investmentProfits != null ? raw.investmentProfits : undefined,
    otherIncomeTotal: raw.otherIncomeTotal != null ? raw.otherIncomeTotal : undefined,
    generalExpensesTotal:
      raw.generalExpensesTotal != null ? raw.generalExpensesTotal : undefined,
    interestExpensesTotal:
      raw.interestExpensesTotal != null ? raw.interestExpensesTotal : undefined,
    availableInterest:
      raw.availableInterest != null ? raw.availableInterest : undefined,
    pendingPayoutsCount:
      raw.pendingPayoutsCount != null ? Number(raw.pendingPayoutsCount) : undefined,
    totalConfirmedPayouts:
      raw.totalConfirmedPayouts != null ? raw.totalConfirmedPayouts : undefined,
    currency: raw.currency || 'RWF',
  }
}

export function mapMonthlyContributionChartPoint(
  raw: MonthlyContributionChartPoint,
): MonthlyContributionChartPoint {
  return {
    month: Number(raw.month),
    totalPaid: raw.totalPaid ?? 0,
  }
}
