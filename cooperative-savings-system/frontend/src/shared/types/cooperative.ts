export type CooperativeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export const COOPERATIVE_STATUSES: CooperativeStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'ARCHIVED',
]

/** Compact shape from GET /cooperatives/mine (selector). */
export interface CooperativeSummary {
  id: string
  name: string
  status: CooperativeStatus
  currency: string
  logoUrl?: string | null
}

export interface Cooperative {
  id: string
  name: string
  description?: string | null
  registrationNumber?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  currency: string
  financialYearStartMonth: number
  monthlyContributionAmount: string | number
  contributionDueDay: number
  registrationDate?: string | null
  status: CooperativeStatus
  logoUrl?: string | null
  logoFileKey?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CooperativeCreateRequest {
  name: string
  description?: string
  registrationNumber?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  currency: string
  financialYearStartMonth: number
  monthlyContributionAmount: string | number
  contributionDueDay: number
  registrationDate?: string
}

export type CooperativeUpdateRequest = CooperativeCreateRequest

export interface CooperativeStatusUpdateRequest {
  status: CooperativeStatus
}

export function mapCooperativeSummary(raw: CooperativeSummary): CooperativeSummary {
  return {
    id: String(raw.id),
    name: raw.name,
    status: raw.status,
    currency: raw.currency || 'RWF',
    logoUrl: raw.logoUrl ?? null,
  }
}
