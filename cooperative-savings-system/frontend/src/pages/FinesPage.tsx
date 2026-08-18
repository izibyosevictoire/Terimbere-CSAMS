import {
  Alert,
  Box,
  Button,
  Grid,
  Stack,
  Tab,
  Tabs,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import {
  FineGeneratePanel,
  FineIssuePanel,
  FineSettingsPanel,
  FinesListPanel,
} from '@/features/fines'
import { fetchDashboardSummary } from '@/shared/api/dashboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { MetricCard } from '@/shared/components/MetricCard'
import { PageHeader } from '@/shared/components/PageHeader'
import { ROUTES } from '@/shared/constants/routes'

export function FinesPage() {
  const { t } = useTranslation()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)
  const [tab, setTab] = useState(0)

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', cooperativeId],
    queryFn: () => fetchDashboardSummary(cooperativeId!),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const summary = summaryQuery.data

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.fines.title')}
          description={t('pages.fines.description')}
        />
        <EmptyState
          title={t('fines.selectCooperativeTitle')}
          description={t('fines.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={t('pages.fines.title')}
        description={t('pages.fines.description')}
        actions={
          isAdmin ? (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Button
                component={RouterLink}
                to={ROUTES.finePayments}
                variant="outlined"
                size="small"
              >
                {t('fines.openQueue')}
              </Button>
            </Stack>
          ) : null
        }
      />

      {isAdmin ? (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label={t('fines.summary.total')}
                value={summary?.totalFines != null ? String(summary.totalFines) : '—'}
                accent="red"
                loading={summaryQuery.isLoading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label={t('fines.summary.unpaid')}
                value={summary?.unpaidFines != null ? String(summary.unpaidFines) : '—'}
                accent="orange"
                loading={summaryQuery.isLoading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label={t('fines.summary.paid')}
                value={summary?.paidFines != null ? String(summary.paidFines) : '—'}
                accent="green"
                loading={summaryQuery.isLoading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricCard
                label={t('fines.summary.awaitingReview')}
                value={
                  summary?.pendingFinePayments != null
                    ? String(summary.pendingFinePayments)
                    : '—'
                }
                accent="gold"
                loading={summaryQuery.isLoading}
              />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mb: 2.5 }}>
            {t('fines.workflowBanner')}
          </Alert>
        </>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('fines.tabs.mine')} />
        {isAdmin ? <Tab label={t('fines.tabs.all')} /> : null}
        {isAdmin ? <Tab label={t('fines.tabs.issue')} /> : null}
        {isAdmin ? <Tab label={t('fines.tabs.settings')} /> : null}
      </Tabs>

      {tab === 0 ? (
        <FinesListPanel cooperativeId={cooperativeId} mode="mine" />
      ) : null}

      {isAdmin && tab === 1 ? (
        <Box>
          <FineGeneratePanel cooperativeId={cooperativeId} />
          <FinesListPanel cooperativeId={cooperativeId} mode="all" />
        </Box>
      ) : null}

      {isAdmin && tab === 2 ? (
        <FineIssuePanel cooperativeId={cooperativeId} />
      ) : null}

      {isAdmin && tab === 3 ? (
        <FineSettingsPanel cooperativeId={cooperativeId} />
      ) : null}
    </Box>
  )
}
