export type ContributionStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'WAIVED'
  | 'CANCELLED'

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
  expectedAmount: string | number
  paidAmount: string | number
  outstandingAmount: string | number
  status: ContributionStatus | string
  paymentDate?: string | null
  paymentReference?: string | null
  notes?: string | null
  recordedBy?: string | null
  createdAt?: string
  updatedAt?: string
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
  }
}
