import { describe, expect, it } from 'vitest'
import type { CooperativeSettings } from '@/shared/types/cooperativeSettings'
import {
  cooperativeSettingsDefaults,
  toSettingsFormValues,
  toSettingsPayload,
} from './settingsHelpers'

describe('settingsHelpers', () => {
  it('maps API settings into form values', () => {
    const settings: CooperativeSettings = {
      id: '1',
      cooperativeId: 'c1',
      timezone: 'UTC',
      locale: 'rw',
      notifyContributions: false,
      notifyLoans: true,
      notifyFines: false,
      notifyPayouts: true,
    }
    expect(toSettingsFormValues(settings)).toEqual({
      timezone: 'UTC',
      locale: 'rw',
      notifyContributions: false,
      notifyLoans: true,
      notifyFines: false,
      notifyPayouts: true,
    })
  })

  it('builds update payload with trimmed defaults', () => {
    expect(
      toSettingsPayload({
        ...cooperativeSettingsDefaults,
        timezone: '  Africa/Kigali  ',
        locale: '  en  ',
        notifyContributions: false,
      }),
    ).toEqual({
      timezone: 'Africa/Kigali',
      locale: 'en',
      notifyContributions: false,
      notifyLoans: true,
      notifyFines: true,
      notifyPayouts: true,
    })
  })
})
