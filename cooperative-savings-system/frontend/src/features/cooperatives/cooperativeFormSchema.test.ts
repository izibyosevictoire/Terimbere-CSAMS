import { describe, expect, it } from 'vitest'
import { cooperativeFormDefaults, toCooperativePayload } from './cooperativeFormSchema'

describe('toCooperativePayload', () => {
  it('trims strings and omits empty optional fields', () => {
    const payload = toCooperativePayload({
      ...cooperativeFormDefaults,
      name: '  Demo Coop  ',
      currency: 'rwf',
      monthlyContributionAmount: '5000',
      financialYearStartMonth: 3,
      contributionDueDay: 10,
      description: '  ',
      contactEmail: 'admin@example.com',
    })

    expect(payload).toEqual({
      name: 'Demo Coop',
      description: undefined,
      registrationNumber: undefined,
      contactEmail: 'admin@example.com',
      contactPhone: undefined,
      address: undefined,
      currency: 'RWF',
      financialYearStartMonth: 3,
      monthlyContributionAmount: '5000',
      contributionDueDay: 10,
      registrationDate: undefined,
    })
  })
})
