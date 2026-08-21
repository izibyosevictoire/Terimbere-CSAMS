import type { ApprovalEvent } from './approval'
import { mapApprovalEvent } from './approval'

export type LoanStatus =
  | 'PENDING'
  | 'AWAITING_SECOND_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'REJECTED'
  | 'CLOSED'
  | 'WRITTEN_OFF'

export type InterestType = 'FLAT' | 'REDUCING'

export const LOAN_STATUSES: LoanStatus[] = [
  'PENDING',
  'AWAITING_SECOND_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'OVERDUE',
  'REJECTED',
  'CLOSED',
  'WRITTEN_OFF',
]

export const INTEREST_TYPES: InterestType[] = ['FLAT']

/** Display-only — REDUCING is blocked until business rule is confirmed. */
export const INTEREST_TYPES_DISPLAY: InterestType[] = ['FLAT', 'REDUCING']

export interface LoanSettings {
  id?: string
  cooperativeId?: string
  interestRatePercent: string | number
  interestType: InterestType | string
  maxLoanAmount?: string | number | null
  maxTermMonths?: number | null
  minMembershipMonths?: number | null
  allowMemberRequests: boolean
  lateFeeEnabled?: boolean
  currency?: string
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface LoanSettingsUpdateRequest {
  interestRatePercent: string | number
  interestType: InterestType | string
  maxLoanAmount?: string | number | null
  maxTermMonths?: number | null
  minMembershipMonths?: number | null
  allowMemberRequests: boolean
  lateFeeEnabled?: boolean
}

export interface LoanApplicationForm {
  cooperativeId?: string
  cooperativeName?: string | null
  currency?: string | null
  memberUserId?: string
  memberFullName?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
  nationalId?: string | null
  address?: string | null
  membershipDate?: string | null
  membershipStatus?: string | null
  roleInCooperative?: string | null
  requestedAmount?: string | number | null
  purpose?: string | null
  termMonths?: number | null
  interestRatePercent?: string | number | null
  interestType?: InterestType | string | null
  requestDate?: string | null
  submittedAt?: string | null
}

export interface Loan {
  id: string
  cooperativeId?: string
  memberUserId: string
  memberName?: string | null
  fullName?: string
  username?: string
  requestedAmount: string | number
  approvedAmount?: string | number | null
  principalAmount?: string | number | null
  interestRatePercent: string | number
  interestType: InterestType | string
  termMonths: number
  interestAmount?: string | number | null
  outstandingPrincipal?: string | number | null
  outstandingInterest?: string | number | null
  totalRepaidPrincipal?: string | number | null
  totalRepaidInterest?: string | number | null
  requestDate?: string | null
  approvalDate?: string | null
  disbursementDate?: string | null
  dueDate?: string | null
  status: LoanStatus | string
  purpose?: string | null
  notes?: string | null
  rejectionReason?: string | null
  requestedBy?: string | null
  approvedBy?: string | null
  disbursedBy?: string | null
  firstApprovedBy?: string | null
  firstApprovedAt?: string | null
  firstApproverRole?: string | null
  applicationForm?: LoanApplicationForm | null
  approvalHistory?: ApprovalEvent[]
  createdAt?: string
  updatedAt?: string
  version?: number
}

export interface LoanCreateRequest {
  /** Required when an admin issues a loan for another member. */
  memberUserId?: string
  amount: string | number
  termMonths?: number
  purpose?: string
  notes?: string
}

export interface LoanApproveRequest {
  approvedAmount?: string | number
  termMonths?: number
  dueDate?: string
}

export interface LoanRejectRequest {
  rejectionReason: string
}

export interface LoanRepayment {
  id: string
  loanId: string
  cooperativeId?: string
  memberUserId?: string
  paymentDate: string
  amountTotal: string | number
  principalPortion: string | number
  interestPortion: string | number
  paymentReference?: string | null
  notes?: string | null
  recordedBy?: string | null
  createdAt?: string
}

export interface LoanRepaymentCreateRequest {
  amount: string | number
  paymentDate?: string
  paymentReference?: string
  notes?: string
  allocateInterestFirst?: boolean
}

export interface LoanListQuery {
  q?: string
  status?: string
  memberUserId?: string
  pendingApproval?: boolean
  page?: number
  size?: number
  sort?: string
}

export function mapLoanSettings(raw: LoanSettings): LoanSettings {
  return {
    ...raw,
    id: raw.id != null ? String(raw.id) : undefined,
    cooperativeId: raw.cooperativeId != null ? String(raw.cooperativeId) : undefined,
    interestRatePercent: raw.interestRatePercent ?? 0,
    interestType: raw.interestType || 'FLAT',
    allowMemberRequests: Boolean(raw.allowMemberRequests),
    lateFeeEnabled: Boolean(raw.lateFeeEnabled),
  }
}

export function mapLoan(raw: Loan): Loan {
  return {
    ...raw,
    id: String(raw.id),
    memberUserId: String(raw.memberUserId),
    cooperativeId: raw.cooperativeId != null ? String(raw.cooperativeId) : undefined,
    fullName: raw.fullName || raw.memberName || undefined,
    requestedAmount: raw.requestedAmount ?? 0,
    termMonths: Number(raw.termMonths ?? 0),
    interestRatePercent: raw.interestRatePercent ?? 0,
    interestType: raw.interestType || 'FLAT',
    status: raw.status || 'PENDING',
    firstApprovedBy: raw.firstApprovedBy != null ? String(raw.firstApprovedBy) : null,
    approvalHistory: (raw.approvalHistory ?? []).map(mapApprovalEvent),
  }
}

export function mapLoanRepayment(raw: LoanRepayment): LoanRepayment {
  return {
    ...raw,
    id: String(raw.id),
    loanId: String(raw.loanId),
    cooperativeId: raw.cooperativeId != null ? String(raw.cooperativeId) : undefined,
    memberUserId: raw.memberUserId != null ? String(raw.memberUserId) : undefined,
    amountTotal: raw.amountTotal ?? 0,
    principalPortion: raw.principalPortion ?? 0,
    interestPortion: raw.interestPortion ?? 0,
  }
}

export function loanDisplayName(loan: Pick<Loan, 'fullName' | 'username' | 'memberUserId'>): string {
  return loan.fullName || loan.username || loan.memberUserId
}
