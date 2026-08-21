import * as yup from 'yup'
import type {
  MemberCreateRequest,
  MemberUpdateRequest,
  RoleInCooperative,
} from '@/shared/types/member'

export type MemberFormValues = {
  firstName: string
  lastName: string
  username: string
  email: string
  phone: string
  nationalId: string
  address: string
  membershipDate: string
  temporaryPassword: string
  roleInCooperative: RoleInCooperative
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const nationalIdSchema = yup
  .string()
  .trim()
  .default('')
  .test(
    'rwandan-nid',
    'National ID must be exactly 16 digits (numbers only)',
    (value) => !value || /^\d{16}$/.test(value),
  )

const membershipDateSchema = yup
  .string()
  .trim()
  .default('')
  .test('not-future', 'Membership date cannot be in the future', (value) => {
    if (!value) return true
    return value <= todayIso()
  })
  .test('not-too-old', 'Membership date cannot be before 1950-01-01', (value) => {
    if (!value) return true
    return value >= '1950-01-01'
  })

export const memberFormDefaults: MemberFormValues = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  nationalId: '',
  address: '',
  membershipDate: '',
  temporaryPassword: '',
  roleInCooperative: 'MEMBER',
}

export const memberCreateSchema: yup.ObjectSchema<MemberFormValues> = yup.object({
  firstName: yup.string().trim().required('First name is required').max(128),
  lastName: yup.string().trim().required('Last name is required').max(128),
  username: yup
    .string()
    .trim()
    .required('Username is required')
    .min(3)
    .max(64)
    .matches(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, . _ - only'),
  email: yup.string().trim().required('Email is required').email('Enter a valid email'),
  phone: yup.string().trim().max(32).default(''),
  nationalId: nationalIdSchema,
  address: yup.string().trim().max(512).default(''),
  membershipDate: membershipDateSchema,
  temporaryPassword: yup
    .string()
    .default('')
    .test('pwd', 'At least 8 characters if provided', (v) => !v || v.length >= 8),
  roleInCooperative: yup
    .mixed<RoleInCooperative>()
    .oneOf(['MEMBER', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'ACCOUNTANT', 'LOAN_OFFICER'])
    .required(),
})

export const memberUpdateSchema = yup.object({
  firstName: yup.string().trim().required('First name is required').max(128),
  lastName: yup.string().trim().required('Last name is required').max(128),
  email: yup.string().trim().required('Email is required').email('Enter a valid email'),
  phone: yup.string().trim().max(32).default(''),
  nationalId: nationalIdSchema,
  address: yup.string().trim().max(512).default(''),
  membershipDate: membershipDateSchema,
  roleInCooperative: yup
    .mixed<RoleInCooperative>()
    .oneOf(['MEMBER', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'ACCOUNTANT', 'LOAN_OFFICER'])
    .required(),
})

export type MemberUpdateFormValues = Omit<
  MemberFormValues,
  'username' | 'temporaryPassword'
>

export function toMemberCreatePayload(values: MemberFormValues): MemberCreateRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    username: values.username.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
    nationalId: values.nationalId.trim() || undefined,
    address: values.address.trim() || undefined,
    membershipDate: values.membershipDate.trim() || undefined,
    temporaryPassword: values.temporaryPassword.trim() || undefined,
    roleInCooperative: values.roleInCooperative,
  }
}

export function toMemberUpdatePayload(values: MemberUpdateFormValues): MemberUpdateRequest {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
    nationalId: values.nationalId.trim() || undefined,
    address: values.address.trim() || undefined,
    membershipDate: values.membershipDate.trim() || undefined,
    roleInCooperative: values.roleInCooperative,
  }
}
