import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AssessmentIcon from '@mui/icons-material/Assessment'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import GavelIcon from '@mui/icons-material/Gavel'
import GroupsIcon from '@mui/icons-material/Groups'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import HistoryIcon from '@mui/icons-material/History'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PaymentsIcon from '@mui/icons-material/Payments'
import PersonIcon from '@mui/icons-material/Person'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SavingsIcon from '@mui/icons-material/Savings'
import SettingsIcon from '@mui/icons-material/Settings'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import type { SvgIconComponent } from '@mui/icons-material'
import { ROUTES } from '@/shared/constants/routes'
import { ROLE_COOPERATIVE_ADMIN, ROLE_SUPER_ADMIN } from '@/shared/types/auth'

export interface NavItem {
  labelKey: string
  path: string
  icon: SvgIconComponent
  /** If set, user must have at least one of these roles to see the item. */
  roles?: string[]
  /** Optional grouping for Admin menus. */
  group?: 'main' | 'advanced' | 'super'
}

const COOP_ADMIN_ROLES = [ROLE_COOPERATIVE_ADMIN]
const SUPER_ADMIN_ROLES = [ROLE_SUPER_ADMIN]

/** Top-level Dashboard link — all authenticated users. */
export const dashboardNavItem: NavItem = {
  labelKey: 'nav.dashboard',
  path: ROUTES.dashboard,
  icon: DashboardIcon,
}

/**
 * MEMBER-facing primary navigation (mobile drawer + simplified menus).
 * Labels use member-oriented wording where possible.
 */
export const memberNavItems: NavItem[] = [
  dashboardNavItem,
  { labelKey: 'nav.myContributions', path: ROUTES.contributions, icon: SavingsIcon },
  { labelKey: 'nav.myLoans', path: ROUTES.loans, icon: AccountBalanceWalletIcon },
  { labelKey: 'nav.myFines', path: ROUTES.fines, icon: GavelIcon },
  { labelKey: 'nav.mySocial', path: ROUTES.socialFund, icon: FavoriteIcon },
  { labelKey: 'nav.shareOut', path: ROUTES.payouts, icon: PaymentsIcon },
  { labelKey: 'nav.notifications', path: ROUTES.notifications, icon: NotificationsIcon },
  { labelKey: 'nav.profile', path: ROUTES.profile, icon: PersonIcon },
]

/** Admin modules shown under Admin ▼ (and in mobile drawer for admins). */
export const adminModuleNavItems: NavItem[] = [
  { labelKey: 'nav.members', path: ROUTES.members, icon: GroupsIcon, roles: COOP_ADMIN_ROLES, group: 'main' },
  {
    labelKey: 'nav.contributions',
    path: ROUTES.contributions,
    icon: SavingsIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  { labelKey: 'nav.loans', path: ROUTES.loans, icon: AccountBalanceWalletIcon, roles: COOP_ADMIN_ROLES, group: 'main' },
  { labelKey: 'nav.fines', path: ROUTES.fines, icon: GavelIcon, roles: COOP_ADMIN_ROLES, group: 'main' },
  {
    labelKey: 'nav.finePaymentQueue',
    path: ROUTES.finePayments,
    icon: GavelIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.socialDashboard',
    path: ROUTES.socialFund,
    icon: FavoriteIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.investments',
    path: ROUTES.investments,
    icon: ShowChartIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.shareOut',
    path: ROUTES.payouts,
    icon: PaymentsIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.transactions',
    path: ROUTES.transactions,
    icon: ReceiptLongIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.reports',
    path: ROUTES.reports,
    icon: AssessmentIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.notifications',
    path: ROUTES.notifications,
    icon: NotificationsIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.settings',
    path: ROUTES.settings,
    icon: SettingsIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'main',
  },
  {
    labelKey: 'nav.ledger',
    path: ROUTES.ledger,
    icon: MenuBookIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'advanced',
  },
  {
    labelKey: 'nav.auditLogs',
    path: ROUTES.auditLogs,
    icon: HistoryIcon,
    roles: COOP_ADMIN_ROLES,
    group: 'advanced',
  },
  {
    labelKey: 'nav.cooperatives',
    path: ROUTES.cooperatives,
    icon: AccountBalanceIcon,
    roles: SUPER_ADMIN_ROLES,
    group: 'super',
  },
  {
    labelKey: 'nav.system',
    path: ROUTES.system,
    icon: HealthAndSafetyIcon,
    roles: SUPER_ADMIN_ROLES,
    group: 'super',
  },
]

/**
 * Backward-compatible combined lists used by older tests / imports.
 * Prefer memberNavItems / adminModuleNavItems for new UI.
 */
export const mainNavItems: NavItem[] = [
  dashboardNavItem,
  ...adminModuleNavItems.filter((i) => i.group === 'main' || !i.group),
  { labelKey: 'nav.profile', path: ROUTES.profile, icon: PersonIcon },
]

export const adminNavItems: NavItem[] = adminModuleNavItems.filter(
  (i) => i.group === 'advanced' || i.group === 'super',
)

export function canAccessNavItem(item: NavItem, userRoles: string[]): boolean {
  if (!item.roles?.length) return true
  return item.roles.some((role) => userRoles.includes(role))
}

export function isCooperativeAdminUser(userRoles: string[]): boolean {
  return userRoles.includes(ROLE_COOPERATIVE_ADMIN)
}

export function isSuperAdminUser(userRoles: string[]): boolean {
  return userRoles.includes(ROLE_SUPER_ADMIN)
}

export function isAdminUser(userRoles: string[]): boolean {
  return isCooperativeAdminUser(userRoles) || isSuperAdminUser(userRoles)
}

export const superAdminNavItems: NavItem[] = [
  dashboardNavItem,
  {
    labelKey: 'nav.cooperatives',
    path: ROUTES.cooperatives,
    icon: AccountBalanceIcon,
    roles: SUPER_ADMIN_ROLES,
  },
  { labelKey: 'nav.notifications', path: ROUTES.notifications, icon: NotificationsIcon },
  { labelKey: 'nav.profile', path: ROUTES.profile, icon: PersonIcon },
]

export function getMobileNavItems(userRoles: string[]): NavItem[] {
  if (isCooperativeAdminUser(userRoles)) {
    const items: NavItem[] = [
      dashboardNavItem,
      ...adminModuleNavItems.filter((item) => canAccessNavItem(item, userRoles)),
      { labelKey: 'nav.profile', path: ROUTES.profile, icon: PersonIcon },
    ]
    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.path)) return false
      seen.add(item.path)
      return true
    })
  }
  if (isSuperAdminUser(userRoles)) {
    return superAdminNavItems.filter((item) => canAccessNavItem(item, userRoles))
  }
  return memberNavItems.filter((item) => canAccessNavItem(item, userRoles))
}
