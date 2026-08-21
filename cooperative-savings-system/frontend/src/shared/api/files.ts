import { apiClient } from './client'
import { unwrapApiData } from './auth'

export type FileUploadCategory =
  | 'FINE_PAYMENT_EVIDENCE'
  | 'CONTRIBUTION_EVIDENCE'
  | 'SOCIAL_EVIDENCE'
  | 'INVESTMENT_DOCUMENT'
  | 'INCOME_EXPENSE_DOCUMENT'
  | 'GENERAL_DOCUMENT'

export interface StoredFileInfo {
  id: string
  cooperativeId?: string
  originalFilename: string
  storageKey: string
  contentType?: string
  sizeBytes?: number
  category?: string
  downloadUrl?: string
}

export async function uploadCooperativeFile(
  cooperativeId: string,
  file: File,
  category: FileUploadCategory,
): Promise<StoredFileInfo> {
  const form = new FormData()
  form.append('file', file)
  form.append('category', category)
  const { data } = await apiClient.post(
    `/cooperatives/${cooperativeId}/files`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return unwrapApiData<StoredFileInfo>(data)
}

export function fileDownloadPath(storageKey: string): string {
  const key = storageKey.replace(/^\/+/, '')
  return `/api/v1/files/${key}`
}
