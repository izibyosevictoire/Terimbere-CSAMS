import dayjs from 'dayjs'
import type { ContributionImportStatus } from '@/shared/types/contributionImport'
import type { ReportTypeInfo } from '@/shared/types/report'

export type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning'

const YEAR_MONTH_TYPES = new Set([
  'CONTRIBUTIONS',
  'SPECIAL_CONTRIBUTIONS',
  'PAYOUTS',
  'SOCIAL_FUND',
])

const MEMBER_TYPES = new Set([
  'CONTRIBUTIONS',
  'SPECIAL_CONTRIBUTIONS',
  'LOANS',
  'REPAYMENTS',
  'FINES',
  'FINE_PAYMENTS',
  'PAYOUTS',
  'FINANCIAL_LEDGER',
  'AUDIT_LOGS',
])

const STATUS_TYPES = new Set([
  'CONTRIBUTIONS',
  'SPECIAL_CONTRIBUTIONS',
  'LOANS',
  'FINES',
  'INVESTMENTS',
  'INCOME',
  'EXPENSES',
  'PAYOUTS',
])

const TRANSACTION_TYPE_TYPES = new Set(['FINANCIAL_LEDGER', 'FULL_FINANCIAL'])

const NO_DATE_RANGE_TYPES = new Set(['MEMBERS'])

export function reportTypeLabelKey(type: string): string {
  return `reports.types.${type}`
}

export function reportSupportsFromTo(
  type: string,
  meta?: ReportTypeInfo | null,
): boolean {
  if (meta?.supportsFromDate != null || meta?.supportsToDate != null) {
    return Boolean(meta.supportsFromDate ?? meta.supportsToDate)
  }
  return !NO_DATE_RANGE_TYPES.has(type)
}

export function reportSupportsMember(
  type: string,
  meta?: ReportTypeInfo | null,
): boolean {
  if (meta?.supportsMember != null) return meta.supportsMember
  return MEMBER_TYPES.has(type)
}

export function reportSupportsStatus(
  type: string,
  meta?: ReportTypeInfo | null,
): boolean {
  if (meta?.supportsStatus != null) return meta.supportsStatus
  return STATUS_TYPES.has(type)
}

export function reportSupportsYearMonth(
  type: string,
  meta?: ReportTypeInfo | null,
): boolean {
  if (meta?.supportsYearMonth != null) return meta.supportsYearMonth
  return YEAR_MONTH_TYPES.has(type)
}

export function reportSupportsTransactionType(
  type: string,
  meta?: ReportTypeInfo | null,
): boolean {
  if (meta?.supportsTransactionType != null) return meta.supportsTransactionType
  return TRANSACTION_TYPE_TYPES.has(type)
}

export function importRowValidityColor(valid: boolean): ChipColor {
  return valid ? 'success' : 'error'
}

export function importRowValidityLabelKey(valid: boolean): string {
  return valid ? 'reports.import.rowValid' : 'reports.import.rowInvalid'
}

export function importStatusColor(status: string): ChipColor {
  switch (status) {
    case 'UPLOADED':
      return 'info'
    case 'VALIDATED':
      return 'warning'
    case 'CONFIRMED':
      return 'success'
    case 'CANCELLED':
      return 'secondary'
    case 'FAILED':
      return 'error'
    default:
      return 'default'
  }
}

export function importStatusLabelKey(status: string): string {
  return `reports.import.status.${status}`
}

export function canConfirmImport(
  status: ContributionImportStatus | string | undefined,
  validCount: number,
  isAdmin: boolean,
): boolean {
  if (!isAdmin || validCount <= 0) return false
  return status === 'UPLOADED' || status === 'VALIDATED' || status == null
}

export function canCancelImport(
  status: ContributionImportStatus | string | undefined,
  isAdmin: boolean,
): boolean {
  if (!isAdmin) return false
  return status === 'UPLOADED' || status === 'VALIDATED' || status == null
}

export function defaultExportFilename(reportType: string): string {
  const safe = reportType
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${safe || 'report'}.pdf`
}

export type ReportTimelineIssue =
  | 'required'
  | 'fromAfterTo'
  | 'futureFrom'
  | 'futureTo'
  | 'rangeTooLong'
  | 'beforeRegistration'
  | 'incompleteYearMonth'
  | 'futureYearMonth'

const MAX_RANGE_YEARS = 5

export function defaultReportFromDate(today = dayjs(), registrationDate?: string | null): string {
  const startOfYear = today.startOf('year')
  if (registrationDate) {
    const registered = dayjs(registrationDate)
    if (registered.isValid() && startOfYear.isBefore(registered, 'day')) {
      return registered.format('YYYY-MM-DD')
    }
  }
  return startOfYear.format('YYYY-MM-DD')
}

export function defaultReportToDate(today = dayjs()): string {
  return today.format('YYYY-MM-DD')
}

export function validateReportTimeline(
  fromDate: string,
  toDate: string,
  today = dayjs(),
  registrationDate?: string | null,
): ReportTimelineIssue | null {
  if (!fromDate || !toDate) return 'required'
  const from = dayjs(fromDate)
  const to = dayjs(toDate)
  if (!from.isValid() || !to.isValid()) return 'required'
  const todayDate = today.startOf('day')
  if (from.isAfter(todayDate, 'day')) return 'futureFrom'
  if (to.isAfter(todayDate, 'day')) return 'futureTo'
  if (to.isBefore(from, 'day')) return 'fromAfterTo'
  if (to.diff(from, 'year', true) > MAX_RANGE_YEARS) return 'rangeTooLong'
  if (registrationDate) {
    const registered = dayjs(registrationDate)
    if (registered.isValid() && from.isBefore(registered, 'day')) return 'beforeRegistration'
  }
  return null
}

export function validateReportYearMonth(
  year: string,
  month: string,
  today = dayjs(),
): ReportTimelineIssue | null {
  if (!year && !month) return null
  if (!year || !month) return 'incompleteYearMonth'
  const selected = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  if (!selected.isValid()) return 'incompleteYearMonth'
  if (selected.isAfter(today, 'month')) return 'futureYearMonth'
  return null
}
