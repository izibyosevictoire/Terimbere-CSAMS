import { apiClient } from './client'
import { unwrapApiData } from './auth'
import type { ApiResponse, PageResponse } from '@/shared/types/api'
import type {
  Contribution,
  ContributionListQuery,
  ContributionPeriodGrid,
  ContributionPeriodLine,
  ContributionPeriodSaveRequest,
  ContributionSummary,
  ContributionUpdateRequest,
} from '@/shared/types/contribution'
import {
  mapContribution,
  mapContributionPeriodLine,
} from '@/shared/types/contribution'

function toListParams(query: ContributionListQuery = {}) {
  const params: Record<string, string | number> = {}
  if (query.q?.trim()) params.q = query.q.trim()
  if (query.status) params.status = query.status
  if (query.year != null) params.year = query.year
  if (query.month != null) params.month = query.month
  if (query.memberUserId) params.memberUserId = query.memberUserId
  if (query.page != null) params.page = query.page
  if (query.size != null) params.size = query.size
  if (query.sort) params.sort = query.sort
  return params
}

export async function fetchContributionPeriod(
  cooperativeId: string,
  year: number,
  month: number,
): Promise<ContributionPeriodGrid> {
  const response = await apiClient.get<
    ApiResponse<ContributionPeriodGrid | ContributionPeriodLine[]>
  >(`/cooperatives/${cooperativeId}/contributions/period`, {
    params: { year, month },
  })
  const data = unwrapApiData(response.data)
  if (Array.isArray(data)) {
    return {
      year,
      month,
      lines: data.map(mapContributionPeriodLine),
    }
  }
  return {
    ...data,
    year: data.year ?? year,
    month: data.month ?? month,
    lines: (data.lines ?? []).map(mapContributionPeriodLine),
  }
}

export async function saveContributionPeriod(
  cooperativeId: string,
  year: number,
  month: number,
  payload: ContributionPeriodSaveRequest,
): Promise<ContributionPeriodGrid> {
  const response = await apiClient.put<
    ApiResponse<ContributionPeriodGrid | ContributionPeriodLine[]>
  >(`/cooperatives/${cooperativeId}/contributions/period`, payload, {
    params: { year, month },
  })
  const data = unwrapApiData(response.data)
  if (Array.isArray(data)) {
    return {
      year,
      month,
      lines: data.map(mapContributionPeriodLine),
    }
  }
  return {
    ...data,
    year: data.year ?? year,
    month: data.month ?? month,
    lines: (data.lines ?? []).map(mapContributionPeriodLine),
  }
}

export async function fetchContributions(
  cooperativeId: string,
  query: ContributionListQuery = {},
): Promise<PageResponse<Contribution>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Contribution>>>(
    `/cooperatives/${cooperativeId}/contributions`,
    { params: toListParams(query) },
  )
  const page = unwrapApiData(response.data)
  return {
    ...page,
    content: (page.content ?? []).map(mapContribution),
  }
}

export async function fetchMyContributions(
  cooperativeId: string,
  query: ContributionListQuery = {},
): Promise<PageResponse<Contribution>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Contribution>>>(
    `/cooperatives/${cooperativeId}/contributions/my`,
    { params: toListParams(query) },
  )
  const page = unwrapApiData(response.data)
  return {
    ...page,
    content: (page.content ?? []).map(mapContribution),
  }
}

export async function fetchContribution(
  cooperativeId: string,
  contributionId: string,
): Promise<Contribution> {
  const response = await apiClient.get<ApiResponse<Contribution>>(
    `/cooperatives/${cooperativeId}/contributions/${contributionId}`,
  )
  return mapContribution(unwrapApiData(response.data))
}

export async function updateContribution(
  cooperativeId: string,
  contributionId: string,
  payload: ContributionUpdateRequest,
): Promise<Contribution> {
  const response = await apiClient.patch<ApiResponse<Contribution>>(
    `/cooperatives/${cooperativeId}/contributions/${contributionId}`,
    payload,
  )
  return mapContribution(unwrapApiData(response.data))
}

export async function fetchContributionSummary(
  cooperativeId: string,
  year?: number,
  month?: number,
): Promise<ContributionSummary> {
  const params: Record<string, number> = {}
  if (year != null) params.year = year
  if (month != null) params.month = month
  const response = await apiClient.get<ApiResponse<ContributionSummary>>(
    `/cooperatives/${cooperativeId}/contributions/summary`,
    { params },
  )
  return unwrapApiData(response.data)
}
