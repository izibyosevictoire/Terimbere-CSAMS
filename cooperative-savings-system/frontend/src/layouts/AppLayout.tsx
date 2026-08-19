import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
import { BrandLogo } from '@/shared/components/BrandLogo'
import { MemberNavMenu } from '@/shared/components/MemberNavMenu'
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
        <BrandLogo size={36} />
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
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'rgba(255,255,255,0.12)',
          bgcolor: '#0A0A0A',
          color: '#FFFFFF',
        }}
      >
        <Toolbar sx={{ gap: { xs: 0.5, md: 1.5 }, minHeight: { xs: 56, sm: 64 } }}>
          {!isMdUp ? (
            <IconButton
              edge="start"
              aria-label={t('common.openMenu')}
              onClick={() => setMobileOpen(true)}
              sx={{ minWidth: 44, minHeight: 44, color: '#FFFFFF' }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          {!isMdUp && !isAdmin && location.pathname !== ROUTES.dashboard ? (
            <IconButton
              component={NavLink}
              to={ROUTES.dashboard}
              aria-label={t('common.backToDashboard')}
              sx={{ minWidth: 44, minHeight: 44, color: '#FFFFFF' }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : null}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <BrandLogo size={32} />
            </Box>
            <Typography
              variant="h6"
              component={NavLink}
              to={ROUTES.dashboard}
              sx={{
                textDecoration: 'none',
                color: '#FFFFFF',
                fontFamily: 'var(--font-brand)',
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
                  color: location.pathname === ROUTES.dashboard ? 'primary.light' : '#FFFFFF',
                }}
              >
                {t('nav.dashboard')}
              </Button>
              {isAdmin ? <AdminNavMenu /> : <MemberNavMenu />}
            </Box>
          ) : null}

          <Box sx={{ flex: 1 }} />

          {isMdUp ? (
            <>
              <LanguageSwitcher onDark />
              <ThemeSwitcher />
              <PwaInstallButton />
              <CooperativeSelector onDark />
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
