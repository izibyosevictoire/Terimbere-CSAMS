import AddIcon from '@mui/icons-material/Add'
import FavoriteIcon from '@mui/icons-material/Favorite'
import GavelIcon from '@mui/icons-material/Gavel'
import GroupsIcon from '@mui/icons-material/Groups'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import PaymentsIcon from '@mui/icons-material/Payments'
import SavingsIcon from '@mui/icons-material/Savings'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Button,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import type { SvgIconComponent } from '@mui/icons-material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/shared/constants/routes'

export interface QuickActionItem {
  id: string
  labelKey: string
  badgeKey: string
  badgeColor:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'
  icon: SvgIconComponent
  path: string
  group: 'quick' | 'group'
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'add-member',
    labelKey: 'actions.addMember',
    badgeKey: 'actions.badges.add',
    badgeColor: 'success',
    icon: AddIcon,
    path: `${ROUTES.members}?action=register`,
    group: 'quick',
  },
  {
    id: 'update-contributions',
    labelKey: 'actions.updateContributions',
    badgeKey: 'actions.badges.edit',
    badgeColor: 'info',
    icon: SavingsIcon,
    path: `${ROUTES.contributions}?tab=monthly`,
    group: 'quick',
  },
  {
    id: 'special-contributions',
    labelKey: 'actions.specialContributions',
    badgeKey: 'actions.badges.special',
    badgeColor: 'secondary',
    icon: VolunteerActivismIcon,
    path: `${ROUTES.contributions}?tab=special`,
    group: 'quick',
  },
  {
    id: 'manage-loans',
    labelKey: 'actions.manageLoans',
    badgeKey: 'actions.badges.loan',
    badgeColor: 'warning',
    icon: AccountBalanceWalletIcon,
    path: ROUTES.loans,
    group: 'quick',
  },
  {
    id: 'manage-fines',
    labelKey: 'actions.manageFines',
    badgeKey: 'actions.badges.fine',
    badgeColor: 'error',
    icon: GavelIcon,
    path: ROUTES.fines,
    group: 'quick',
  },
  {
    id: 'fine-payment-queue',
    labelKey: 'actions.finePaymentQueue',
    badgeKey: 'actions.badges.clear',
    badgeColor: 'error',
    icon: GavelIcon,
    path: ROUTES.finePayments,
    group: 'quick',
  },
  {
    id: 'member-view',
    labelKey: 'actions.memberView',
    badgeKey: 'actions.badges.view',
    badgeColor: 'primary',
    icon: GroupsIcon,
    path: ROUTES.members,
    group: 'quick',
  },
  {
    id: 'change-password',
    labelKey: 'actions.changePassword',
    badgeKey: 'actions.badges.password',
    badgeColor: 'default',
    icon: LockOutlinedIcon,
    path: ROUTES.changePassword,
    group: 'quick',
  },
  {
    id: 'share-out',
    labelKey: 'actions.shareOutPayout',
    badgeKey: 'actions.badges.payout',
    badgeColor: 'success',
    icon: PaymentsIcon,
    path: `${ROUTES.payouts}?tab=new`,
    group: 'group',
  },
  {
    id: 'create-investment',
    labelKey: 'actions.createInvestment',
    badgeKey: 'actions.badges.invest',
    badgeColor: 'success',
    icon: ShowChartIcon,
    path: `${ROUTES.investments}?action=create`,
    group: 'group',
  },
  {
    id: 'social-dashboard',
    labelKey: 'actions.socialDashboard',
    badgeKey: 'actions.badges.social',
    badgeColor: 'secondary',
    icon: FavoriteIcon,
    path: ROUTES.socialFund,
    group: 'group',
  },
]

interface QuickActionsMenuProps {
  buttonVariant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium'
}

export function QuickActionsMenu({
  buttonVariant = 'outlined',
  size = 'medium',
}: QuickActionsMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const quick = QUICK_ACTIONS.filter((a) => a.group === 'quick')
  const group = QUICK_ACTIONS.filter((a) => a.group === 'group')

  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  const renderItem = (item: QuickActionItem) => {
    const Icon = item.icon
    return (
      <MenuItem key={item.id} onClick={() => go(item.path)} sx={{ py: 1.25, gap: 1 }}>
        <ListItemIcon>
          <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={t(item.labelKey)} />
        <Chip
          size="small"
          label={t(item.badgeKey)}
          color={item.badgeColor}
          sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.4 }}
        />
      </MenuItem>
    )
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={size}
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
      >
        {t('common.actions')}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 320, maxHeight: 520 } } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">
            {t('actions.quickActions')}
          </Typography>
        </Box>
        {quick.map(renderItem)}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">
            {t('actions.groupActions')}
          </Typography>
        </Box>
        {group.map(renderItem)}
      </Menu>
    </>
  )
}
