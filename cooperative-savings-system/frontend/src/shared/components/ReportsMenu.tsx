import AssessmentIcon from '@mui/icons-material/Assessment'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
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
import { ROUTES } from '@/shared/constants/routes'

const PRIMARY_REPORTS = [
  { type: 'CONTRIBUTIONS', labelKey: 'reports.primary.contributions' },
  { type: 'INVESTMENTS', labelKey: 'reports.primary.investments' },
  { type: 'FULL_FINANCIAL', labelKey: 'reports.primary.full' },
] as const

const ADVANCED_REPORTS = [
  { type: 'MEMBERS', labelKey: 'reports.types.MEMBERS' },
  { type: 'LOANS', labelKey: 'reports.types.LOANS' },
  { type: 'REPAYMENTS', labelKey: 'reports.types.REPAYMENTS' },
  { type: 'FINES', labelKey: 'reports.types.FINES' },
  { type: 'FINE_PAYMENTS', labelKey: 'reports.types.FINE_PAYMENTS' },
  { type: 'SOCIAL_FUND', labelKey: 'reports.types.SOCIAL_FUND' },
  { type: 'INCOME', labelKey: 'reports.types.INCOME' },
  { type: 'EXPENSES', labelKey: 'reports.types.EXPENSES' },
  { type: 'PAYOUTS', labelKey: 'reports.types.PAYOUTS' },
  { type: 'FINANCIAL_LEDGER', labelKey: 'reports.types.FINANCIAL_LEDGER' },
  { type: 'AUDIT_LOGS', labelKey: 'reports.types.AUDIT_LOGS' },
] as const

interface ReportsMenuProps {
  buttonVariant?: 'contained' | 'outlined' | 'text'
  size?: 'small' | 'medium'
}

export function ReportsMenu({ buttonVariant = 'outlined', size = 'medium' }: ReportsMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const go = (type: string) => {
    setAnchor(null)
    navigate(`${ROUTES.reports}?type=${type}`)
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
        {t('nav.reports')}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 280, maxHeight: 480 } } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">
            {t('reports.primaryTitle')}
          </Typography>
        </Box>
        {PRIMARY_REPORTS.map((item) => (
          <MenuItem key={item.type} onClick={() => go(item.type)}>
            <ListItemIcon>
              <AssessmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t(item.labelKey)}</ListItemText>
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
          <Typography variant="overline" color="text.secondary">
            {t('reports.advancedTitle')}
          </Typography>
        </Box>
        {ADVANCED_REPORTS.map((item) => (
          <MenuItem key={item.type} onClick={() => go(item.type)}>
            <ListItemText>{t(item.labelKey, { defaultValue: item.type })}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            navigate(ROUTES.reports)
          }}
        >
          <ListItemText>{t('reports.openAll')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
