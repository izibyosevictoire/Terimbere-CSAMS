import MenuIcon from '@mui/icons-material/Menu'
import {
  AppBar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import { useAppSelector } from '@/app/store/hooks'
import { fetchUnreadCount } from '@/shared/api/notifications'
import { PwaInstallButton } from '@/pwa/PwaInstallButton'
import { AdminNavMenu } from '@/shared/components/AdminNavMenu'
import { CooperativeSelector } from '@/shared/components/CooperativeSelector'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { OfflineBanner } from '@/shared/components/OfflineBanner'
import { ThemeSwitcher } from '@/shared/components/ThemeSwitcher'
import { UserMenu } from '@/shared/components/UserMenu'
import { ROUTES } from '@/shared/constants/routes'
import { getMobileNavItems } from './navItems'

const DRAWER_WIDTH = 280
const UNREAD_POLL_MS = 60_000

export function AppLayout() {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const location = useLocation()
  const userRoles = useAppSelector((s) => s.auth.user?.roles ?? [])
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const [mobileOpen, setMobileOpen] = useState(false)

  const mobileItems = getMobileNavItems(userRoles)

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    enabled: Boolean(accessToken),
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  const unreadCount = unreadQuery.data ?? 0

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const renderNavItem = (item: (typeof mobileItems)[number]) => {
    const Icon = item.icon
    const selected =
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    const showBadge = item.path === ROUTES.notifications && unreadCount > 0

    return (
      <ListItemButton
        key={`${item.labelKey}-${item.path}`}
        component={NavLink}
        to={item.path}
        selected={selected}
        sx={{ borderRadius: 2, mb: 0.5, minHeight: 44 }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          {showBadge ? (
            <Badge color="error" badgeContent={unreadCount > 99 ? '99+' : unreadCount}>
              <Icon fontSize="small" />
            </Badge>
          ) : (
            <Icon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText primary={t(item.labelKey)} />
      </ListItemButton>
    )
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5, gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
          }}
        >
          T
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.1, fontSize: '1.15rem' }}>
            {t('app.name')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            CSAMS
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <LanguageSwitcher />
        <ThemeSwitcher />
        <CooperativeSelector />
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1.5, flex: 1, overflowY: 'auto' }}>{mobileItems.map(renderNavItem)}</List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ gap: { xs: 0.5, md: 1.5 }, minHeight: { xs: 56, sm: 64 } }}>
          {!isMdUp ? (
            <IconButton
              edge="start"
              aria-label={t('common.openMenu')}
              onClick={() => setMobileOpen(true)}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: { xs: 'none', sm: 'grid' },
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              T
            </Box>
            <Typography
              variant="h6"
              component={NavLink}
              to={ROUTES.dashboard}
              sx={{
                textDecoration: 'none',
                color: 'text.primary',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.15rem' },
                whiteSpace: 'nowrap',
              }}
            >
              {t('app.name')}
            </Typography>
          </Box>

          {isMdUp ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
              <Button
                component={NavLink}
                to={ROUTES.dashboard}
                color="inherit"
                sx={{
                  fontWeight: 600,
                  minHeight: 40,
                  color: location.pathname.startsWith(ROUTES.dashboard)
                    ? 'primary.main'
                    : 'text.primary',
                }}
              >
                {t('nav.dashboard')}
              </Button>
              {isAdmin ? <AdminNavMenu /> : null}
            </Box>
          ) : null}

          <Box sx={{ flex: 1 }} />

          {isMdUp ? (
            <>
              <LanguageSwitcher />
              <ThemeSwitcher />
              <PwaInstallButton />
              <CooperativeSelector />
            </>
          ) : (
            <PwaInstallButton />
          )}

          <UserMenu />
        </Toolbar>
      </AppBar>
      <OfflineBanner />

      {!isMdUp ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : null}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minWidth: 0,
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1280, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
