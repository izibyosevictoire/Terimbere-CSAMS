import { describe, expect, it } from 'vitest'
import {
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
})
