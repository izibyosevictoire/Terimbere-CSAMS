import { describe, expect, it } from 'vitest'
import { cooperativeFormDefaults, cooperativeFormSchema, toCooperativePayload } from './cooperativeFormSchema'

describe('toCooperativePayload', () => {
  it('normalizes Rwanda fields and locks currency to RWF', () => {
    const payload = toCooperativePayload({
      ...cooperativeFormDefaults,
      name: '  Demo Coop  ',
      currency: 'USD',
      monthlyContributionAmount: '5000',
      financialYearStartMonth: 3,
      contributionDueDay: 10,
      description: '  ',
      registrationNumber: ' rca / 2024 / 0123 ',
      contactEmail: 'Admin@Example.COM',
      contactPhone: '+250 781 234 567',
      registrationDate: '2024-06-01',
    })

    expect(payload).toEqual({
      name: 'Demo Coop',
      description: undefined,
      registrationNumber: 'RCA/2024/0123',
      contactEmail: 'admin@example.com',
      contactPhone: '0781234567',
      address: undefined,
      currency: 'RWF',
      financialYearStartMonth: 3,
      monthlyContributionAmount: '5000',
      contributionDueDay: 10,
      registrationDate: '2024-06-01',
    })
  })
})

describe('cooperativeFormSchema', () => {
  const valid = {
    ...cooperativeFormDefaults,
    name: 'Terimbere Savings',
    registrationNumber: 'RCA/2024/0123',
    contactEmail: 'info@terimbere.rw',
    contactPhone: '0781234567',
    registrationDate: '2024-01-15',
    monthlyContributionAmount: '10000',
    contributionDueDay: 5,
  }

  it('accepts a valid cooperative payload', async () => {
    await expect(cooperativeFormSchema.validate(valid)).resolves.toMatchObject({
      name: 'Terimbere Savings',
      currency: 'RWF',
    })
  })

  it('rejects non-Rwandan phone numbers', async () => {
    await expect(
      cooperativeFormSchema.validate({ ...valid, contactPhone: '12345' }),
    ).rejects.toThrow(/Rwandan mobile/i)
  })

  it('rejects invalid registration numbers', async () => {
    await expect(
      cooperativeFormSchema.validate({ ...valid, registrationNumber: 'ab' }),
    ).rejects.toThrow(/registration number/i)
  })

  it('requires registration date', async () => {
    await expect(
      cooperativeFormSchema.validate({ ...valid, registrationDate: '' }),
    ).rejects.toThrow(/required/i)
  })
})
