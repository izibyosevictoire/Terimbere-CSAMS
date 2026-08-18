export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING'
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'PENDING' | 'SUSPENDED'
export type RoleInCooperative = 'MEMBER' | 'COOPERATIVE_ADMIN'

export const MEMBERSHIP_STATUSES: MembershipStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING',
]

export const ACCOUNT_STATUSES: AccountStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'LOCKED',
  'PENDING',
  'SUSPENDED',
]

export const ROLES_IN_COOPERATIVE: RoleInCooperative[] = ['MEMBER', 'COOPERATIVE_ADMIN']

export interface Member {
  userId: string
  membershipId?: string
  firstName: string
  lastName: string
  fullName?: string
  username: string
  email: string
  phone?: string | null
  nationalId?: string | null
  address?: string | null
  membershipDate?: string | null
  membershipStatus: MembershipStatus
  accountStatus: AccountStatus
  roleInCooperative: RoleInCooperative | string
  profileImageUrl?: string | null
  /** Returned only once on create when the server generated a password. */
  temporaryPassword?: string | null
  contributions?: unknown[]
  loans?: unknown[]
  fines?: unknown[]
  /** Phase 7 social fund history (contributions and/or disbursements). */
  social?: unknown[]
  socialFundHistory?: unknown[]
  socialContributions?: unknown[]
  payouts?: unknown[]
}

export interface MemberCreateRequest {
  firstName: string
  lastName: string
  username: string
  email: string
  phone?: string
  nationalId?: string
  address?: string
  membershipDate?: string
  temporaryPassword?: string
  roleInCooperative: RoleInCooperative
}

export interface MemberUpdateRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  nationalId?: string
  address?: string
  membershipDate?: string
  roleInCooperative?: RoleInCooperative
}

export interface MemberStatusUpdateRequest {
  accountStatus?: AccountStatus
  membershipStatus?: MembershipStatus
}

/** Backend-calculated member financial summary. */
export interface MemberFinancialSummary {
  cooperativeId?: string
  memberUserId?: string
  memberName?: string
  membershipStatus?: string
  membershipDate?: string | null
  currency?: string
  regularContributions?: string | number
  specialContributions?: string | number
  actualContributions?: string | number
  expectedContributions?: string | number
  outstandingContributions?: string | number
  loansReceived?: string | number
  outstandingLoanPrincipal?: string | number
  outstandingLoanInterest?: string | number
  totalLoanRepayments?: string | number
  totalFines?: string | number
  unpaidFines?: string | number
  approvedFinePayments?: string | number
  socialContributions?: string | number
  contributionPercentage?: string | number | null
  recentPayoutTotal?: string | number
}

export function memberDisplayName(member: Pick<Member, 'firstName' | 'lastName' | 'fullName'>): string {
  if (member.fullName?.trim()) return member.fullName.trim()
  return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
}

export function mapMember(raw: Member): Member {
  const userId = String(raw.userId)
  return {
    ...raw,
    userId,
    fullName: memberDisplayName(raw),
  }
}
