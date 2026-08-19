import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setThemePreference, type ThemePreference } from '@/app/store/uiSlice'

const OPTIONS: Array<{ value: ThemePreference; labelKey: string; icon: typeof LightModeOutlinedIcon }> = [
  { value: 'light', labelKey: 'theme.light', icon: LightModeOutlinedIcon },
  { value: 'dark', labelKey: 'theme.dark', icon: DarkModeOutlinedIcon },
  { value: 'system', labelKey: 'theme.system', icon: SettingsBrightnessIcon },
]

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const preference = useAppSelector((s) => s.ui.themePreference)
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0]
  const CurrentIcon = current.icon

  return (
    <>
      <Button
        size="small"
        color="inherit"
        startIcon={<CurrentIcon fontSize="small" />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={t('theme.label')}
        sx={{ minHeight: 36, textTransform: 'none', whiteSpace: 'nowrap', color: 'inherit' }}
      >
        {compact ? null : t(current.labelKey)}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <MenuItem
              key={option.value}
              selected={option.value === preference}
              onClick={() => {
                dispatch(setThemePreference(option.value))
                setAnchor(null)
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t(option.labelKey)}</ListItemText>
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
