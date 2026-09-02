import { describe, expect, it } from 'vitest'
import {
  canCancelHistoricalImport,
  isHistoricalImportReady,
  type HistoricalImportPreview,
} from './historicalImport'

function preview(overrides: Partial<HistoricalImportPreview> = {}): HistoricalImportPreview {
  return {
    importId: 'imp-1',
    status: 'READY',
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
    confirmAllowed: true,
    sheets: [],
    errors: [],
    ...overrides,
  }
}

describe('historical import helpers', () => {
  it('allows cancel only before confirm', () => {
    expect(canCancelHistoricalImport('READY')).toBe(true)
    expect(canCancelHistoricalImport('INVALID')).toBe(true)
    expect(canCancelHistoricalImport('CONFIRMED')).toBe(false)
    expect(canCancelHistoricalImport('FAILED')).toBe(false)
  })

  it('enables confirm only for a fully valid READY preview', () => {
    expect(isHistoricalImportReady(preview())).toBe(true)
    expect(isHistoricalImportReady(preview({ invalidRows: 1, confirmAllowed: false, status: 'INVALID' }))).toBe(
      false,
    )
    expect(isHistoricalImportReady(preview({ totalRows: 0, validRows: 0, confirmAllowed: false }))).toBe(false)
    expect(isHistoricalImportReady(preview({ reportReady: false }))).toBe(false)
    expect(isHistoricalImportReady(null)).toBe(false)
  })
})
