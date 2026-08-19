export type AuthStatus = 'anonymous' | 'authenticated' | 'loading'

export interface AuthUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  roles: string[]
  permissions: string[]
  cooperativeIds: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface SignupRequest {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface PasswordResetRequest {
  usernameOrEmail: string
}

export interface PasswordResetConfirmRequest {
  token: string
  newPassword: string
}

export const ROLE_SUPER_ADMIN = 'SUPER_ADMIN'
export const ROLE_COOPERATIVE_ADMIN = 'COOPERATIVE_ADMIN'
