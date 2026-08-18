import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  type CooperativeSettings,
  type CooperativeSettingsUpdateRequest,
} from '@/shared/types/cooperativeSettings'

export interface CooperativeSettingsFormValues {
  timezone: string
  locale: string
  notifyContributions: boolean
  notifyLoans: boolean
  notifyFines: boolean
  notifyPayouts: boolean
}

export const cooperativeSettingsDefaults: CooperativeSettingsFormValues = {
  timezone: DEFAULT_TIMEZONE,
  locale: DEFAULT_LOCALE,
  notifyContributions: true,
  notifyLoans: true,
  notifyFines: true,
  notifyPayouts: true,
}

export function toSettingsFormValues(
  settings: CooperativeSettings,
): CooperativeSettingsFormValues {
  return {
    timezone: settings.timezone || DEFAULT_TIMEZONE,
    locale: settings.locale || DEFAULT_LOCALE,
    notifyContributions: Boolean(settings.notifyContributions),
    notifyLoans: Boolean(settings.notifyLoans),
    notifyFines: Boolean(settings.notifyFines),
    notifyPayouts: Boolean(settings.notifyPayouts),
  }
}

export function toSettingsPayload(
  values: CooperativeSettingsFormValues,
): CooperativeSettingsUpdateRequest {
  return {
    timezone: values.timezone.trim() || DEFAULT_TIMEZONE,
    locale: values.locale.trim() || DEFAULT_LOCALE,
    notifyContributions: values.notifyContributions,
    notifyLoans: values.notifyLoans,
    notifyFines: values.notifyFines,
    notifyPayouts: values.notifyPayouts,
  }
}
