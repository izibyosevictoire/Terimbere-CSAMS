import * as yup from 'yup'
import type { SpecialCampaignCreateRequest } from '@/shared/types/specialContribution'
import type { SpecialContributionSubmitRequest } from '@/shared/types/specialContribution'

const nonNegativeMoney = yup
  .string()
  .trim()
  .required('Amount is required')
  .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid non-negative amount')
  .test('non-negative', 'Amount must be 0 or greater', (v) => {
    if (!v) return false
    return Number(v) >= 0
  })

export type CampaignFormValues = {
  name: string
  purpose: string
  description: string
  suggestedAmount: string
  targetAmount: string
  startDate: string
  endDate: string
}

export const campaignFormDefaults: CampaignFormValues = {
  name: '',
  purpose: '',
  description: '',
  suggestedAmount: '',
  targetAmount: '',
  startDate: '',
  endDate: '',
}

export const campaignFormSchema: yup.ObjectSchema<CampaignFormValues> = yup.object({
  name: yup.string().trim().required('Name is required').max(200),
  purpose: yup.string().trim().max(500).default(''),
  description: yup.string().trim().max(2000).default(''),
  suggestedAmount: yup
    .string()
    .trim()
    .default('')
    .test('money', 'Enter a valid non-negative amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v)),
  targetAmount: yup
    .string()
    .trim()
    .default('')
    .test('money', 'Enter a valid non-negative amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v)),
  startDate: yup.string().trim().default(''),
  endDate: yup.string().trim().default(''),
})

export function toCampaignCreatePayload(values: CampaignFormValues): SpecialCampaignCreateRequest {
  return {
    name: values.name.trim(),
    purpose: values.purpose.trim() || undefined,
    description: values.description.trim() || undefined,
    suggestedAmount: values.suggestedAmount.trim() || undefined,
    targetAmount: values.targetAmount.trim() || undefined,
    startDate: values.startDate.trim() || undefined,
    endDate: values.endDate.trim() || undefined,
  }
}

export type SpecialSubmitFormValues = {
  amount: string
  contributionDate: string
  paymentReference: string
  notes: string
}

export const specialSubmitDefaults: SpecialSubmitFormValues = {
  amount: '',
  contributionDate: '',
  paymentReference: '',
  notes: '',
}

export const specialSubmitSchema: yup.ObjectSchema<SpecialSubmitFormValues> = yup.object({
  amount: nonNegativeMoney,
  contributionDate: yup.string().trim().default(''),
  paymentReference: yup.string().trim().max(128).default(''),
  notes: yup.string().trim().max(2000).default(''),
})

export function toSpecialSubmitPayload(
  values: SpecialSubmitFormValues,
): SpecialContributionSubmitRequest {
  return {
    amount: values.amount.trim(),
    contributionDate: values.contributionDate.trim() || undefined,
    paymentReference: values.paymentReference.trim() || undefined,
    notes: values.notes.trim() || undefined,
  }
}

export const paidAmountSchema = nonNegativeMoney
