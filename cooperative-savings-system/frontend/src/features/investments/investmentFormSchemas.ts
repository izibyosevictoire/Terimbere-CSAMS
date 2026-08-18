import * as yup from 'yup'
import type {
  InvestmentCreateRequest,
  InvestmentLossRequest,
  InvestmentReturnCreateRequest,
} from '@/shared/types/investment'

const positiveMoney = yup
  .string()
  .trim()
  .required('Amount is required')
  .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount')
  .test('positive', 'Amount must be greater than 0', (v) => {
    if (!v) return false
    return Number(v) > 0
  })

const optionalMoney = yup
  .string()
  .trim()
  .default('')
  .test('money', 'Enter a valid amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v))

export type InvestmentCreateFormValues = {
  name: string
  amount: string
  expectedReturnAmount: string
  expectedReturnDate: string
  description: string
  documentFileKey: string
}

export const investmentCreateDefaults: InvestmentCreateFormValues = {
  name: '',
  amount: '',
  expectedReturnAmount: '',
  expectedReturnDate: '',
  description: '',
  documentFileKey: '',
}

export const investmentCreateSchema: yup.ObjectSchema<InvestmentCreateFormValues> =
  yup.object({
    name: yup.string().trim().required('Name is required').max(200),
    amount: positiveMoney,
    expectedReturnAmount: optionalMoney,
    expectedReturnDate: yup.string().trim().default(''),
    description: yup.string().trim().max(2000).default(''),
    documentFileKey: yup.string().trim().max(512).default(''),
  })

export function toInvestmentCreatePayload(
  values: InvestmentCreateFormValues,
): InvestmentCreateRequest {
  return {
    name: values.name.trim(),
    amount: values.amount.trim(),
    expectedReturnAmount: values.expectedReturnAmount.trim() || undefined,
    expectedReturnDate: values.expectedReturnDate.trim() || undefined,
    description: values.description.trim() || undefined,
    documentFileKey: values.documentFileKey.trim() || undefined,
  }
}

export type InvestmentReturnFormValues = {
  returnDate: string
  capitalPortion: string
  profitPortion: string
  notes: string
  reference: string
}

export const investmentReturnDefaults = (): InvestmentReturnFormValues => ({
  returnDate: new Date().toISOString().slice(0, 10),
  capitalPortion: '',
  profitPortion: '',
  notes: '',
  reference: '',
})

export const investmentReturnSchema: yup.ObjectSchema<InvestmentReturnFormValues> =
  yup.object({
    returnDate: yup.string().trim().required('Return date is required'),
    capitalPortion: optionalMoney,
    profitPortion: optionalMoney,
    notes: yup.string().trim().max(2000).default(''),
    reference: yup.string().trim().max(128).default(''),
  }).test(
    'at-least-one-portion',
    'Enter a capital and/or profit portion greater than 0',
    function (value) {
      const capital = Number(value?.capitalPortion) || 0
      const profit = Number(value?.profitPortion) || 0
      return capital > 0 || profit > 0
    },
  )

export function toInvestmentReturnPayload(
  values: InvestmentReturnFormValues,
): InvestmentReturnCreateRequest {
  const capital = values.capitalPortion.trim()
  const profit = values.profitPortion.trim()
  return {
    returnDate: values.returnDate.trim(),
    capitalPortion: capital && Number(capital) > 0 ? capital : undefined,
    profitPortion: profit && Number(profit) > 0 ? profit : undefined,
    notes: values.notes.trim() || undefined,
    reference: values.reference.trim() || undefined,
  }
}

export type InvestmentLossFormValues = {
  notes: string
  reference: string
}

export const investmentLossDefaults: InvestmentLossFormValues = {
  notes: '',
  reference: '',
}

export const investmentLossSchema: yup.ObjectSchema<InvestmentLossFormValues> = yup.object({
  notes: yup.string().trim().max(2000).default(''),
  reference: yup.string().trim().max(128).default(''),
})

export function toInvestmentLossPayload(
  values: InvestmentLossFormValues,
): InvestmentLossRequest {
  return {
    notes: values.notes.trim() || undefined,
    reference: values.reference.trim() || undefined,
  }
}
