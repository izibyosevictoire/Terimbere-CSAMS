package rw.terimbere.csams.configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import rw.terimbere.csams.modules.contribution.entity.Contribution;
import rw.terimbere.csams.modules.contribution.entity.ContributionStatus;
import rw.terimbere.csams.modules.contribution.repository.ContributionRepository;
import rw.terimbere.csams.modules.cooperative.entity.Cooperative;
import rw.terimbere.csams.modules.cooperative.entity.CooperativeStatus;
import rw.terimbere.csams.modules.cooperative.repository.CooperativeRepository;
import rw.terimbere.csams.modules.fine.entity.Fine;
import rw.terimbere.csams.modules.fine.entity.FineCalculationMode;
import rw.terimbere.csams.modules.fine.entity.FineSettings;
import rw.terimbere.csams.modules.fine.entity.FineStatus;
import rw.terimbere.csams.modules.fine.entity.FineType;
import rw.terimbere.csams.modules.fine.repository.FineRepository;
import rw.terimbere.csams.modules.fine.repository.FineSettingsRepository;
import rw.terimbere.csams.modules.ledger.service.LedgerService;
import rw.terimbere.csams.modules.loan.entity.InterestType;
import rw.terimbere.csams.modules.loan.entity.Loan;
import rw.terimbere.csams.modules.loan.entity.LoanSettings;
import rw.terimbere.csams.modules.loan.entity.LoanStatus;
import rw.terimbere.csams.modules.loan.repository.LoanRepository;
import rw.terimbere.csams.modules.loan.repository.LoanSettingsRepository;
import rw.terimbere.csams.modules.loan.service.LoanInterestCalculator;
import rw.terimbere.csams.modules.loanrepayment.entity.LoanRepayment;
import rw.terimbere.csams.modules.loanrepayment.repository.LoanRepaymentRepository;
import rw.terimbere.csams.modules.membership.entity.CooperativeMembership;
import rw.terimbere.csams.modules.membership.repository.CooperativeMembershipRepository;
import rw.terimbere.csams.modules.role.entity.Role;
import rw.terimbere.csams.modules.role.repository.RoleRepository;
import rw.terimbere.csams.modules.user.entity.AccountStatus;
import rw.terimbere.csams.modules.user.entity.User;
import rw.terimbere.csams.modules.user.repository.UserRepository;
import rw.terimbere.csams.shared.financial.LedgerTransactionType;
import rw.terimbere.csams.shared.utilities.MoneyUtils;

/**
 * Optional walkthrough data. Creates one DEMO cooperative and sample members/transactions.
 * Idempotent: skips when registration number {@value #DEMO_REGISTRATION} already exists.
 * Does not delete or block real cooperatives the operator creates afterwards.
 */
@Component
@Order(200)
@ConditionalOnProperty(name = "app.seed.demo-data", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_REGISTRATION = "DEMO-CSAMS-001";
    public static final String DEMO_PASSWORD = "Demo@123!";
    public static final String DEMO_ADMIN_USERNAME = "demo.admin";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final BigDecimal MONTHLY = new BigDecimal("5000.0000");
    private static final BigDecimal LOAN_PRINCIPAL = new BigDecimal("8000.0000");
    private static final BigDecimal RATE = new BigDecimal("10.0000");
    private static final BigDecimal FINE_AMOUNT = new BigDecimal("2000.0000");
    private static final BigDecimal REPAYMENT_TOTAL = new BigDecimal("1500.0000");

    private final CooperativeRepository cooperativeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CooperativeMembershipRepository membershipRepository;
    private final ContributionRepository contributionRepository;
    private final LoanRepository loanRepository;
    private final LoanSettingsRepository loanSettingsRepository;
    private final LoanRepaymentRepository loanRepaymentRepository;
    private final FineRepository fineRepository;
    private final FineSettingsRepository fineSettingsRepository;
    private final LedgerService ledgerService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (cooperativeRepository.existsByRegistrationNumberIgnoreCaseAndDeletedFalse(DEMO_REGISTRATION)) {
            log.info("Demo data already present (registration {}); skipping", DEMO_REGISTRATION);
            return;
        }

        Role memberRole = requireRole("MEMBER");
        Role presidentRole = requireRole("PRESIDENT");

        Cooperative coop = cooperativeRepository.save(Cooperative.builder()
                .name("DEMO — Umurenge Savings Group")
                .description(
                        "Sample cooperative for walking through TERIMBERE. Create your own cooperative for live data.")
                .registrationNumber(DEMO_REGISTRATION)
                .contactEmail("demo.coop@terimbere.local")
                .contactPhone("+250788000001")
                .address("Kigali, Rwanda")
                .currency("RWF")
                .financialYearStartMonth(1)
                .monthlyContributionAmount(MONTHLY)
                .contributionDueDay(5)
                .status(CooperativeStatus.ACTIVE)
                .registrationDate(LocalDate.now().minusYears(2))
                .build());

        User admin = saveUser(
                DEMO_ADMIN_USERNAME,
                "demo.admin@terimbere.local",
                "Demo",
                "Administrator",
                Set.of(memberRole, presidentRole));
        List<User> members = List.of(
                saveUser("demo.jean", "demo.jean@terimbere.local", "Jean", "Uwimana", Set.of(memberRole)),
                saveUser("demo.aline", "demo.aline@terimbere.local", "Aline", "Mukamana", Set.of(memberRole)),
                saveUser("demo.eric", "demo.eric@terimbere.local", "Eric", "Niyonzima", Set.of(memberRole)),
                saveUser(
                        "demo.claudine",
                        "demo.claudine@terimbere.local",
                        "Claudine",
                        "Ingabire",
                        Set.of(memberRole)));

        addMembership(coop.getId(), admin.getId(), "PRESIDENT");
        members.forEach(member -> addMembership(coop.getId(), member.getId(), "MEMBER"));

        if (!loanSettingsRepository.existsByCooperativeId(coop.getId())) {
            loanSettingsRepository.save(LoanSettings.builder()
                    .cooperativeId(coop.getId())
                    .interestRatePercent(RATE)
                    .interestType(InterestType.FLAT)
                    .maxLoanAmount(new BigDecimal("500000.0000"))
                    .maxTermMonths(12)
                    .minMembershipMonths(0)
                    .allowMemberRequests(true)
                    .currency("RWF")
                    .build());
        }
        if (!fineSettingsRepository.existsByCooperativeId(coop.getId())) {
            fineSettingsRepository.save(FineSettings.builder()
                    .cooperativeId(coop.getId())
                    .autoFinesEnabled(true)
                    .fineMode(FineCalculationMode.FIXED)
                    .baseFineAmount(FINE_AMOUNT)
                    .graceDays(3)
                    .currency("RWF")
                    .build());
        }

        LocalDate today = LocalDate.now();
        LocalDate previous = today.minusMonths(1);
        for (User member : members) {
            seedPaidContribution(coop, admin.getId(), member, previous.getYear(), previous.getMonthValue(), MONTHLY);
        }
        seedPaidContribution(coop, admin.getId(), members.get(0), today.getYear(), today.getMonthValue(), MONTHLY);
        seedPaidContribution(coop, admin.getId(), members.get(1), today.getYear(), today.getMonthValue(), MONTHLY);
        seedPaidContribution(coop, admin.getId(), members.get(2), today.getYear(), today.getMonthValue(), MONTHLY);
        seedPartialContribution(
                coop, admin.getId(), members.get(3), today.getYear(), today.getMonthValue(), MONTHLY, new BigDecimal("2000.0000"));

        seedActiveLoan(coop, admin.getId(), members.get(0), today);
        seedUnpaidFine(coop, admin.getId(), members.get(1), today);

        log.info(
                "Demo data seeded. Cooperative '{}' ({}). Logins: {} / {} and demo.jean|demo.aline|demo.eric|demo.claudine / {}",
                coop.getName(),
                DEMO_REGISTRATION,
                DEMO_ADMIN_USERNAME,
                DEMO_PASSWORD,
                DEMO_PASSWORD);
    }

    private User saveUser(String username, String email, String firstName, String lastName, Set<Role> roles) {
        return userRepository
                .findByUsernameIgnoreCaseAndDeletedFalse(username)
                .orElseGet(() -> userRepository.save(User.builder()
                        .username(username)
                        .email(email)
                        .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                        .firstName(firstName)
                        .lastName(lastName)
                        .accountStatus(AccountStatus.ACTIVE)
                        .failedLoginAttempts(0)
                        .roles(new HashSet<>(roles))
                        .build()));
    }

    private void addMembership(UUID cooperativeId, UUID userId, String roleInCooperative) {
        membershipRepository.save(CooperativeMembership.builder()
                .userId(userId)
                .cooperativeId(cooperativeId)
                .membershipStatus("ACTIVE")
                .membershipDate(LocalDate.now().minusYears(1))
                .roleInCooperative(roleInCooperative)
                .build());
    }

    private void seedPaidContribution(
            Cooperative coop, UUID recordedBy, User member, int year, int month, BigDecimal amount) {
        seedContribution(coop, recordedBy, member, year, month, amount, amount, ContributionStatus.PAID);
    }

    private void seedPartialContribution(
            Cooperative coop,
            UUID recordedBy,
            User member,
            int year,
            int month,
            BigDecimal expected,
            BigDecimal paid) {
        seedContribution(coop, recordedBy, member, year, month, expected, paid, ContributionStatus.PARTIALLY_PAID);
    }

    private void seedContribution(
            Cooperative coop,
            UUID recordedBy,
            User member,
            int year,
            int month,
            BigDecimal expected,
            BigDecimal paid,
            ContributionStatus status) {
        if (contributionRepository.existsByCooperativeIdAndMemberUserIdAndYearAndMonth(
                coop.getId(), member.getId(), year, month)) {
            return;
        }
        BigDecimal scaledExpected = MoneyUtils.scaleForStorage(expected);
        BigDecimal scaledPaid = MoneyUtils.scaleForStorage(paid);
        Contribution contribution = contributionRepository.save(Contribution.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .year(year)
                .month(month)
                .expectedAmount(scaledExpected)
                .paidAmount(scaledPaid)
                .outstandingAmount(MoneyUtils.scaleForStorage(scaledExpected.subtract(scaledPaid).max(BigDecimal.ZERO)))
                .paymentDate(LocalDate.of(year, month, Math.min(10, 28)))
                .status(status)
                .paymentReference("DEMO-" + year + "-" + month)
                .notes("Sample contribution")
                .recordedBy(recordedBy)
                .ledgerRevision(1)
                .build());

        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .transactionType(LedgerTransactionType.REGULAR_CONTRIBUTION)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(scaledPaid)
                .currency(coop.getCurrency())
                .transactionDate(contribution.getPaymentDate())
                .reference(contribution.getPaymentReference())
                .sourceEntityType(LedgerService.SOURCE_CONTRIBUTION)
                .sourceEntityId(contribution.getId())
                .description("Demo regular contribution " + year + "-" + String.format("%02d", month))
                .recordedBy(recordedBy)
                .approvedBy(recordedBy)
                .idempotencyKey(LedgerService.contributionKey(
                        contribution.getId(), LedgerTransactionType.REGULAR_CONTRIBUTION, 1))
                .build());
    }

    private void seedActiveLoan(Cooperative coop, UUID actorId, User member, LocalDate today) {
        BigDecimal principal = MoneyUtils.scaleForStorage(LOAN_PRINCIPAL);
        BigDecimal interest = LoanInterestCalculator.computeInterest(principal, RATE, InterestType.FLAT);
        LocalDate disbursed = today.minusDays(20);

        Loan loan = loanRepository.save(Loan.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .requestedAmount(principal)
                .approvedAmount(principal)
                .principalAmount(principal)
                .interestRatePercent(RATE)
                .interestType(InterestType.FLAT)
                .termMonths(6)
                .interestAmount(interest)
                .outstandingPrincipal(MoneyUtils.scaleForStorage(principal.subtract(new BigDecimal("700.0000"))))
                .outstandingInterest(BigDecimal.ZERO)
                .totalRepaidPrincipal(MoneyUtils.scaleForStorage(new BigDecimal("700.0000")))
                .totalRepaidInterest(interest)
                .requestDate(disbursed.minusDays(5))
                .approvalDate(disbursed.minusDays(3))
                .disbursementDate(disbursed)
                .dueDate(disbursed.plusMonths(6))
                .status(LoanStatus.ACTIVE)
                .purpose("Demo: school fees")
                .requestedBy(member.getId())
                .approvedBy(actorId)
                .disbursedBy(actorId)
                .build());

        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .transactionType(LedgerTransactionType.LOAN_DISBURSEMENT)
                .debitAmount(principal)
                .creditAmount(BigDecimal.ZERO)
                .currency(coop.getCurrency())
                .transactionDate(disbursed)
                .reference("DEMO-LOAN")
                .sourceEntityType(LedgerService.SOURCE_LOAN)
                .sourceEntityId(loan.getId())
                .description("Demo loan disbursement")
                .recordedBy(actorId)
                .approvedBy(actorId)
                .idempotencyKey(LedgerService.loanDisbursementKey(loan.getId()))
                .build());

        BigDecimal interestPaid = interest;
        BigDecimal principalPaid = MoneyUtils.scaleForStorage(REPAYMENT_TOTAL.subtract(interestPaid));
        LoanRepayment repayment = loanRepaymentRepository.save(LoanRepayment.builder()
                .loanId(loan.getId())
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .paymentDate(today.minusDays(5))
                .amountTotal(MoneyUtils.scaleForStorage(REPAYMENT_TOTAL))
                .principalPortion(principalPaid)
                .interestPortion(interestPaid)
                .paymentReference("DEMO-REPAY-1")
                .notes("Sample first repayment")
                .recordedBy(actorId)
                .build());

        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .transactionType(LedgerTransactionType.LOAN_INTEREST_PAYMENT)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(interestPaid)
                .currency(coop.getCurrency())
                .transactionDate(repayment.getPaymentDate())
                .reference(repayment.getPaymentReference())
                .sourceEntityType(LedgerService.SOURCE_LOAN_REPAYMENT)
                .sourceEntityId(repayment.getId())
                .description("Demo loan interest repayment")
                .recordedBy(actorId)
                .approvedBy(actorId)
                .idempotencyKey(LedgerService.loanInterestRepaymentKey(repayment.getId()))
                .build());
        ledgerService.appendApproved(LedgerService.AppendRequest.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .transactionType(LedgerTransactionType.LOAN_PRINCIPAL_REPAYMENT)
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(principalPaid)
                .currency(coop.getCurrency())
                .transactionDate(repayment.getPaymentDate())
                .reference(repayment.getPaymentReference())
                .sourceEntityType(LedgerService.SOURCE_LOAN_REPAYMENT)
                .sourceEntityId(repayment.getId())
                .description("Demo loan principal repayment")
                .recordedBy(actorId)
                .approvedBy(actorId)
                .idempotencyKey(LedgerService.loanPrincipalRepaymentKey(repayment.getId()))
                .build());
    }

    private void seedUnpaidFine(Cooperative coop, UUID issuedBy, User member, LocalDate today) {
        BigDecimal amount = MoneyUtils.scaleForStorage(FINE_AMOUNT);
        fineRepository.save(Fine.builder()
                .cooperativeId(coop.getId())
                .memberUserId(member.getId())
                .fineType(FineType.MANUAL)
                .calculationMode(FineCalculationMode.FIXED)
                .baseAmount(amount)
                .totalAmount(amount)
                .paidAmount(BigDecimal.ZERO)
                .outstandingAmount(amount)
                .reason("Late contribution (sample)")
                .notes("Demo unpaid fine")
                .issuedDate(today.minusDays(7))
                .dueDate(today.plusDays(7))
                .status(FineStatus.UNPAID)
                .issuedBy(issuedBy)
                .build());
    }

    private Role requireRole(String code) {
        return roleRepository
                .findByCode(code)
                .orElseThrow(() -> new IllegalStateException("Role missing: " + code));
    }
}
