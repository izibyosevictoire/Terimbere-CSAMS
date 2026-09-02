import { ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authReducer from '@/app/store/authSlice'
import uiReducer from '@/app/store/uiSlice'
import { ROLE_PRESIDENT } from '@/shared/types/auth'
import { BRAND_LOGO_ALT, BRAND_LOGO_ON_DARK_SRC, BRAND_LOGO_SRC } from '@/shared/components/BrandLogo'
import { darkTheme, lightTheme } from '@/theme/theme'
import { AppLayout } from './AppLayout'

vi.mock('@/shared/api/notifications', () => ({
  fetchUnreadCount: vi.fn().mockResolvedValue(0),
  fetchNotifications: vi.fn().mockResolvedValue([]),
  fetchPendingApprovals: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
}))

vi.mock('@/shared/api/cooperatives', () => ({
  fetchMyCooperatives: vi.fn().mockResolvedValue([]),
}))

function stubMatchMedia(mdUp: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('900') ? mdUp : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

function renderAppLayout(mode: 'light' | 'dark', mdUp = false) {
  stubMatchMedia(mdUp)
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: {
          id: 'u1',
          username: 'president',
          email: 'p@example.com',
          firstName: 'Pat',
          lastName: 'Leader',
          fullName: 'Pat Leader',
          roles: [ROLE_PRESIDENT],
          permissions: [],
          cooperativeIds: ['coop-1'],
        },
        accessToken: 'test-token',
        selectedCooperativeId: 'coop-1',
        status: 'authenticated' as const,
      },
      ui: { sidebarOpen: false, themePreference: mode },
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <AppLayout />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  )
}

function appBarLogo() {
  return within(screen.getByRole('banner')).getByRole('img', { name: BRAND_LOGO_ALT })
}

function drawerLogo() {
  const paper = document.querySelector('.MuiDrawer-paper')
  expect(paper).toBeInstanceOf(HTMLElement)
  return within(paper as HTMLElement).getByRole('img', { name: BRAND_LOGO_ALT })
}

describe('AppLayout logo surfaces', () => {
  beforeEach(() => {
    stubMatchMedia(false)
  })

  it('always uses the on-dark wordmark in the AppBar in Light Mode', () => {
    renderAppLayout('light', true)
    expect(appBarLogo()).toHaveAttribute('src', BRAND_LOGO_ON_DARK_SRC)
  })

  it('always uses the on-dark wordmark in the AppBar in Dark Mode', () => {
    renderAppLayout('dark', true)
    expect(appBarLogo()).toHaveAttribute('src', BRAND_LOGO_ON_DARK_SRC)
  })

  it('uses the normal wordmark in the Light Mode drawer', async () => {
    const user = userEvent.setup()
    renderAppLayout('light', false)
    expect(appBarLogo()).toHaveAttribute('src', BRAND_LOGO_ON_DARK_SRC)
    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(drawerLogo()).toHaveAttribute('src', BRAND_LOGO_SRC)
  })

  it('uses the on-dark wordmark in the Dark Mode drawer', async () => {
    const user = userEvent.setup()
    renderAppLayout('dark', false)
    expect(appBarLogo()).toHaveAttribute('src', BRAND_LOGO_ON_DARK_SRC)
    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(drawerLogo()).toHaveAttribute('src', BRAND_LOGO_ON_DARK_SRC)
  })
})
