import type { ApprovalEvent } from './approval'
import { mapApprovalEvent } from './approval'

export type ContributionStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'WAIVED'
  | 'CANCELLED'

export type ContributionReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const CONTRIBUTION_REVIEW_STATUSES: ContributionReviewStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
]

export const CONTRIBUTION_STATUSES: ContributionStatus[] = [
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'WAIVED',
  'CANCELLED',
]

export interface ContributionPeriodLine {
  memberUserId: string
  fullName: string
  username: string
  expectedAmount: string | number
  paidAmount: string | number
  outstandingAmount: string | number
  status: ContributionStatus | string
  paymentDate?: string | null
  paymentReference?: string | null
  notes?: string | null
  contributionId?: string | null
}

export interface ContributionPeriodGrid {
  year: number
  month: number
  expectedAmountDefault?: string | number
  lines: ContributionPeriodLine[]
}

export interface ContributionLineSaveRequest {
  memberUserId: string
  paidAmount: string | number
  paymentDate?: string | null
  paymentReference?: string | null
  notes?: string | null
  status?: ContributionStatus | string | null
}

export interface ContributionPeriodSaveRequest {
  lines: ContributionLineSaveRequest[]
}

export interface Contribution {
  id: string
  cooperativeId?: string
  memberUserId: string
  fullName?: string
  username?: string
  year: number
  month: number
  shareCount?: number | null
  expectedAmount: string | number
  paidAmount: string | number
  outstandingAmount: string | number
  remainingAmount?: string | number | null
  status: ContributionStatus | string
  paymentDate?: string | null
  paymentReference?: string | null
  notes?: string | null
  recordedBy?: string | null
  memberName?: string | null
  submittedAmount?: string | number | null
  evidenceFileKey?: string | null
  submittedBy?: string | null
  submittedByName?: string | null
  submittedAt?: string | null
  reviewedBy?: string | null
  reviewedByName?: string | null
  reviewedAt?: string | null
  reviewStatus?: ContributionReviewStatus | string | null
  rejectionReason?: string | null
  approvalHistory?: ApprovalEvent[]
  createdAt?: string
  updatedAt?: string
}

export interface ContributionSubmitRequest {
  year?: number
  month?: number
  amount: string | number
  paymentDate: string
  paymentReference?: string
  evidenceFileKey?: string
  notes?: string
}

export interface ContributionPeriodPreview {
  contributionId?: string | null
  cooperativeId?: string
  memberUserId?: string
  year: number
  month: number
  shareCount: number
  requiredAmount: string | number
  paidAmount: string | number
  pendingSubmittedAmount?: string | number | null
  remainingAmount: string | number
  paymentDate?: string | null
  dueDate?: string | null
  status?: ContributionStatus | string | null
  reviewStatus?: ContributionReviewStatus | string | null
  awaitingReview?: boolean
  canSubmit?: boolean
}

export interface ContributionReviewRequest {
  rejectionReason: string
}

export interface ContributionUpdateRequest {
  paidAmount?: string | number
  paymentDate?: string | null
  paymentReference?: string | null
  notes?: string | null
  status?: ContributionStatus | string | null
}

export interface ContributionSummary {
  year?: number | null
  month?: number | null
  expectedTotal: string | number
  paidTotal: string | number
  outstandingTotal: string | number
  memberCount?: number
  paidCount?: number
  pendingCount?: number
}

export interface ContributionListQuery {
  q?: string
  status?: string
  year?: number
  month?: number
  memberUserId?: string
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
  sort?: string
}

export function mapContributionPeriodLine(raw: ContributionPeriodLine): ContributionPeriodLine {
  return {
    ...raw,
    memberUserId: String(raw.memberUserId),
    contributionId: raw.contributionId != null ? String(raw.contributionId) : null,
    expectedAmount: raw.expectedAmount ?? 0,
    paidAmount: raw.paidAmount ?? 0,
    outstandingAmount: raw.outstandingAmount ?? 0,
  }
}

export function mapContribution(raw: Contribution): Contribution {
  return {
    ...raw,
    id: String(raw.id),
    memberUserId: String(raw.memberUserId),
    cooperativeId: raw.cooperativeId != null ? String(raw.cooperativeId) : undefined,
    fullName: raw.fullName || raw.memberName || undefined,
    approvalHistory: (raw.approvalHistory ?? []).map(mapApprovalEvent),
  }
}
