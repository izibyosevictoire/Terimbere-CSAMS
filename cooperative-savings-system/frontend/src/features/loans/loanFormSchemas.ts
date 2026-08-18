import * as yup from 'yup'
import type { InterestType } from '@/shared/types/loan'
import type { LoanCreateRequest } from '@/shared/types/loan'
import type { LoanRepaymentCreateRequest } from '@/shared/types/loan'
import type { LoanSettingsUpdateRequest } from '@/shared/types/loan'

const positiveMoney = yup
  .string()
  .trim()
  .required('Amount is required')
  .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount')
  .test('positive', 'Amount must be greater than 0', (v) => {
    if (!v) return false
    return Number(v) > 0
  })

export type LoanRequestFormValues = {
  memberUserId: string
  amount: string
  termMonths: string
  purpose: string
  notes: string
}

export const loanRequestDefaults: LoanRequestFormValues = {
  memberUserId: '',
  amount: '',
  termMonths: '',
  purpose: '',
  notes: '',
}

export function loanRequestSchema(requireMember: boolean): yup.ObjectSchema<LoanRequestFormValues> {
  return yup.object({
    memberUserId: requireMember
      ? yup.string().trim().required('Select a member')
      : yup.string().trim().default(''),
    amount: positiveMoney,
    termMonths: yup
      .string()
      .trim()
      .default('')
      .test('term', 'Enter a valid term in months', (v) => {
        if (!v) return true
        const n = Number(v)
        return Number.isInteger(n) && n > 0
      }),
    purpose: yup.string().trim().max(500).default(''),
    notes: yup.string().trim().max(2000).default(''),
  })
}

export function toLoanCreatePayload(
  values: LoanRequestFormValues,
  includeMember: boolean,
): LoanCreateRequest {
  const payload: LoanCreateRequest = {
    amount: values.amount.trim(),
    purpose: values.purpose.trim() || undefined,
    notes: values.notes.trim() || undefined,
  }
  if (values.termMonths.trim()) {
    payload.termMonths = Number(values.termMonths.trim())
  }
  if (includeMember && values.memberUserId.trim()) {
    payload.memberUserId = values.memberUserId.trim()
  }
  return payload
}

export type LoanApproveFormValues = {
  approvedAmount: string
  termMonths: string
  dueDate: string
}

export const loanApproveDefaults: LoanApproveFormValues = {
  approvedAmount: '',
  termMonths: '',
  dueDate: '',
}

export const loanApproveSchema: yup.ObjectSchema<LoanApproveFormValues> = yup.object({
  approvedAmount: yup
    .string()
    .trim()
    .default('')
    .test('money', 'Enter a valid amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v)),
  termMonths: yup
    .string()
    .trim()
    .default('')
    .test('term', 'Enter a valid term in months', (v) => {
      if (!v) return true
      const n = Number(v)
      return Number.isInteger(n) && n > 0
    }),
  dueDate: yup.string().trim().default(''),
})

export type LoanRejectFormValues = {
  rejectionReason: string
}

export const loanRejectDefaults: LoanRejectFormValues = {
  rejectionReason: '',
}

export const loanRejectSchema: yup.ObjectSchema<LoanRejectFormValues> = yup.object({
  rejectionReason: yup.string().trim().required('Rejection reason is required').max(1000),
})

export type RepaymentFormValues = {
  amount: string
  paymentDate: string
  paymentReference: string
  notes: string
}

export const repaymentDefaults: RepaymentFormValues = {
  amount: '',
  paymentDate: '',
  paymentReference: '',
  notes: '',
}

export const repaymentSchema: yup.ObjectSchema<RepaymentFormValues> = yup.object({
  amount: positiveMoney,
  paymentDate: yup.string().trim().default(''),
  paymentReference: yup.string().trim().max(128).default(''),
  notes: yup.string().trim().max(2000).default(''),
})

export function toRepaymentPayload(values: RepaymentFormValues): LoanRepaymentCreateRequest {
  return {
    amount: values.amount.trim(),
    paymentDate: values.paymentDate.trim() || undefined,
    paymentReference: values.paymentReference.trim() || undefined,
    notes: values.notes.trim() || undefined,
    allocateInterestFirst: true,
  }
}

export type LoanSettingsFormValues = {
  interestRatePercent: string
  interestType: InterestType
  maxLoanAmount: string
  maxTermMonths: string
  minMembershipMonths: string
  allowMemberRequests: boolean
  lateFeeEnabled: boolean
}

export const loanSettingsDefaults: LoanSettingsFormValues = {
  interestRatePercent: '0',
  interestType: 'FLAT',
  maxLoanAmount: '',
  maxTermMonths: '',
  minMembershipMonths: '0',
  allowMemberRequests: true,
  lateFeeEnabled: false,
}

export const loanSettingsSchema: yup.ObjectSchema<LoanSettingsFormValues> = yup.object({
  interestRatePercent: yup
    .string()
    .trim()
    .required('Interest rate is required')
    .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid rate')
    .test('range', 'Rate must be 0–100', (v) => {
      if (!v) return false
      const n = Number(v)
      return n >= 0 && n <= 100
    }),
  interestType: yup
    .mixed<InterestType>()
    .oneOf(['FLAT'], 'Reducing-balance interest is not currently available. Please use Flat Interest.')
    .required(),
  maxLoanAmount: yup
    .string()
    .trim()
    .default('')
    .test('money', 'Enter a valid amount', (v) => !v || /^\d+(\.\d{1,4})?$/.test(v)),
  maxTermMonths: yup
    .string()
    .trim()
    .default('')
    .test('term', 'Enter a valid term', (v) => {
      if (!v) return true
      const n = Number(v)
      return Number.isInteger(n) && n > 0
    }),
  minMembershipMonths: yup
    .string()
    .trim()
    .default('0')
    .test('months', 'Enter a valid number', (v) => {
      if (!v) return true
      const n = Number(v)
      return Number.isInteger(n) && n >= 0
    }),
  allowMemberRequests: yup.boolean().required(),
  lateFeeEnabled: yup.boolean().required(),
})

export function toLoanSettingsPayload(
  values: LoanSettingsFormValues,
): LoanSettingsUpdateRequest {
  return {
    interestRatePercent: values.interestRatePercent.trim(),
    interestType: values.interestType,
    maxLoanAmount: values.maxLoanAmount.trim() || null,
    maxTermMonths: values.maxTermMonths.trim()
      ? Number(values.maxTermMonths.trim())
      : null,
    minMembershipMonths: values.minMembershipMonths.trim()
      ? Number(values.minMembershipMonths.trim())
      : 0,
    allowMemberRequests: values.allowMemberRequests,
    lateFeeEnabled: values.lateFeeEnabled,
  }
}
