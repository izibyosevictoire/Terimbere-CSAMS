package rw.terimbere.csams.security;

import java.util.Locale;
import java.util.Set;
import rw.terimbere.csams.shared.exceptions.ForbiddenException;
import rw.terimbere.csams.shared.exceptions.ValidationException;

/**
 * Cooperative officer roles (Ikimina committee). Distinct from platform {@code SUPER_ADMIN}.
 *
 * <p>{@code COOPERATIVE_ADMIN} is a legacy alias for {@code PRESIDENT}.
 */
public final class CooperativeOfficerRoles {

    public static final String MEMBER = "MEMBER";
    public static final String PRESIDENT = "PRESIDENT";
    public static final String VICE_PRESIDENT = "VICE_PRESIDENT";
    public static final String SECRETARY = "SECRETARY";
    public static final String ACCOUNTANT = "ACCOUNTANT";
    public static final String LOAN_OFFICER = "LOAN_OFFICER";
    public static final String LEGACY_ADMIN = "COOPERATIVE_ADMIN";

    public static final String LOAN_APPROVE = "LOAN_APPROVE";
    public static final String FUND_AUTHORIZE = "FUND_AUTHORIZE";

    public static final Set<String> MEMBERSHIP_ROLES = Set.of(
            MEMBER, PRESIDENT, VICE_PRESIDENT, SECRETARY, ACCOUNTANT, LOAN_OFFICER, LEGACY_ADMIN);

    public static final Set<String> OFFICER_ROLE_CODES =
            Set.of(PRESIDENT, VICE_PRESIDENT, SECRETARY, ACCOUNTANT, LOAN_OFFICER, LEGACY_ADMIN);

    public static final Set<String> LEADERSHIP_ROLE_CODES =
            Set.of(PRESIDENT, VICE_PRESIDENT, LEGACY_ADMIN);

    private CooperativeOfficerRoles() {}

    public static String normalize(String roleInCooperative) {
        if (roleInCooperative == null || roleInCooperative.isBlank()) {
            return MEMBER;
        }
        String code = roleInCooperative.trim().toUpperCase(Locale.ROOT);
        if (LEGACY_ADMIN.equals(code)) {
            return PRESIDENT;
        }
        if (!MEMBERSHIP_ROLES.contains(code)) {
            throw new ValidationException(
                    "roleInCooperative must be MEMBER, PRESIDENT, VICE_PRESIDENT, SECRETARY, ACCOUNTANT, or LOAN_OFFICER");
        }
        return code;
    }

    public static String platformRole(String normalizedMembershipRole) {
        if (normalizedMembershipRole == null || MEMBER.equals(normalizedMembershipRole)) {
            return null;
        }
        return normalizedMembershipRole;
    }

    public static boolean isOfficerRoleCode(String roleCode) {
        return roleCode != null && OFFICER_ROLE_CODES.contains(roleCode);
    }

    public static boolean isLeadership(UserPrincipal principal) {
        if (principal == null) {
            return false;
        }
        if (principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)) {
            return true;
        }
        return LEADERSHIP_ROLE_CODES.stream().anyMatch(principal::hasRole);
    }

    public static boolean isOfficer(UserPrincipal principal) {
        if (principal == null) {
            return false;
        }
        if (principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)) {
            return true;
        }
        return OFFICER_ROLE_CODES.stream().anyMatch(principal::hasRole);
    }

    public static boolean canAssign(UserPrincipal actor, String normalizedTargetRole) {
        if (actor == null) {
            return false;
        }
        if (actor.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)) {
            return true;
        }
        if (MEMBER.equals(normalizedTargetRole)) {
            return actor.hasAuthority("MEMBERSHIP_MANAGE");
        }
        if (!isLeadership(actor)) {
            return false;
        }
        return !PRESIDENT.equals(normalizedTargetRole);
    }

    public static void requireLoanApprove(UserPrincipal principal) {
        if (principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)
                || principal.hasAuthority(LOAN_APPROVE)) {
            return;
        }
        throw new ForbiddenException("Loan committee approval is required");
    }

    public static void requireFundAuthorize(UserPrincipal principal) {
        if (principal.hasRole(CooperativeAuthorizationService.SUPER_ADMIN)
                || principal.hasAuthority(FUND_AUTHORIZE)) {
            return;
        }
        throw new ForbiddenException(
                "A President or Vice President must co-sign this fund movement");
    }
}
