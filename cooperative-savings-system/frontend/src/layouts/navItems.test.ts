import { describe, expect, it } from 'vitest'
import {
  canAccessNavItem,
  getMobileNavItems,
  isAdminUser,
  type NavItem,
} from '@/layouts/navItems'
import { ROLE_COOPERATIVE_ADMIN, ROLE_SUPER_ADMIN } from '@/shared/types/auth'
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
  roles: [ROLE_COOPERATIVE_ADMIN, ROLE_SUPER_ADMIN],
}

const superItem: NavItem = {
  labelKey: 'nav.system',
  path: '/system',
  icon: DashboardIcon,
  roles: [ROLE_SUPER_ADMIN],
}

describe('canAccessNavItem', () => {
  it('allows unrestricted items for any authenticated role set', () => {
    expect(canAccessNavItem(memberItem, [])).toBe(true)
    expect(canAccessNavItem(memberItem, ['MEMBER'])).toBe(true)
  })

  it('hides admin financial menus from members', () => {
    expect(canAccessNavItem(adminItem, ['MEMBER'])).toBe(false)
    expect(canAccessNavItem(adminItem, [ROLE_COOPERATIVE_ADMIN])).toBe(true)
    expect(canAccessNavItem(adminItem, [ROLE_SUPER_ADMIN])).toBe(true)
  })

  it('restricts super-admin items', () => {
    expect(canAccessNavItem(superItem, [ROLE_COOPERATIVE_ADMIN])).toBe(false)
    expect(canAccessNavItem(superItem, [ROLE_SUPER_ADMIN])).toBe(true)
  })
})

describe('getMobileNavItems', () => {
  it('returns simplified member navigation', () => {
    const items = getMobileNavItems(['MEMBER'])
    expect(items.some((i) => i.path === '/dashboard')).toBe(true)
    expect(items.some((i) => i.path === '/ledger')).toBe(false)
    expect(items.some((i) => i.path === '/audit-logs')).toBe(false)
    expect(isAdminUser(['MEMBER'])).toBe(false)
  })

  it('includes admin modules for cooperative admins', () => {
    const items = getMobileNavItems([ROLE_COOPERATIVE_ADMIN])
    expect(items.some((i) => i.path === '/members')).toBe(true)
    expect(items.some((i) => i.path === '/fine-payments')).toBe(true)
    expect(items.some((i) => i.path === '/system')).toBe(false)
    expect(isAdminUser([ROLE_COOPERATIVE_ADMIN])).toBe(true)
  })
})
