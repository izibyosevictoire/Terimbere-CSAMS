import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined'
import {
  Avatar,
  Button,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { clearAuth, selectIsCooperativeAdmin, selectIsSuperAdmin } from '@/app/store/authSlice'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { logout as logoutRequest } from '@/shared/api/auth'
import { ROUTES } from '@/shared/constants/routes'

export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const isCoopAdmin = useAppSelector(selectIsCooperativeAdmin)
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
  const badgeLabel = isSuperAdmin
    ? t('roles.superAdminBadge')
    : isCoopAdmin
      ? t('roles.adminBadge')
      : t('roles.memberBadge')
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const label = user?.username || user?.firstName || t('nav.profile')

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    setAnchor(null)
    try {
      await logoutRequest()
    } catch {
      // clear anyway
    } finally {
      dispatch(clearAuth())
      navigate(ROUTES.login, { replace: true })
      setLoggingOut(false)
    }
  }

  return (
    <>
      <Button
        color="inherit"
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={
          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 14 }}>
            {(label[0] || 'U').toUpperCase()}
          </Avatar>
        }
        endIcon={
          <Chip label={badgeLabel} size="small" color="primary" sx={{ height: 22, display: { xs: 'none', sm: 'inline-flex' } }} />
        }
        aria-haspopup="menu"
        aria-label={t('nav.profile')}
        sx={{
          minHeight: 40,
          textTransform: 'none',
          maxWidth: { xs: 140, sm: 220 },
          '& .MuiButton-startIcon': { mr: 1 },
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null)
            navigate(ROUTES.profile)
          }}
        >
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('nav.profile')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            navigate(ROUTES.changePassword)
          }}
        >
          <ListItemIcon>
            <LockOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('profile.changePassword')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void handleLogout()} disabled={loggingOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('common.logout')}</ListItemText>
        </MenuItem>
        {!user ? (
          <MenuItem disabled>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>—</ListItemText>
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}
