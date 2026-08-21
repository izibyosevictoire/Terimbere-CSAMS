import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import GavelIcon from '@mui/icons-material/Gavel'
import GroupsIcon from '@mui/icons-material/Groups'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PaymentsIcon from '@mui/icons-material/Payments'
import PercentIcon from '@mui/icons-material/Percent'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import SavingsIcon from '@mui/icons-material/Savings'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsSuperAdmin } from '@/app/store/authSlice'
import { getErrorMessage } from '@/shared/api/client'
import { fetchMyCooperatives } from '@/shared/api/cooperatives'
import { fetchDashboardSummary } from '@/shared/api/dashboard'
import { CooperativeSelector } from '@/shared/components/CooperativeSelector'
import { ErrorState } from '@/shared/components/ErrorState'
import { MetricCard } from '@/shared/components/MetricCard'
import { QuickActionsMenu } from '@/shared/components/QuickActionsMenu'
import { ReportsMenu } from '@/shared/components/ReportsMenu'
import { RoleDutiesNote } from '@/shared/components/RoleDutiesNote'
import { ROUTES } from '@/shared/constants/routes'
import { formatMoney } from '@/shared/utils/formatMoney'
import { primaryRole } from '@/shared/types/auth'
import { MemberFinancialSummarySection } from './MemberFinancialSummarySection'
import { MonthlyContributionsChart } from './MonthlyContributionsChart'

const OBLIGATIONS_METRIC_COLS = { xs: 12, sm: 6, md: 4, lg: 2 }
const PRIMARY_METRIC_COLS = { xs: 12, sm: 6, md: 4, lg: 2 }

interface AdminDashboardProps {
  cooperativeId: string
}

export function AdminDashboard({ cooperativeId }: AdminDashboardProps) {
  const { t } = useTranslation()
  const authStatus = useAppSelector((s) => s.auth.status)
  const userRoles = useAppSelector((s) => s.auth.user?.roles ?? [])
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin)
  const officeRole = primaryRole(userRoles)

  const cooperativesQuery = useQuery({
    queryKey: ['cooperatives', 'mine'],
    queryFn: fetchMyCooperatives,
    enabled: authStatus === 'authenticated',
    staleTime: 60_000,
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', cooperativeId],
    queryFn: () => fetchDashboardSummary(cooperativeId),
    enabled: Boolean(cooperativeId),
  })

  const summary = summaryQuery.data
  const currency = summary?.currency || 'RWF'
  const loading = summaryQuery.isLoading
  const cooperativeName = cooperativesQuery.data?.find((c) => c.id === cooperativeId)?.name

  const money = (value: string | number | null | undefined) =>
    formatMoney(value ?? 0, { currency })

  const totalInterest =
    (Number(summary?.loanInterestEarned) || 0) + (Number(summary?.investmentProfits) || 0)

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
            <Typography variant="h4" component="h1">
              {t('dashboard.admin.title')}
            </Typography>
            <Chip
              label={
                isSuperAdmin
                  ? t('roles.superAdminBadge')
                  : t(`roles.${officeRole}`, { defaultValue: t('dashboard.admin.adminChip') })
              }
              color="primary"
              size="small"
              sx={{ fontWeight: 700, letterSpacing: 0.4 }}
            />
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {cooperativeName || t('dashboard.description')}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <CooperativeSelector />
          <QuickActionsMenu />
          <ReportsMenu />
        </Stack>
      </Box>

      <Box sx={{ mb: 3 }}>
        <RoleDutiesNote roles={userRoles} />
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
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.totalMembers')}
            value={summary ? String(summary.totalMembers) : '—'}
            hint={t('dashboard.metrics.activeMembersHint', { count: summary?.activeMembers ?? 0 })}
            icon={<GroupsIcon fontSize="small" />}
            accent="blue"
            loading={loading}
          />
        </Grid>
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.regularContributions')}
            value={summary ? money(summary.regularContributionsTotal) : '—'}
            hint={t('dashboard.metrics.regularHint')}
            icon={<SavingsIcon fontSize="small" />}
            accent="green"
            loading={loading}
          />
        </Grid>
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.specialContributions')}
            value={summary ? money(summary.specialContributionsTotal) : '—'}
            hint={t('dashboard.metrics.specialHint')}
            icon={<VolunteerActivismIcon fontSize="small" />}
            accent="purple"
            loading={loading}
          />
        </Grid>
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.actualContributions')}
            value={summary ? money(summary.actualContributionsTotal) : '—'}
            hint={t('dashboard.metrics.actualHint')}
            icon={<PaymentsIcon fontSize="small" />}
            accent="blue"
            loading={loading}
          />
        </Grid>
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.totalInterest')}
            value={summary ? money(totalInterest) : '—'}
            hint={t('dashboard.metrics.totalInterestHint', {
              loan: money(summary?.loanInterestEarned ?? 0),
              investment: money(summary?.investmentProfits ?? 0),
            })}
            icon={<TrendingUpIcon fontSize="small" />}
            accent="gold"
            loading={loading}
          />
        </Grid>
        <Grid size={PRIMARY_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.availableInterest')}
            value={summary?.availableInterest != null ? money(summary.availableInterest) : '—'}
            hint={t('dashboard.metrics.availableInterestHint')}
            icon={<PercentIcon fontSize="small" />}
            accent="blue"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
          borderLeft: '4px solid',
          borderLeftColor: 'primary.main',
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
          {t('dashboard.metrics.availableGroupFunds')}
        </Typography>
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, my: 1, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}
        >
          {summary ? money(summary.availableGroupFunds) : '—'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
          {t('dashboard.admin.availableFundsHint')}
        </Typography>
        {summary?.pendingSpecialApprovals ? (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 600 }}>
            {t('dashboard.metrics.pendingApprovals', { count: summary.pendingSpecialApprovals })}
          </Typography>
        ) : null}
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        {t('dashboard.admin.obligationsTitle')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.outstandingLoans')}
            value={summary?.outstandingLoanPrincipal != null ? money(summary.outstandingLoanPrincipal) : '—'}
            icon={<AccountBalanceWalletIcon fontSize="small" />}
            accent="orange"
            loading={loading}
          />
        </Grid>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.unpaidFines')}
            value={summary?.unpaidFines != null ? String(summary.unpaidFines) : '—'}
            icon={<GavelIcon fontSize="small" />}
            accent="red"
            loading={loading}
          />
        </Grid>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.totalFines')}
            value={summary?.totalFines != null ? String(summary.totalFines) : '—'}
            icon={<GavelIcon fontSize="small" />}
            accent="red"
            loading={loading}
          />
        </Grid>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.membersWithFines')}
            value={summary?.membersWithFines != null ? String(summary.membersWithFines) : '—'}
            icon={<PeopleAltIcon fontSize="small" />}
            accent="orange"
            loading={loading}
          />
        </Grid>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.pendingFinePayments')}
            value={summary?.pendingFinePayments != null ? String(summary.pendingFinePayments) : '—'}
            icon={<HourglassEmptyIcon fontSize="small" />}
            accent="gold"
            loading={loading}
          />
        </Grid>
        <Grid size={OBLIGATIONS_METRIC_COLS}>
          <MetricCard
            label={t('dashboard.metrics.overdueLoans')}
            value={summary?.overdueLoansCount != null ? String(summary.overdueLoansCount) : '—'}
            icon={<WarningAmberIcon fontSize="small" />}
            accent="red"
            loading={loading}
          />
        </Grid>
      </Grid>

      {summary?.overdueLoansCount ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3 },
            mb: 3,
            border: '1px solid',
            borderColor: 'warning.light',
            bgcolor: 'rgba(217, 119, 6, 0.06)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.admin.pendingRepaymentsTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.pendingRepaymentsDescription', {
                count: summary.overdueLoansCount,
              })}
            </Typography>
          </Box>
          <Button component={RouterLink} to={ROUTES.loans} variant="contained" color="warning">
            {t('dashboard.admin.manageLoans')}
          </Button>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('dashboard.admin.pendingRepaymentsTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('dashboard.admin.pendingRepaymentsEmpty', {
              defaultValue: 'No pending repayments.',
            })}
          </Typography>
        </Paper>
      )}

      <Box sx={{ mb: 3 }}>
        <MemberFinancialSummarySection cooperativeId={cooperativeId} />
      </Box>

      <MonthlyContributionsChart cooperativeId={cooperativeId} currency={currency} />
    </Box>
  )
}
