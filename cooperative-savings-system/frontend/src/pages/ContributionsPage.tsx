import { Box, Button, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectCanRecordContributions } from '@/app/store/authSlice'
import {
  ContributionApprovalsPanel,
  HistoryPanel,
  MemberContributionSubmitPanel,
  MonthlyEntryPanel,
  SpecialCampaignsPanel,
} from '@/features/contributions'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ROUTES } from '@/shared/constants/routes'

function initialTabFromQuery(tabParam: string | null, isAdmin: boolean): number {
  if (isAdmin) {
    if (tabParam === 'monthly') return 0
    if (tabParam === 'approvals') return 1
    if (tabParam === 'history') return 2
    if (tabParam === 'special') return 3
    return 1
  }
  if (tabParam === 'submit') return 0
  if (tabParam === 'history' || tabParam === 'mine') return 1
  if (tabParam === 'special') return 2
  return 0
}

export function ContributionsPage() {
  const { t } = useTranslation()
  const { campaignId } = useParams()
  const [searchParams] = useSearchParams()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectCanRecordContributions)
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
          backTo={ROUTES.contributions}
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
        actions={
          isAdmin ? (
            <Button variant="outlined" size="small" onClick={() => setTab(1)}>
              {t('contributions.tabs.approvals')}
            </Button>
          ) : (
            <Button variant="contained" size="small" onClick={() => setTab(0)}>
              {t('contributions.submit.action')}
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        {isAdmin ? <Tab label={t('contributions.tabs.monthly')} /> : (
          <Tab label={t('contributions.tabs.submit')} />
        )}
        {isAdmin ? <Tab label={t('contributions.tabs.approvals')} /> : null}
        <Tab label={isAdmin ? t('contributions.tabs.history') : t('contributions.tabs.mine')} />
        <Tab label={t('contributions.tabs.special')} />
      </Tabs>

      {isAdmin && tab === 0 ? (
        <MonthlyEntryPanel cooperativeId={cooperativeId} canWrite={isAdmin} />
      ) : null}
      {!isAdmin && tab === 0 ? (
        <MemberContributionSubmitPanel cooperativeId={cooperativeId} />
      ) : null}

      {isAdmin && tab === 1 ? (
        <ContributionApprovalsPanel cooperativeId={cooperativeId} />
      ) : null}

      {((isAdmin && tab === 2) || (!isAdmin && tab === 1)) ? (
        <HistoryPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {((isAdmin && tab === 3) || (!isAdmin && tab === 2)) ? (
        <SpecialCampaignsPanel cooperativeId={cooperativeId} canWrite={isAdmin} />
      ) : null}
    </Box>
  )
}
