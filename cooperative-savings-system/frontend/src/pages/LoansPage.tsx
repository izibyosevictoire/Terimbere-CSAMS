import { Box, Button, Grid, Tab, Tabs } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectCanManageLoans } from '@/app/store/authSlice'
import {
  LoanRequestPanel,
  LoanSettingsPanel,
  LoansListPanel,
  GuarantorRequestsPanel,
} from '@/features/loans'
import { fetchDashboardSummary } from '@/shared/api/dashboard'
import { fetchLoans } from '@/shared/api/loans'
import { EmptyState } from '@/shared/components/EmptyState'
import { MetricCard } from '@/shared/components/MetricCard'
import { PageHeader } from '@/shared/components/PageHeader'

export function LoansPage() {
  const { t } = useTranslation()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectCanManageLoans)
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get('tab')
    if (requested === 'approvals' && isAdmin) return 1
    if (requested === 'request') return isAdmin ? 3 : 1
    return 0
  })

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', cooperativeId],
    queryFn: () => fetchDashboardSummary(cooperativeId!),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const pendingQuery = useQuery({
    queryKey: ['loans', cooperativeId, 'count-pending'],
    queryFn: () => fetchLoans(cooperativeId!, { pendingApproval: true, size: 1 }),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const activeQuery = useQuery({
    queryKey: ['loans', cooperativeId, 'count-active'],
    queryFn: () => fetchLoans(cooperativeId!, { status: 'ACTIVE', size: 1 }),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const closedQuery = useQuery({
    queryKey: ['loans', cooperativeId, 'count-closed'],
    queryFn: () => fetchLoans(cooperativeId!, { status: 'CLOSED', size: 1 }),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.loans.title')}
          description={t('pages.loans.description')}
        />
        <EmptyState
          title={t('loans.selectCooperativeTitle')}
          description={t('loans.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={t('pages.loans.title')}
        description={t('pages.loans.description')}
        actions={
          isAdmin ? (
            <Button variant="outlined" size="small" onClick={() => setTab(3)}>
              {t('loans.tabs.issue')}
            </Button>
          ) : (
            <Button variant="contained" size="small" onClick={() => setTab(1)}>
              {t('loans.request.apply')}
            </Button>
          )
        }
      />

      {isAdmin ? (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              label={t('loans.summary.pending', { defaultValue: 'Pending loans' })}
              value={
                pendingQuery.data?.totalElements != null
                  ? String(pendingQuery.data.totalElements)
                  : '—'
              }
              accent="gold"
              loading={pendingQuery.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              label={t('loans.summary.active', { defaultValue: 'Active loans' })}
              value={
                activeQuery.data?.totalElements != null
                  ? String(activeQuery.data.totalElements)
                  : '—'
              }
              accent="blue"
              loading={activeQuery.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              label={t('dashboard.metrics.overdueLoans')}
              value={
                summaryQuery.data?.overdueLoansCount != null
                  ? String(summaryQuery.data.overdueLoansCount)
                  : '—'
              }
              accent="red"
              loading={summaryQuery.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              label={t('loans.summary.closed', { defaultValue: 'Closed loans' })}
              value={
                closedQuery.data?.totalElements != null
                  ? String(closedQuery.data.totalElements)
                  : '—'
              }
              accent="neutral"
              loading={closedQuery.isLoading}
            />
          </Grid>
        </Grid>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('loans.tabs.mine')} />
        {isAdmin ? <Tab label={t('loans.tabs.approvals')} /> : null}
        {isAdmin ? <Tab label={t('loans.tabs.all')} /> : null}
        <Tab label={isAdmin ? t('loans.tabs.issue') : t('loans.tabs.request')} />
        <Tab label={t('loans.tabs.guarantor')} />
        {isAdmin ? <Tab label={t('loans.tabs.settings')} /> : null}
      </Tabs>

      {tab === 0 ? (
        <LoansListPanel cooperativeId={cooperativeId} mode="mine" />
      ) : null}

      {isAdmin && tab === 1 ? (
        <LoansListPanel cooperativeId={cooperativeId} mode="approvals" />
      ) : null}

      {isAdmin && tab === 2 ? (
        <LoansListPanel cooperativeId={cooperativeId} mode="all" />
      ) : null}

      {((isAdmin && tab === 3) || (!isAdmin && tab === 1)) ? (
        <LoanRequestPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {((isAdmin && tab === 4) || (!isAdmin && tab === 2)) ? (
        <GuarantorRequestsPanel cooperativeId={cooperativeId} />
      ) : null}

      {isAdmin && tab === 5 ? (
        <LoanSettingsPanel cooperativeId={cooperativeId} />
      ) : null}
    </Box>
  )
}
