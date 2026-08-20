import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemePreference = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'csams.theme'

function readStoredTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'dark') return 'dark'
    if (raw === 'light') return 'light'
    // Legacy "system" followed the OS and usually looked like light.
  } catch {
    // ignore storage failures
  }
  return 'light'
}

export function resolveThemeMode(preference: ThemePreference): ThemeMode {
  return preference === 'dark' ? 'dark' : 'light'
}

export interface UiState {
  sidebarOpen: boolean
  themePreference: ThemePreference
}

const initialState: UiState = {
  sidebarOpen: false,
  themePreference: readStoredTheme(),
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setThemePreference(state, action: PayloadAction<ThemePreference>) {
      state.themePreference = action.payload
      try {
        localStorage.setItem(THEME_STORAGE_KEY, action.payload)
      } catch {
        // ignore
      }
    },
    /** @deprecated Prefer setThemePreference */
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themePreference = action.payload
      try {
        localStorage.setItem(THEME_STORAGE_KEY, action.payload)
      } catch {
        // ignore
      }
    },
  },
})

export const { setSidebarOpen, toggleSidebar, setThemePreference, setThemeMode } = uiSlice.actions
export default uiSlice.reducer
