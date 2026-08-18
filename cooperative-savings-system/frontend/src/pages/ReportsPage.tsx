import { Box, Tab, Tabs } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import { ContributionImportPanel, ReportsExportPanel } from '@/features/reports'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'

export function ReportsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)
  const [tab, setTab] = useState(0)
  const initialReportType = searchParams.get('type') ?? undefined

  const tabs = useMemo(() => {
    const items = [{ key: 'reports', label: t('reports.tabs.reports') }]
    if (isAdmin) {
      items.push({ key: 'import', label: t('reports.tabs.import') })
    }
    return items
  }, [isAdmin, t])

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.reports.title')}
          description={t('pages.reports.description')}
        />
        <EmptyState
          title={t('reports.selectCooperativeTitle')}
          description={t('reports.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  const activeKey = tabs[tab]?.key ?? 'reports'

  return (
    <Box>
      <PageHeader
        title={t('pages.reports.title')}
        description={t('pages.reports.description')}
      />

      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((item) => (
          <Tab key={item.key} label={item.label} />
        ))}
      </Tabs>

      {activeKey === 'reports' ? (
        <ReportsExportPanel cooperativeId={cooperativeId} initialReportType={initialReportType} />
      ) : null}

      {activeKey === 'import' ? (
        <ContributionImportPanel cooperativeId={cooperativeId} isAdmin={isAdmin} />
      ) : null}
    </Box>
  )
}
