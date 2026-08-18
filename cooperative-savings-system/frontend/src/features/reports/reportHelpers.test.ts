import { describe, expect, it } from 'vitest'
import { parseContentDispositionFilename } from '@/shared/utils/download'
import {
  canCancelImport,
  canConfirmImport,
  defaultExportFilename,
  importRowValidityColor,
  importRowValidityLabelKey,
  importStatusColor,
  importStatusLabelKey,
  reportSupportsMember,
  reportSupportsTransactionType,
  reportSupportsYearMonth,
  reportTypeLabelKey,
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
  it('slugifies report type', () => {
    expect(defaultExportFilename('SPECIAL_CONTRIBUTIONS')).toBe('special-contributions.xlsx')
  })
})
