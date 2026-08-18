import { describe, expect, it } from 'vitest'
import { resolveThemeMode } from '@/app/store/uiSlice'

describe('resolveThemeMode', () => {
  it('returns light and dark preferences directly', () => {
    expect(resolveThemeMode('light')).toBe('light')
    expect(resolveThemeMode('dark')).toBe('dark')
  })

  it('resolves system preference without throwing', () => {
    expect(['light', 'dark']).toContain(resolveThemeMode('system'))
  })
})
