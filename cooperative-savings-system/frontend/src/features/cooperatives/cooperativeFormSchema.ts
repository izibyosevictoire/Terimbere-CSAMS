import * as yup from 'yup'
import type { CooperativeCreateRequest } from '@/shared/types/cooperative'

export type CooperativeFormValues = {
  name: string
  description: string
  registrationNumber: string
  contactEmail: string
  contactPhone: string
  address: string
  currency: string
  financialYearStartMonth: number
  monthlyContributionAmount: string
  contributionDueDay: number
  registrationDate: string
}

export const cooperativeFormDefaults: CooperativeFormValues = {
  name: '',
  description: '',
  registrationNumber: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  currency: 'RWF',
  financialYearStartMonth: 1,
  monthlyContributionAmount: '0',
  contributionDueDay: 1,
  registrationDate: '',
}

export const cooperativeFormSchema: yup.ObjectSchema<CooperativeFormValues> = yup.object({
  name: yup.string().trim().required('Name is required').max(255),
  description: yup.string().trim().max(2000).default(''),
  registrationNumber: yup.string().trim().max(128).default(''),
  contactEmail: yup
    .string()
    .trim()
    .default('')
    .test('email', 'Enter a valid email', (v) => !v || yup.string().email().isValidSync(v)),
  contactPhone: yup.string().trim().max(32).default(''),
  address: yup.string().trim().max(512).default(''),
  currency: yup
    .string()
    .trim()
    .required('Currency is required')
    .matches(/^[A-Z]{3}$/, 'Use a 3-letter currency code'),
  financialYearStartMonth: yup
    .number()
    .required()
    .min(1, 'Month must be 1–12')
    .max(12, 'Month must be 1–12'),
  monthlyContributionAmount: yup
    .string()
    .trim()
    .required('Monthly contribution is required')
    .matches(/^\d+(\.\d{1,4})?$/, 'Enter a valid amount'),
  contributionDueDay: yup
    .number()
    .required()
    .min(1, 'Due day must be 1–28')
    .max(28, 'Due day must be 1–28'),
  registrationDate: yup.string().trim().default(''),
})

export function toCooperativePayload(values: CooperativeFormValues): CooperativeCreateRequest {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    registrationNumber: values.registrationNumber.trim() || undefined,
    contactEmail: values.contactEmail.trim() || undefined,
    contactPhone: values.contactPhone.trim() || undefined,
    address: values.address.trim() || undefined,
    currency: values.currency.trim().toUpperCase(),
    financialYearStartMonth: Number(values.financialYearStartMonth),
    monthlyContributionAmount: values.monthlyContributionAmount.trim(),
    contributionDueDay: Number(values.contributionDueDay),
    registrationDate: values.registrationDate.trim() || undefined,
  }
}
