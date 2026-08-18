import { describe, expect, it } from 'vitest'
import { mapMember, memberDisplayName, type Member } from './member'

describe('memberDisplayName', () => {
  it('prefers fullName when present', () => {
    expect(
      memberDisplayName({
        firstName: 'A',
        lastName: 'B',
        fullName: 'Custom Name',
      }),
    ).toBe('Custom Name')
  })

  it('falls back to first + last', () => {
    expect(memberDisplayName({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane Doe')
  })
})

describe('mapMember', () => {
  it('normalizes userId and fills fullName', () => {
    const raw = {
      userId: 42,
      firstName: 'Jean',
      lastName: 'Uwimana',
      username: 'jean.u',
      email: 'jean@example.com',
      membershipStatus: 'ACTIVE',
      accountStatus: 'ACTIVE',
      roleInCooperative: 'MEMBER',
    } as unknown as Member

    const mapped = mapMember(raw)
    expect(mapped.userId).toBe('42')
    expect(mapped.fullName).toBe('Jean Uwimana')
  })
})
