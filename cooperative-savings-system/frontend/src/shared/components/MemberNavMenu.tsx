import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { memberNavItems } from '@/layouts/navItems'
import { ROUTES } from '@/shared/constants/routes'

export function MemberNavMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const items = memberNavItems.filter((item) => item.path !== ROUTES.dashboard)

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
        sx={{ minHeight: 40, fontWeight: 600, color: 'inherit' }}
      >
        {t('nav.memberSection')}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        {items.map((item) => {
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
      </Menu>
    </>
  )
}
