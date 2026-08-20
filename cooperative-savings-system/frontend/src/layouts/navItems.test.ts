import { describe, expect, it } from 'vitest'
import {
  canAccessNavItem,
  getMobileNavItems,
  isAdminUser,
  isCooperativeAdminUser,
  isSuperAdminUser,
  type NavItem,
} from '@/layouts/navItems'
import { ROLE_COOPERATIVE_ADMIN, ROLE_MEMBER, ROLE_SUPER_ADMIN } from '@/shared/types/auth'
import DashboardIcon from '@mui/icons-material/Dashboard'

const memberItem: NavItem = {
  labelKey: 'nav.dashboard',
  path: '/dashboard',
  icon: DashboardIcon,
}

const adminItem: NavItem = {
  labelKey: 'nav.members',
  path: '/members',
  icon: DashboardIcon,
  roles: [ROLE_COOPERATIVE_ADMIN],
}

const superItem: NavItem = {
  labelKey: 'nav.cooperatives',
  path: '/cooperatives',
  icon: DashboardIcon,
  roles: [ROLE_SUPER_ADMIN],
}

describe('canAccessNavItem', () => {
  it('allows unrestricted items for any authenticated role set', () => {
    expect(canAccessNavItem(memberItem, [])).toBe(true)
    expect(canAccessNavItem(memberItem, [ROLE_MEMBER])).toBe(true)
  })

  it('hides cooperative-admin menus from members and super admins', () => {
    expect(canAccessNavItem(adminItem, [ROLE_MEMBER])).toBe(false)
    expect(canAccessNavItem(adminItem, [ROLE_SUPER_ADMIN])).toBe(false)
    expect(canAccessNavItem(adminItem, [ROLE_COOPERATIVE_ADMIN])).toBe(true)
  })

  it('restricts super-admin items to SUPER_ADMIN', () => {
    expect(canAccessNavItem(superItem, [ROLE_COOPERATIVE_ADMIN])).toBe(false)
    expect(canAccessNavItem(superItem, [ROLE_MEMBER])).toBe(false)
    expect(canAccessNavItem(superItem, [ROLE_SUPER_ADMIN])).toBe(true)
  })
})

describe('getMobileNavItems', () => {
  it('returns simplified member navigation', () => {
    const items = getMobileNavItems([ROLE_MEMBER])
    expect(items.some((i) => i.path === '/dashboard')).toBe(true)
    expect(items.some((i) => i.path === '/ledger')).toBe(false)
    expect(items.some((i) => i.path === '/audit-logs')).toBe(false)
    expect(items.some((i) => i.path === '/cooperatives')).toBe(false)
    expect(isAdminUser([ROLE_MEMBER])).toBe(false)
  })

  it('includes admin modules for cooperative admins only', () => {
    const items = getMobileNavItems([ROLE_COOPERATIVE_ADMIN])
    expect(items.some((i) => i.path === '/members')).toBe(true)
    expect(items.some((i) => i.path === '/fine-payments')).toBe(true)
    expect(items.some((i) => i.path === '/cooperatives')).toBe(false)
    expect(isCooperativeAdminUser([ROLE_COOPERATIVE_ADMIN])).toBe(true)
    expect(isSuperAdminUser([ROLE_COOPERATIVE_ADMIN])).toBe(false)
  })

  it('gives super admins cooperatives, not day-to-day admin modules', () => {
    const items = getMobileNavItems([ROLE_SUPER_ADMIN])
    expect(items.some((i) => i.path === '/cooperatives')).toBe(true)
    expect(items.some((i) => i.path === '/members')).toBe(false)
    expect(items.some((i) => i.path === '/ledger')).toBe(false)
    expect(isSuperAdminUser([ROLE_SUPER_ADMIN])).toBe(true)
  })
})
