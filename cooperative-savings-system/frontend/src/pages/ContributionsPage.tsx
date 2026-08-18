import { Box, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import {
  HistoryPanel,
  MonthlyEntryPanel,
  SpecialCampaignsPanel,
} from '@/features/contributions'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'

/** Resolve the `?tab=monthly|special|history` query param to a tab index for the current role. */
function initialTabFromQuery(tabParam: string | null, isAdmin: boolean): number {
  if (tabParam === 'monthly') return isAdmin ? 0 : 0
  if (tabParam === 'history') return isAdmin ? 1 : 0
  if (tabParam === 'special') return isAdmin ? 2 : 1
  return 0
}

export function ContributionsPage() {
  const { t } = useTranslation()
  const { campaignId } = useParams()
  const [searchParams] = useSearchParams()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)
  const [tab, setTab] = useState(() => initialTabFromQuery(searchParams.get('tab'), isAdmin))

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.contributions.title')}
          description={t('pages.contributions.description')}
        />
        <EmptyState
          title={t('contributions.selectCooperativeTitle')}
          description={t('contributions.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  if (campaignId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.contributions.title')}
          description={t('contributions.campaigns.detailDescription')}
        />
        <SpecialCampaignsPanel
          cooperativeId={cooperativeId}
          canWrite={isAdmin}
          campaignId={campaignId}
        />
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title={t('pages.contributions.title')}
        description={t('pages.contributions.description')}
      />

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        {isAdmin ? <Tab label={t('contributions.tabs.monthly')} /> : null}
        <Tab label={isAdmin ? t('contributions.tabs.history') : t('contributions.tabs.mine')} />
        <Tab label={t('contributions.tabs.special')} />
      </Tabs>

      {isAdmin && tab === 0 ? (
        <MonthlyEntryPanel cooperativeId={cooperativeId} canWrite={isAdmin} />
      ) : null}

      {((isAdmin && tab === 1) || (!isAdmin && tab === 0)) ? (
        <HistoryPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {((isAdmin && tab === 2) || (!isAdmin && tab === 1)) ? (
        <SpecialCampaignsPanel cooperativeId={cooperativeId} canWrite={isAdmin} />
      ) : null}
    </Box>
  )
}
