import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material'
import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authReducer from '@/app/store/authSlice'
import uiReducer from '@/app/store/uiSlice'
import { LOGIN_SUCCESS_STATE } from '@/features/branding/loginSuccessSplash'
import { login } from '@/shared/api/auth'
import { ROUTES } from '@/shared/constants/routes'
import { ROLE_MEMBER, type AuthUser, type LoginResponse } from '@/shared/types/auth'
import { lightTheme } from '@/theme/theme'
import { LoginPage } from './LoginPage'

vi.mock('@/shared/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/api/auth')>()
  return {
    ...actual,
    login: vi.fn(),
  }
})

const loginMock = vi.mocked(login)

const testUser: AuthUser = {
  id: 'u1',
  username: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Member',
  fullName: 'Alice Member',
  roles: [ROLE_MEMBER],
  permissions: [],
  cooperativeIds: ['coop-1'],
}

const loginData: LoginResponse = {
  accessToken: 'token-abc',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: testUser,
}

function renderLogin() {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: null,
        accessToken: null,
        selectedCooperativeId: null,
        status: 'anonymous' as const,
      },
      ui: { sidebarOpen: false, themePreference: 'light' as const },
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={lightTheme}>
          <MemoryRouter initialEntries={[ROUTES.login]}>
            <Routes>
              <Route path={ROUTES.login} element={<LoginPage />} />
              <Route path={ROUTES.loginSuccess} element={<div>login-success-route</div>} />
              <Route path={ROUTES.dashboard} element={<div>dashboard-route</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  )

  return { ...view, store }
}

describe('LoginPage post-login splash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends a successful username/password login to the splash before Dashboard', async () => {
    loginMock.mockResolvedValue(loginData)
    const { store } = renderLogin()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('login-success-route')).toBeInTheDocument()
    expect(screen.queryByText('dashboard-route')).not.toBeInTheDocument()
    expect(store.getState().auth.status).toBe('authenticated')
    expect(loginMock).toHaveBeenCalledWith(
      { username: 'alice', password: 'password1' },
      expect.anything(),
    )
  })

  it('keeps failed login on the login page', async () => {
    loginMock.mockRejectedValue(new Error('Invalid credentials'))
    renderLogin()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalled()
    })
    expect(screen.queryByText('login-success-route')).not.toBeInTheDocument()
    expect(screen.queryByText('dashboard-route')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('uses the login-success location state for a real login event', () => {
    expect(LOGIN_SUCCESS_STATE).toEqual({ fromLogin: true, next: ROUTES.dashboard })
  })
})
