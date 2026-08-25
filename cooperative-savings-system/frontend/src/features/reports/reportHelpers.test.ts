import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { parseContentDispositionFilename } from '@/shared/utils/download'
import {
  canCancelImport,
  canConfirmImport,
  defaultExportFilename,
  defaultReportFromDate,
  defaultReportToDate,
  importRowValidityColor,
  importRowValidityLabelKey,
  importStatusColor,
  importStatusLabelKey,
  reportSupportsMember,
  reportSupportsTransactionType,
  reportSupportsYearMonth,
  reportTypeLabelKey,
  validateReportTimeline,
  validateReportYearMonth,
} from './reportHelpers'

describe('parseContentDispositionFilename', () => {
  it('parses quoted filename', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="contributions-2026.xlsx"',
        'fallback.xlsx',
      ),
    ).toBe('contributions-2026.xlsx')
  })

  it('parses RFC 5987 filename*', () => {
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''members%20report.xlsx",
        'fallback.xlsx',
      ),
    ).toBe('members report.xlsx')
  })

  it('returns fallback when header missing', () => {
    expect(parseContentDispositionFilename(undefined, 'report.xlsx')).toBe('report.xlsx')
  })
})

describe('importRowValidityColor', () => {
  it('maps valid/invalid to chip colors', () => {
    expect(importRowValidityColor(true)).toBe('success')
    expect(importRowValidityColor(false)).toBe('error')
  })
})

describe('importRowValidityLabelKey', () => {
  it('builds i18n keys', () => {
    expect(importRowValidityLabelKey(true)).toBe('reports.import.rowValid')
    expect(importRowValidityLabelKey(false)).toBe('reports.import.rowInvalid')
  })
})

describe('importStatusColor', () => {
  it('maps known statuses', () => {
    expect(importStatusColor('VALIDATED')).toBe('warning')
    expect(importStatusColor('CONFIRMED')).toBe('success')
    expect(importStatusColor('FAILED')).toBe('error')
  })
})

describe('importStatusLabelKey', () => {
  it('builds i18n key', () => {
    expect(importStatusLabelKey('CONFIRMED')).toBe('reports.import.status.CONFIRMED')
  })
})

describe('canConfirmImport', () => {
  it('requires admin and valid rows on preview statuses', () => {
    expect(canConfirmImport('VALIDATED', 3, true)).toBe(true)
    expect(canConfirmImport('VALIDATED', 0, true)).toBe(false)
    expect(canConfirmImport('VALIDATED', 3, false)).toBe(false)
    expect(canConfirmImport('CONFIRMED', 3, true)).toBe(false)
  })
})

describe('canCancelImport', () => {
  it('allows admin before confirm', () => {
    expect(canCancelImport('UPLOADED', true)).toBe(true)
    expect(canCancelImport('VALIDATED', true)).toBe(true)
    expect(canCancelImport('CONFIRMED', true)).toBe(false)
    expect(canCancelImport('VALIDATED', false)).toBe(false)
  })
})

describe('report filter helpers', () => {
  it('detects year/month and ledger filters', () => {
    expect(reportSupportsYearMonth('CONTRIBUTIONS')).toBe(true)
    expect(reportSupportsYearMonth('MEMBERS')).toBe(false)
    expect(reportSupportsMember('LOANS')).toBe(true)
    expect(reportSupportsTransactionType('FINANCIAL_LEDGER')).toBe(true)
  })
})

describe('reportTypeLabelKey', () => {
  it('builds i18n key', () => {
    expect(reportTypeLabelKey('MEMBERS')).toBe('reports.types.MEMBERS')
  })
})

describe('defaultExportFilename', () => {
  it('slugifies report type as pdf', () => {
    expect(defaultExportFilename('SPECIAL_CONTRIBUTIONS')).toBe('special-contributions.pdf')
  })
})

describe('report timeline validation', () => {
  const today = dayjs('2026-08-20')

  it('defaults from start of year to today', () => {
    expect(defaultReportFromDate(today)).toBe('2026-01-01')
    expect(defaultReportToDate(today)).toBe('2026-08-20')
  })

  it('requires both dates', () => {
    expect(validateReportTimeline('', '', today)).toBe('required')
    expect(validateReportTimeline('2026-01-01', '', today)).toBe('required')
  })

  it('rejects future dates and inverted ranges', () => {
    expect(validateReportTimeline('2026-08-21', '2026-08-21', today)).toBe('futureFrom')
    expect(validateReportTimeline('2026-01-01', '2026-08-21', today)).toBe('futureTo')
    expect(validateReportTimeline('2026-08-20', '2026-01-01', today)).toBe('fromAfterTo')
  })

  it('rejects ranges longer than five years', () => {
    expect(validateReportTimeline('2020-01-01', '2026-01-02', today)).toBe('rangeTooLong')
  })

  it('accepts a valid past range', () => {
    expect(validateReportTimeline('2026-01-01', '2026-08-20', today)).toBeNull()
  })

  it('rejects a start date before cooperative registration', () => {
    expect(validateReportTimeline('2026-01-01', '2026-08-20', today, '2026-03-01')).toBe(
      'beforeRegistration',
    )
  })

  it('defaults from registration date when that is after Jan 1', () => {
    expect(defaultReportFromDate(today, '2026-03-15')).toBe('2026-03-15')
  })

  it('rejects incomplete or future year/month filters', () => {
    expect(validateReportYearMonth('2026', '', today)).toBe('incompleteYearMonth')
    expect(validateReportYearMonth('2026', '9', today)).toBe('futureYearMonth')
    expect(validateReportYearMonth('2026', '8', today)).toBeNull()
    expect(validateReportYearMonth('', '', today)).toBeNull()
  })
})
