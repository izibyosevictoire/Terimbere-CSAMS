import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import GavelIcon from '@mui/icons-material/Gavel'
import PaymentsIcon from '@mui/icons-material/Payments'
import PercentIcon from '@mui/icons-material/Percent'
import SavingsIcon from '@mui/icons-material/Savings'
import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { getErrorMessage } from '@/shared/api/client'
import { fetchMemberFinancialSummary } from '@/shared/api/members'
import { ErrorState } from '@/shared/components/ErrorState'
import { MetricCard } from '@/shared/components/MetricCard'
import { formatMoney } from '@/shared/utils/formatMoney'
import { ROUTES } from '@/shared/constants/routes'
import { MonthlyContributionsChart } from './MonthlyContributionsChart'

const METRIC_COLS = { xs: 12, sm: 6, md: 4, lg: 2.4 }

const QUICK_LINKS = [
  { labelKey: 'dashboard.member.links.contributions', path: ROUTES.contributions, icon: SavingsIcon },
  { labelKey: 'dashboard.member.links.loans', path: ROUTES.loans, icon: AccountBalanceWalletIcon },
  { labelKey: 'dashboard.member.links.fines', path: ROUTES.fines, icon: GavelIcon },
  { labelKey: 'dashboard.member.links.social', path: ROUTES.socialFund, icon: FavoriteIcon },
  { labelKey: 'dashboard.member.links.payouts', path: ROUTES.payouts, icon: PaymentsIcon },
] as const

interface MemberDashboardProps {
  cooperativeId: string
}

export function MemberDashboard({ cooperativeId }: MemberDashboardProps) {
  const { t } = useTranslation()
  const user = useAppSelector((s) => s.auth.user)

  const summaryQuery = useQuery({
    queryKey: ['members', 'financial-summary', cooperativeId, user?.id],
    queryFn: () => fetchMemberFinancialSummary(cooperativeId, user!.id),
    enabled: Boolean(cooperativeId && user?.id),
  })

  const summary = summaryQuery.data
  const currency = summary?.currency || 'RWF'
  const loading = summaryQuery.isLoading
  const money = (value: string | number | null | undefined) =>
    formatMoney(value ?? 0, { currency })

  const outstandingLoan =
    (Number(summary?.outstandingLoanPrincipal) || 0) +
    (Number(summary?.outstandingLoanInterest) || 0)

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('dashboard.member.welcome', { name: user?.firstName || user?.fullName || '' })}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.description')}
        </Typography>
      </Box>

      {summaryQuery.isError ? (
        <Box sx={{ mb: 2 }}>
          <ErrorState
            message={getErrorMessage(summaryQuery.error)}
            onRetry={() => void summaryQuery.refetch()}
          />
        </Box>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={METRIC_COLS}>
          <MetricCard
            label={t('dashboard.member.totalContributions')}
            value={money(summary?.actualContributions)}
            icon={<SavingsIcon fontSize="small" />}
            accent="blue"
            loading={loading}
          />
        </Grid>
        <Grid size={METRIC_COLS}>
          <MetricCard
            label={t('dashboard.member.outstandingLoan')}
            value={money(outstandingLoan)}
            icon={<AccountBalanceWalletIcon fontSize="small" />}
            accent="orange"
            loading={loading}
          />
        </Grid>
        <Grid size={METRIC_COLS}>
          <MetricCard
            label={t('dashboard.member.outstandingFines')}
            value={money(summary?.unpaidFines)}
            icon={<GavelIcon fontSize="small" />}
            accent="red"
            loading={loading}
          />
        </Grid>
        <Grid size={METRIC_COLS}>
          <MetricCard
            label={t('dashboard.member.socialContributions')}
            value={money(summary?.socialContributions)}
            icon={<FavoriteIcon fontSize="small" />}
            accent="purple"
            loading={loading}
          />
        </Grid>
        <Grid size={METRIC_COLS}>
          <MetricCard
            label={t('dashboard.member.contributionPercentage')}
            value={
              summary?.contributionPercentage != null && summary.contributionPercentage !== ''
                ? `${Number(summary.contributionPercentage).toFixed(2)}%`
                : '—'
            }
            icon={<PercentIcon fontSize="small" />}
            accent="green"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{ p: { xs: 2.5, md: 3 }, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Typography variant="h6" gutterBottom>
          {t('dashboard.member.quickLinksTitle')}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Paper
                key={link.path}
                component={RouterLink}
                to={link.path}
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  textDecoration: 'none',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  minHeight: 44,
                  '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                }}
              >
                <Icon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t(link.labelKey)}
                </Typography>
                <ChevronRightIcon fontSize="small" sx={{ ml: 0.25, opacity: 0.7 }} />
              </Paper>
            )
          })}
        </Stack>
      </Paper>

      <MonthlyContributionsChart cooperativeId={cooperativeId} currency={currency} />
    </Box>
  )
}
