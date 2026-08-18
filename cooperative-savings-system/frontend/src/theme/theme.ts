import { createTheme, type ThemeOptions } from '@mui/material/styles'

const base: ThemeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  typography: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    h1: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 650 },
    h4: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 650 },
    h5: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 650 },
    h6: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingInline: 18,
          minHeight: 40,
        },
        sizeSmall: { minHeight: 36 },
        sizeLarge: { minHeight: 48 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: 40, minHeight: 40 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { minHeight: 44 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: '1px solid var(--color-border)' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'divider',
        },
      },
    },
  },
}

export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: 'light',
    primary: {
      main: '#0F5C5C',
      dark: '#0A4242',
      light: '#1A7A7A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2563EB',
      dark: '#1D4ED8',
      light: '#3B82F6',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F6F8',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
    divider: '#E5E7EB',
    success: { main: '#16A34A' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: '#0EA5E9' },
  },
})

export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: 'dark',
    primary: {
      main: '#4DB6AC',
      dark: '#0F5C5C',
      light: '#80CBC4',
      contrastText: '#062525',
    },
    secondary: {
      main: '#60A5FA',
      contrastText: '#0F172A',
    },
    background: {
      default: '#0F1419',
      paper: '#1A222D',
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
    divider: '#2A3441',
    success: { main: '#22C55E' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#38BDF8' },
  },
})
