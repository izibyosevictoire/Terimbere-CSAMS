import * as yup from 'yup'
import type {
  SocialContributionCreateRequest,
  SocialDisbursementCreateRequest,
  SocialFundSettingsUpdateRequest,
} from '@/shared/types/socialFund'

const positiveMoney = yup
  .string()
  .trim()
  .required('Amount is required')
  .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount')
  .test('positive', 'Amount must be greater than 0', (v) => {
    if (!v) return false
    return Number(v) > 0
  })

export type SocialContributionFormValues = {
  amount: string
  contributionDate: string
  paymentReference: string
  notes: string
  memberUserId: string
}

export const socialContributionDefaults: SocialContributionFormValues = {
  amount: '',
  contributionDate: '',
  paymentReference: '',
  notes: '',
  memberUserId: '',
}

export const socialContributionSchema: yup.ObjectSchema<SocialContributionFormValues> =
  yup.object({
    amount: positiveMoney,
    contributionDate: yup.string().trim().required('Contribution date is required'),
    paymentReference: yup.string().trim().max(128).default(''),
    notes: yup.string().trim().max(2000).default(''),
    memberUserId: yup.string().trim().default(''),
  })

export function toSocialContributionPayload(
  values: SocialContributionFormValues,
  options?: { includeMember?: boolean },
): SocialContributionCreateRequest {
  const payload: SocialContributionCreateRequest = {
    amount: values.amount.trim(),
    contributionDate: values.contributionDate.trim() || undefined,
    paymentReference: values.paymentReference.trim() || undefined,
    notes: values.notes.trim() || undefined,
  }
  if (options?.includeMember && values.memberUserId.trim()) {
    payload.memberUserId = values.memberUserId.trim()
  }
  return payload
}

export type SocialDisbursementFormValues = {
  beneficiaryMemberUserId: string
  amount: string
  reason: string
  disbursementDate: string
  notes: string
  evidenceFileKey: string
}

export const socialDisbursementDefaults: SocialDisbursementFormValues = {
  beneficiaryMemberUserId: '',
  amount: '',
  reason: '',
  disbursementDate: '',
  notes: '',
  evidenceFileKey: '',
}

export const socialDisbursementSchema: yup.ObjectSchema<SocialDisbursementFormValues> =
  yup.object({
    beneficiaryMemberUserId: yup.string().trim().required('Select a beneficiary'),
    amount: positiveMoney,
    reason: yup.string().trim().required('Reason is required').max(2000),
    disbursementDate: yup.string().trim().required('Disbursement date is required'),
    notes: yup.string().trim().max(2000).default(''),
    evidenceFileKey: yup.string().trim().max(512).default(''),
  })

export function toSocialDisbursementPayload(
  values: SocialDisbursementFormValues,
): SocialDisbursementCreateRequest {
  return {
    beneficiaryMemberUserId: values.beneficiaryMemberUserId.trim(),
    amount: values.amount.trim(),
    reason: values.reason.trim(),
    disbursementDate: values.disbursementDate.trim() || undefined,
    notes: values.notes.trim() || undefined,
    evidenceFileKey: values.evidenceFileKey.trim() || undefined,
  }
}

export type SocialFundSettingsFormValues = {
  suggestedContributionAmount: string
  enabled: boolean
}

export const socialFundSettingsDefaults: SocialFundSettingsFormValues = {
  suggestedContributionAmount: '',
  enabled: true,
}

export const socialFundSettingsSchema: yup.ObjectSchema<SocialFundSettingsFormValues> =
  yup.object({
    suggestedContributionAmount: yup
      .string()
      .trim()
      .default('')
      .test('money', 'Enter a valid amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v)),
    enabled: yup.boolean().required(),
  })

export function toSocialFundSettingsPayload(
  values: SocialFundSettingsFormValues,
): SocialFundSettingsUpdateRequest {
  return {
    suggestedContributionAmount: values.suggestedContributionAmount.trim() || null,
    enabled: values.enabled,
  }
}

export type SocialFundReportFormValues = {
  from: string
  to: string
}

export const socialFundReportDefaults = (): SocialFundReportFormValues => {
  const now = new Date()
  const year = now.getFullYear()
  return {
    from: `${year}-01-01`,
    to: now.toISOString().slice(0, 10),
  }
}

export const socialFundReportSchema: yup.ObjectSchema<SocialFundReportFormValues> = yup.object({
  from: yup.string().trim().required('Start date is required'),
  to: yup
    .string()
    .trim()
    .required('End date is required')
    .test('range', 'End date must be on or after start date', function (value) {
      const { from } = this.parent as SocialFundReportFormValues
      if (!from || !value) return true
      return value >= from
    }),
})
