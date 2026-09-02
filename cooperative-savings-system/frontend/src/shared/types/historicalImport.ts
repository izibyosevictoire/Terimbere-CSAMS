export type HistoricalImportStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'READY'
  | 'INVALID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'FAILED'

export interface HistoricalImportError {
  sheet?: string | null
  rowNumber?: number | null
  field?: string | null
  code?: string | null
  message?: string | null
}

export interface HistoricalImportSheetSummary {
  sheet: string
  totalRows: number
  validRows: number
  invalidRows: number
}

export interface HistoricalReconciliationSummary {
  currentAvailableFund?: string | number | null
  projectedCredits?: string | number | null
  projectedDebits?: string | number | null
  projectedOutstandingLoanPrincipal?: string | number | null
  projectedAvailableFund?: string | number | null
  projectedSocialContributions?: string | number | null
  projectedSocialDisbursements?: string | number | null
  projectedSocialBalance?: string | number | null
  projectedPayouts?: string | number | null
  blocked?: boolean
  warnings?: string[]
  errors?: string[]
}

export interface HistoricalImportPreview {
  importId: string
  status: HistoricalImportStatus | string
  originalFilename?: string | null
  fileHash?: string | null
  totalRows: number
  validRows: number
  invalidRows: number
  confirmAllowed: boolean
  sheets: HistoricalImportSheetSummary[]
  errors: HistoricalImportError[]
  reconciliation?: HistoricalReconciliationSummary | null
  errorSummary?: string | null
}

export interface HistoricalImportSummary {
  id: string
  cooperativeId: string
  originalFilename?: string | null
  fileHash?: string | null
  status: HistoricalImportStatus | string
  totalRows: number
  validRows: number
  invalidRows: number
  uploadedBy?: string | null
  createdAt?: string | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  errorSummary?: string | null
}

export interface HistoricalImportConfirm {
  importId: string
  status: HistoricalImportStatus | string
  membersImported: number
  contributionsImported: number
  specialCampaignsImported: number
  specialContributionsImported: number
  socialContributionsImported: number
  socialDisbursementsImported: number
  loansImported: number
  repaymentsImported: number
  finesImported: number
  finePaymentsImported: number
  investmentsImported: number
  investmentReturnsImported: number
  incomeImported: number
  expensesImported: number
  payoutsImported: number
  payoutLinesImported: number
  ledgerEntriesCreated: number
  reconciliation?: HistoricalReconciliationSummary | null
}

export function canCancelHistoricalImport(status?: string | null): boolean {
  return status === 'UPLOADED' || status === 'VALIDATING' || status === 'READY' || status === 'INVALID'
}

export function isHistoricalImportReady(preview: HistoricalImportPreview | null): boolean {
  if (!preview) return false
  return (
    preview.confirmAllowed &&
    preview.invalidRows === 0 &&
    preview.validRows > 0 &&
    preview.status === 'READY'
  )
}
