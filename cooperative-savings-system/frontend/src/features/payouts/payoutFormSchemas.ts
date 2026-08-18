import * as yup from 'yup'
import type { PayoutPreviewRequest } from '@/shared/types/payout'

const optionalMoney = yup
  .string()
  .trim()
  .default('')
  .test('money', 'Enter a valid amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v))
  .test('non-negative', 'Amount must be 0 or greater', (v) => {
    if (!v) return true
    return Number(v) >= 0
  })

export type PayoutPreviewFormValues = {
  name: string
  periodFrom: string
  periodTo: string
  includeRegular: boolean
  includeSpecial: boolean
  payoutPoolAmount: string
  notes: string
}

export const payoutPreviewDefaults = (): PayoutPreviewFormValues => {
  const today = new Date()
  const yearStart = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().slice(0, 10)
  return {
    name: '',
    periodFrom: yearStart,
    periodTo: todayStr,
    includeRegular: true,
    includeSpecial: true,
    payoutPoolAmount: '',
    notes: '',
  }
}

export const payoutPreviewSchema: yup.ObjectSchema<PayoutPreviewFormValues> = yup
  .object({
    name: yup.string().trim().max(200).default(''),
    periodFrom: yup.string().trim().required('Period start date is required'),
    periodTo: yup.string().trim().required('Period end date is required'),
    includeRegular: yup.boolean().required().default(true),
    includeSpecial: yup.boolean().required().default(true),
    payoutPoolAmount: optionalMoney,
    notes: yup.string().trim().max(2000).default(''),
  })
  .test('period-order', 'End date must be on or after start date', function (value) {
    if (!value?.periodFrom || !value?.periodTo) return true
    return value.periodTo >= value.periodFrom
  })
  .test(
    'include-at-least-one',
    'Select regular and/or special contributions',
    function (value) {
      return Boolean(value?.includeRegular || value?.includeSpecial)
    },
  )

export function toPayoutPreviewPayload(
  values: PayoutPreviewFormValues,
): PayoutPreviewRequest {
  const pool = values.payoutPoolAmount.trim()
  return {
    periodFrom: values.periodFrom.trim(),
    periodTo: values.periodTo.trim(),
    includeRegular: values.includeRegular,
    includeSpecial: values.includeSpecial,
    payoutPoolAmount: pool && Number(pool) >= 0 ? pool : undefined,
    name: values.name.trim() || undefined,
    notes: values.notes.trim() || undefined,
  }
}
