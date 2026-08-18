import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/app/store/store'
import { useAppSelector } from '@/app/store/hooks'
import { resolveThemeMode } from '@/app/store/uiSlice'
import { PwaUpdateBanner } from '@/pwa/PwaUpdateBanner'
import { darkTheme, lightTheme } from '@/theme/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

function useSystemDark(): boolean {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent) => setIsDark(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDark
}

function ThemedApp({ children }: { children: ReactNode }) {
  const preference = useAppSelector((s) => s.ui.themePreference)
  const systemDark = useSystemDark()
  const mode =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : resolveThemeMode(preference)
  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {children}
        <PwaUpdateBanner />
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemedApp>{children}</ThemedApp>
      </QueryClientProvider>
    </Provider>
  )
}
