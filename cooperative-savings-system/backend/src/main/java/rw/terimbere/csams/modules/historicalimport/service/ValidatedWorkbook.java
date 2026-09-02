package rw.terimbere.csams.modules.historicalimport.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;
import rw.terimbere.csams.modules.fine.entity.FineStatus;
import rw.terimbere.csams.modules.fine.entity.FineType;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportError;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalImportSheetSummary;
import rw.terimbere.csams.modules.historicalimport.dto.HistoricalReconciliationSummary;
import rw.terimbere.csams.modules.historicalimport.entity.HistoricalImportSheet;
import rw.terimbere.csams.modules.incomeexpense.entity.IncomeExpenseCategory;
import rw.terimbere.csams.modules.incomeexpense.entity.LedgerEffect;
import rw.terimbere.csams.modules.investment.entity.InvestmentStatus;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;
import rw.terimbere.csams.modules.payout.entity.PayoutLineStatus;
import rw.terimbere.csams.modules.payout.entity.PayoutRunStatus;
import rw.terimbere.csams.modules.specialcontribution.entity.SpecialCampaignStatus;

final class ValidatedWorkbook {

    final List<HistoricalImportError> errors = new ArrayList<>();
    final Map<HistoricalImportSheet, HistoricalImportSheetSummary> sheetSummaries =
            new LinkedHashMap<>();
    HistoricalReconciliationSummary reconciliation;

    final List<ValidatedRow<MemberDraft>> members = new ArrayList<>();
    final List<ValidatedRow<ContributionDraft>> contributions = new ArrayList<>();
    final List<ValidatedRow<CampaignDraft>> campaigns = new ArrayList<>();
    final List<ValidatedRow<SpecialDraft>> specialContributions = new ArrayList<>();
    final List<ValidatedRow<SocialContributionDraft>> socialContributions = new ArrayList<>();
    final List<ValidatedRow<SocialDisbursementDraft>> socialDisbursements = new ArrayList<>();
    final List<ValidatedRow<LoanDraft>> loans = new ArrayList<>();
    final List<ValidatedRow<RepaymentDraft>> repayments = new ArrayList<>();
    final List<ValidatedRow<FineDraft>> fines = new ArrayList<>();
    final List<ValidatedRow<FinePaymentDraft>> finePayments = new ArrayList<>();
    final List<ValidatedRow<InvestmentDraft>> investments = new ArrayList<>();
    final List<ValidatedRow<InvestmentReturnDraft>> investmentReturns = new ArrayList<>();
    final List<ValidatedRow<IncomeExpenseDraft>> income = new ArrayList<>();
    final List<ValidatedRow<IncomeExpenseDraft>> expenses = new ArrayList<>();
    final List<ValidatedRow<PayoutDraft>> payouts = new ArrayList<>();
    final List<ValidatedRow<PayoutLineDraft>> payoutLines = new ArrayList<>();

    boolean hasErrors() {
        return !errors.isEmpty();
    }

    int totalRows() {
        return members.size()
                + contributions.size()
                + campaigns.size()
                + specialContributions.size()
                + socialContributions.size()
                + socialDisbursements.size()
                + loans.size()
                + repayments.size()
                + fines.size()
                + finePayments.size()
                + investments.size()
                + investmentReturns.size()
                + income.size()
                + expenses.size()
                + payouts.size()
                + payoutLines.size();
    }

    int validRows() {
        return (int) allRows().stream().filter(ValidatedRow::valid).count();
    }

    int invalidRows() {
        return totalRows() - validRows();
    }

    List<ValidatedRow<?>> allRows() {
        List<ValidatedRow<?>> all = new ArrayList<>();
        all.addAll(members);
        all.addAll(contributions);
        all.addAll(campaigns);
        all.addAll(specialContributions);
        all.addAll(socialContributions);
        all.addAll(socialDisbursements);
        all.addAll(loans);
        all.addAll(repayments);
        all.addAll(fines);
        all.addAll(finePayments);
        all.addAll(investments);
        all.addAll(investmentReturns);
        all.addAll(income);
        all.addAll(expenses);
        all.addAll(payouts);
        all.addAll(payoutLines);
        return all;
    }

    record ValidatedRow<T>(
            HistoricalImportSheet sheet,
            int rowNumber,
            String sourceKey,
            String fingerprint,
            boolean valid,
            List<HistoricalImportError> errors,
            T draft) {}

    record MemberDraft(
            String username,
            String firstName,
            String lastName,
            String email,
            String phone,
            String nationalId,
            LocalDate membershipDate,
            int shareCount,
            String membershipStatus,
            String role,
            UUID existingUserId,
            boolean createUser) {}

    record ContributionDraft(
            String username,
            UUID memberUserId,
            int year,
            int month,
            BigDecimal expectedAmount,
            BigDecimal paidAmount,
            LocalDate paymentDate,
            String reference,
            String notes,
            ContributionStatus status) {}

    record CampaignDraft(
            String code,
            String name,
            String purpose,
            BigDecimal suggestedAmount,
            BigDecimal targetAmount,
            LocalDate startDate,
            LocalDate endDate,
            SpecialCampaignStatus status,
            UUID existingId) {}

    record SpecialDraft(
            String username,
            UUID memberUserId,
            String campaignCode,
            BigDecimal amount,
            LocalDate contributionDate,
            String reference,
            String notes) {}

    record SocialContributionDraft(
            String username,
            UUID memberUserId,
            BigDecimal amount,
            LocalDate contributionDate,
            String reference,
            String notes) {}

    record SocialDisbursementDraft(
            String username,
            UUID memberUserId,
            BigDecimal amount,
            LocalDate disbursementDate,
            String reason,
            String notes) {}

    record LoanDraft(
            String code,
            String username,
            UUID memberUserId,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            BigDecimal principalAmount,
            BigDecimal interestRatePercent,
            InterestType interestType,
            BigDecimal interestAmount,
            int termMonths,
            BigDecimal outstandingPrincipal,
            BigDecimal outstandingInterest,
            LocalDate requestDate,
            LocalDate approvalDate,
            LocalDate disbursementDate,
            LocalDate dueDate,
            LoanStatus status,
            String purpose,
            UUID existingId) {}

    record RepaymentDraft(
            String loanCode,
            String username,
            UUID memberUserId,
            BigDecimal amountTotal,
            BigDecimal principalPortion,
            BigDecimal interestPortion,
            LocalDate paymentDate,
            String reference,
            String notes) {}

    record FineDraft(
            String code,
            String username,
            UUID memberUserId,
            FineType fineType,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            LocalDate issuedDate,
            LocalDate dueDate,
            FineStatus status,
            String reason,
            UUID existingId) {}

    record FinePaymentDraft(
            String fineCode,
            String username,
            UUID memberUserId,
            BigDecimal amount,
            LocalDate paymentDate,
            String reference,
            String notes) {}

    record InvestmentDraft(
            String code,
            String name,
            BigDecimal amount,
            LocalDate investmentDate,
            BigDecimal expectedReturnAmount,
            LocalDate expectedReturnDate,
            BigDecimal remainingCapital,
            BigDecimal totalCapitalReturned,
            BigDecimal totalProfitReturned,
            InvestmentStatus status,
            String description,
            UUID existingId) {}

    record InvestmentReturnDraft(
            String investmentCode,
            LocalDate returnDate,
            BigDecimal capitalPortion,
            BigDecimal profitPortion,
            BigDecimal amountTotal,
            String reference,
            String notes) {}

    record IncomeExpenseDraft(
            LocalDate transactionDate,
            BigDecimal amount,
            IncomeExpenseCategory category,
            LedgerEffect ledgerEffect,
            String reference,
            String description,
            String notes,
            boolean income) {}

    record PayoutDraft(
            String code,
            String name,
            LocalDate periodFrom,
            LocalDate periodTo,
            LocalDate payoutDate,
            BigDecimal poolAmount,
            BigDecimal eligibleContributions,
            PayoutRunStatus status,
            String notes,
            UUID existingId) {}

    record PayoutLineDraft(
            String payoutCode,
            String username,
            UUID memberUserId,
            BigDecimal eligibleAmount,
            BigDecimal percentage,
            BigDecimal payoutAmount,
            PayoutLineStatus status) {}
}
