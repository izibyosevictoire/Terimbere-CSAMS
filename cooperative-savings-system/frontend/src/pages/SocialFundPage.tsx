import { Box, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import {
  SocialContributionsPanel,
  SocialDisbursementsPanel,
  SocialFundOverviewPanel,
  SocialFundReportPanel,
} from '@/features/socialFund'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'

export function SocialFundPage() {
  const { t } = useTranslation()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)
  const [tab, setTab] = useState(0)

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.socialFund.title')}
          description={t('pages.socialFund.description')}
        />
        <EmptyState
          title={t('socialFund.selectCooperativeTitle')}
          description={t('socialFund.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  // Tabs: Overview (0), Contributions (1), Disbursements (2), Report (3 — admin)
  return (
    <Box>
      <PageHeader
        title={t('pages.socialFund.title')}
        description={t('pages.socialFund.description')}
      />

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('socialFund.tabs.overview')} />
        <Tab label={t('socialFund.tabs.contributions')} />
        <Tab label={t('socialFund.tabs.disbursements')} />
        {isAdmin ? <Tab label={t('socialFund.tabs.report')} /> : null}
      </Tabs>

      {tab === 0 ? (
        <SocialFundOverviewPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {tab === 1 ? (
        <SocialContributionsPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {tab === 2 ? (
        <SocialDisbursementsPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}

      {isAdmin && tab === 3 ? (
        <SocialFundReportPanel cooperativeId={cooperativeId} />
      ) : null}
    </Box>
  )
}
