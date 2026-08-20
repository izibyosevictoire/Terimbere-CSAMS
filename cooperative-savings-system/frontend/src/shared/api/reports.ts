import { apiClient } from './client'
import { unwrapApiData } from './auth'
import type { ApiResponse } from '@/shared/types/api'
import {
  mapReportTypeInfo,
  type ReportExportRequest,
  type ReportTypeInfo,
} from '@/shared/types/report'
import {
  parseContentDispositionFilename,
  throwIfBlobError,
  triggerBlobDownload,
} from '@/shared/utils/download'

function toExportBody(payload: ReportExportRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    reportType: payload.reportType,
  }
  if (payload.fromDate) body.fromDate = payload.fromDate
  if (payload.toDate) body.toDate = payload.toDate
  if (payload.memberUserId) body.memberUserId = payload.memberUserId
  if (payload.status) body.status = payload.status
  if (payload.transactionType) body.transactionType = payload.transactionType
  if (payload.year != null) body.year = payload.year
  if (payload.month != null) body.month = payload.month
  return body
}

export async function fetchReportTypes(cooperativeId: string): Promise<ReportTypeInfo[]> {
  const response = await apiClient.get<
    ApiResponse<ReportTypeInfo[] | { types?: ReportTypeInfo[]; content?: ReportTypeInfo[] } | string[]>
  >(`/cooperatives/${cooperativeId}/reports/types`)
  const data = unwrapApiData(response.data)
  const list = Array.isArray(data)
    ? data
    : (data.types ?? data.content ?? [])
  return list.map(mapReportTypeInfo)
}

export async function exportReport(
  cooperativeId: string,
  payload: ReportExportRequest,
  fallbackFilename = 'report.pdf',
): Promise<{ filename: string }> {
  const response = await apiClient.post(
    `/cooperatives/${cooperativeId}/reports/export`,
    toExportBody(payload),
    { responseType: 'blob' },
  )
  const blob = response.data as Blob
  await throwIfBlobError(blob, 'Report export failed')
  const filename = parseContentDispositionFilename(
    response.headers['content-disposition'] as string | undefined,
    fallbackFilename,
  )
  triggerBlobDownload(blob, filename)
  return { filename }
}
