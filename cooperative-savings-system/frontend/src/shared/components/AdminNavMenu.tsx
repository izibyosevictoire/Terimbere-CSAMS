import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import {
  adminModuleNavItems,
  canAccessNavItem,
} from '@/layouts/navItems'

export function AdminNavMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userRoles = useAppSelector((s) => s.auth.user?.roles ?? [])
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const visible = adminModuleNavItems.filter((item) => canAccessNavItem(item, userRoles))
  if (!visible.length) return null

  const main = visible.filter((i) => i.group === 'main' || !i.group)
  const advanced = visible.filter((i) => i.group === 'advanced')
  const superItems = visible.filter((i) => i.group === 'super')

  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  return (
    <>
      <Button
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={{ minHeight: 40, fontWeight: 600 }}
      >
        {t('nav.adminSection')}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 240, maxHeight: 480 } } }}
      >
        {main.map((item) => {
          const Icon = item.icon
          return (
            <MenuItem key={item.path} onClick={() => go(item.path)}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t(item.labelKey)}</ListItemText>
            </MenuItem>
          )
        })}
        {advanced.length ? (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              {t('nav.advanced')}
            </Typography>
            {advanced.map((item) => {
              const Icon = item.icon
              return (
                <MenuItem key={item.path} onClick={() => go(item.path)}>
                  <ListItemIcon>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t(item.labelKey)}</ListItemText>
                </MenuItem>
              )
            })}
          </>
        ) : null}
        {superItems.length ? (
          <>
            <Divider sx={{ my: 1 }} />
            {superItems.map((item) => {
              const Icon = item.icon
              return (
                <MenuItem key={item.path} onClick={() => go(item.path)}>
                  <ListItemIcon>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t(item.labelKey)}</ListItemText>
                </MenuItem>
              )
            })}
          </>
        ) : null}
      </Menu>
    </>
  )
}
