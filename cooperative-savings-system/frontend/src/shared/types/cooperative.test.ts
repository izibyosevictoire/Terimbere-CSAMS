import { describe, expect, it } from 'vitest'
import { mapCooperativeSummary, type CooperativeSummary } from './cooperative'

describe('mapCooperativeSummary', () => {
  it('normalizes id and default currency', () => {
    const raw = {
      id: 7,
      name: 'Ubumwe',
      status: 'ACTIVE',
      currency: '',
      logoUrl: null,
    } as unknown as CooperativeSummary

    expect(mapCooperativeSummary(raw)).toEqual({
      id: '7',
      name: 'Ubumwe',
      status: 'ACTIVE',
      currency: 'RWF',
      logoUrl: null,
    })
  })
})
