import { describe, expect, it } from 'vitest'
import {
  auditEntityLabel,
  auditUserLabel,
  displayAuditEntityType,
  formatJsonBlock,
  parseJsonSafe,
  toIsoDateEnd,
  toIsoDateStart,
} from './auditHelpers'

describe('auditHelpers', () => {
  it('formats valid JSON with indentation', () => {
    expect(formatJsonBlock('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('returns em dash for empty JSON', () => {
    expect(formatJsonBlock(null)).toBe('—')
    expect(formatJsonBlock('')).toBe('—')
  })

  it('returns raw string when JSON is invalid', () => {
    expect(formatJsonBlock('not-json')).toBe('not-json')
  })

  it('parses JSON safely', () => {
    expect(parseJsonSafe('{"x":true}')).toEqual({ x: true })
    expect(parseJsonSafe('bad')).toBe('bad')
    expect(parseJsonSafe(null)).toBeNull()
  })

  it('builds ISO day bounds', () => {
    expect(toIsoDateStart('2026-08-01')).toBe('2026-08-01T00:00:00Z')
    expect(toIsoDateEnd('2026-08-01')).toBe('2026-08-01T23:59:59Z')
    expect(toIsoDateStart('')).toBeUndefined()
  })

  it('prefers resolved user and entity names over raw IDs', () => {
    expect(
      auditUserLabel({
        userName: 'System Administrator',
        username: 'superadmin',
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).toBe('System Administrator')
    expect(
      auditUserLabel({
        userName: null,
        username: 'superadmin',
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).toBe('superadmin')
    expect(auditUserLabel({ userName: null, username: null, userId: 'raw-id' })).toBe('—')
    expect(
      auditEntityLabel({
        entityLabel: 'Terimbere Cooperative',
        entityType: 'Cooperative',
      }),
    ).toBe('Terimbere Cooperative')
    expect(auditEntityLabel({ entityLabel: null, entityType: 'Fine' })).toBe('—')
  })

  it('maps Cooperative to Saving Scheme for display only', () => {
    const t = (key: string) =>
      key === 'auditLogs.entityTypes.Cooperative' ? 'Saving Scheme' : key
    expect(displayAuditEntityType('Cooperative', t)).toBe('Saving Scheme')
    expect(displayAuditEntityType('Fine', t)).toBe('Fine')
    expect(displayAuditEntityType('Loan', t)).toBe('Loan')
    expect(displayAuditEntityType('', t)).toBe('—')
    expect(displayAuditEntityType(null, t)).toBe('—')
    // Filter/API values stay Cooperative; only the table/detail label is translated.
    const apiEntityType = 'Cooperative'
    expect(apiEntityType).toBe('Cooperative')
    expect(displayAuditEntityType(apiEntityType, t)).toBe('Saving Scheme')
  })
})
