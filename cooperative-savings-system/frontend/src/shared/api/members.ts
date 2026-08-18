import { apiClient } from './client'
import { unwrapApiData } from './auth'
import type { ApiResponse, PageQuery, PageResponse } from '@/shared/types/api'
import type {
  Member,
  MemberCreateRequest,
  MemberFinancialSummary,
  MemberStatusUpdateRequest,
  MemberUpdateRequest,
} from '@/shared/types/member'
import { mapMember } from '@/shared/types/member'

function toParams(query: PageQuery = {}) {
  const params: Record<string, string | number> = {}
  if (query.q?.trim()) params.q = query.q.trim()
  if (query.status) params.status = query.status
  if (query.page != null) params.page = query.page
  if (query.size != null) params.size = query.size
  if (query.sort) params.sort = query.sort
  return params
}

export async function fetchMembers(
  cooperativeId: string,
  query: PageQuery = {},
): Promise<PageResponse<Member>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Member>>>(
    `/cooperatives/${cooperativeId}/members`,
    { params: toParams(query) },
  )
  const page = unwrapApiData(response.data)
  return {
    ...page,
    content: (page.content ?? []).map(mapMember),
  }
}

export async function fetchMember(cooperativeId: string, userId: string): Promise<Member> {
  const response = await apiClient.get<ApiResponse<Member>>(
    `/cooperatives/${cooperativeId}/members/${userId}`,
  )
  return mapMember(unwrapApiData(response.data))
}

export async function createMember(
  cooperativeId: string,
  payload: MemberCreateRequest,
): Promise<Member> {
  const response = await apiClient.post<ApiResponse<Member>>(
    `/cooperatives/${cooperativeId}/members`,
    payload,
  )
  return mapMember(unwrapApiData(response.data))
}

export async function updateMember(
  cooperativeId: string,
  userId: string,
  payload: MemberUpdateRequest,
): Promise<Member> {
  const response = await apiClient.put<ApiResponse<Member>>(
    `/cooperatives/${cooperativeId}/members/${userId}`,
    payload,
  )
  return mapMember(unwrapApiData(response.data))
}

export async function updateMemberStatus(
  cooperativeId: string,
  userId: string,
  payload: MemberStatusUpdateRequest,
): Promise<Member> {
  const response = await apiClient.patch<ApiResponse<Member>>(
    `/cooperatives/${cooperativeId}/members/${userId}/status`,
    payload,
  )
  return mapMember(unwrapApiData(response.data))
}

export async function uploadMemberProfileImage(
  cooperativeId: string,
  userId: string,
  file: File,
): Promise<Member> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<ApiResponse<Member>>(
    `/cooperatives/${cooperativeId}/members/${userId}/profile-image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return mapMember(unwrapApiData(response.data))
}

export async function fetchMemberFinancialSummary(
  cooperativeId: string,
  userId: string,
): Promise<MemberFinancialSummary> {
  const response = await apiClient.get<ApiResponse<MemberFinancialSummary>>(
    `/cooperatives/${cooperativeId}/members/${userId}/financial-summary`,
  )
  return unwrapApiData(response.data)
}

/** Paged, searchable financial summaries for every member — used on the admin dashboard. */
export async function fetchMemberFinancialSummaries(
  cooperativeId: string,
  query: { q?: string; page?: number; size?: number } = {},
): Promise<PageResponse<MemberFinancialSummary>> {
  const params: Record<string, string | number> = {}
  if (query.q?.trim()) params.q = query.q.trim()
  if (query.page != null) params.page = query.page
  if (query.size != null) params.size = query.size
  const response = await apiClient.get<ApiResponse<PageResponse<MemberFinancialSummary>>>(
    `/cooperatives/${cooperativeId}/members/financial-summaries`,
    { params },
  )
  return unwrapApiData(response.data)
}
