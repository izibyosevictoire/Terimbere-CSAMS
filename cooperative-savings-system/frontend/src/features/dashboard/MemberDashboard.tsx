import { Box, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { RoleDutiesNote } from '@/shared/components/RoleDutiesNote'
import { MonthlyContributionsChart } from './MonthlyContributionsChart'
import { MyMemberStatusSection } from './MyMemberStatusSection'

interface MemberDashboardProps {
  cooperativeId: string
}

export function MemberDashboard({ cooperativeId }: MemberDashboardProps) {
  const { t } = useTranslation()
  const user = useAppSelector((s) => s.auth.user)

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('dashboard.member.welcome', { name: user?.firstName || user?.fullName || '' })}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.member.description')}
        </Typography>
      </Box>

      <Box sx={{ mb: 3, maxWidth: 720 }}>
        <RoleDutiesNote roles={user?.roles} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <MyMemberStatusSection cooperativeId={cooperativeId} showQuickLinks />
      </Box>

      <MonthlyContributionsChart cooperativeId={cooperativeId} currency="RWF" />
    </Box>
  )
}
