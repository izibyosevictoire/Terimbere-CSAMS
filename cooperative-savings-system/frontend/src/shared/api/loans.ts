import { apiClient } from './client'
import { unwrapApiData } from './auth'
import type { ApiResponse, PageResponse } from '@/shared/types/api'
import type {
  Loan,
  LoanApproveRequest,
  LoanCreateRequest,
  LoanListQuery,
  LoanRejectRequest,
  LoanRepayment,
  LoanRepaymentCreateRequest,
} from '@/shared/types/loan'
import { mapLoan, mapLoanRepayment } from '@/shared/types/loan'

function toListParams(query: LoanListQuery = {}) {
  const params: Record<string, string | number> = {}
  if (query.q?.trim()) params.q = query.q.trim()
  if (query.status) params.status = query.status
  if (query.memberUserId) params.memberUserId = query.memberUserId
  if (query.page != null) params.page = query.page
  if (query.size != null) params.size = query.size
  if (query.sort) params.sort = query.sort
  return params
}

export async function fetchLoans(
  cooperativeId: string,
  query: LoanListQuery = {},
): Promise<PageResponse<Loan>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Loan>>>(
    `/cooperatives/${cooperativeId}/loans`,
    { params: toListParams(query) },
  )
  const page = unwrapApiData(response.data)
  return {
    ...page,
    content: (page.content ?? []).map(mapLoan),
  }
}

export async function fetchMyLoans(
  cooperativeId: string,
  query: LoanListQuery = {},
): Promise<PageResponse<Loan>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Loan>>>(
    `/cooperatives/${cooperativeId}/loans/my`,
    { params: toListParams(query) },
  )
  const page = unwrapApiData(response.data)
  return {
    ...page,
    content: (page.content ?? []).map(mapLoan),
  }
}

export async function fetchLoan(cooperativeId: string, loanId: string): Promise<Loan> {
  const response = await apiClient.get<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}`,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function createLoan(
  cooperativeId: string,
  payload: LoanCreateRequest,
): Promise<Loan> {
  const response = await apiClient.post<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans`,
    payload,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function approveLoan(
  cooperativeId: string,
  loanId: string,
  payload: LoanApproveRequest = {},
): Promise<Loan> {
  const response = await apiClient.post<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}/approve`,
    payload,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function rejectLoan(
  cooperativeId: string,
  loanId: string,
  payload: LoanRejectRequest,
): Promise<Loan> {
  const response = await apiClient.post<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}/reject`,
    payload,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function disburseLoan(cooperativeId: string, loanId: string): Promise<Loan> {
  const response = await apiClient.post<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}/disburse`,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function writeOffLoan(cooperativeId: string, loanId: string): Promise<Loan> {
  const response = await apiClient.post<ApiResponse<Loan>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}/write-off`,
  )
  return mapLoan(unwrapApiData(response.data))
}

export async function fetchLoanRepayments(
  cooperativeId: string,
  loanId: string,
): Promise<LoanRepayment[]> {
  const response = await apiClient.get<
    ApiResponse<LoanRepayment[] | PageResponse<LoanRepayment>>
  >(`/cooperatives/${cooperativeId}/loans/${loanId}/repayments`)
  const data = unwrapApiData(response.data)
  const list = Array.isArray(data) ? data : (data.content ?? [])
  return list.map(mapLoanRepayment)
}

export async function createLoanRepayment(
  cooperativeId: string,
  loanId: string,
  payload: LoanRepaymentCreateRequest,
): Promise<LoanRepayment> {
  const response = await apiClient.post<ApiResponse<LoanRepayment>>(
    `/cooperatives/${cooperativeId}/loans/${loanId}/repayments`,
    payload,
  )
  return mapLoanRepayment(unwrapApiData(response.data))
}
