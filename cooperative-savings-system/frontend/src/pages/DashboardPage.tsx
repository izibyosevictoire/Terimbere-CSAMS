import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin, selectIsSuperAdmin } from '@/app/store/authSlice'
import { AdminDashboard, MemberDashboard, SuperAdminDashboard } from '@/features/dashboard'
import { EmptyState } from '@/shared/components/EmptyState'
import { PageHeader } from '@/shared/components/PageHeader'

export function DashboardPage() {
  const { t } = useTranslation()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isCoopAdmin = useAppSelector(selectIsCooperativeAdmin)
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin)

  if (isSuperAdmin && !isCoopAdmin) {
    return <SuperAdminDashboard />
  }

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
        <EmptyState
          title={t('dashboard.selectCooperativeTitle')}
          description={t('dashboard.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  return isCoopAdmin ? (
    <AdminDashboard cooperativeId={cooperativeId} />
  ) : (
    <MemberDashboard cooperativeId={cooperativeId} />
  )
}
