import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setSelectedCooperativeId } from '@/app/store/authSlice'
import { getErrorMessage } from '@/shared/api/client'
import { fetchCooperatives } from '@/shared/api/cooperatives'
import { ErrorState } from '@/shared/components/ErrorState'
import { MetricCard } from '@/shared/components/MetricCard'
import { ROUTES } from '@/shared/constants/routes'

export function SuperAdminDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const openCooperative = (cooperativeId: string) => {
    dispatch(setSelectedCooperativeId(cooperativeId))
    navigate(ROUTES.dashboard)
  }

  const query = useQuery({
    queryKey: ['cooperatives', 'list', 'super-home'],
    queryFn: () => fetchCooperatives({ page: 0, size: 50 }),
  })

  const rows = query.data?.content ?? []
  const total = query.data?.totalElements ?? 0

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              {t('dashboard.super.title')}
            </Typography>
            <Chip size="small" color="primary" label={t('roles.superAdminBadge')} />
          </Stack>
          <Typography variant="body1" color="text.secondary">
            {t('dashboard.super.welcome', { name: user?.firstName || user?.fullName || '' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            {t('dashboard.super.description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to={ROUTES.system}
            variant="outlined"
            startIcon={<HealthAndSafetyIcon />}
          >
            {t('nav.system')}
          </Button>
          <Button
            component={RouterLink}
            to={ROUTES.cooperatives}
            variant="contained"
            startIcon={<AddIcon />}
          >
            {t('cooperatives.create')}
          </Button>
        </Stack>
      </Stack>

      {query.isError ? (
        <Box sx={{ mb: 2 }}>
          <ErrorState
            message={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        </Box>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label={t('dashboard.super.totalCooperatives')}
            value={query.isLoading ? undefined : String(total)}
            icon={<AccountBalanceIcon fontSize="small" />}
            accent="blue"
            loading={query.isLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label={t('dashboard.super.shownOnPage')}
            value={query.isLoading ? undefined : String(rows.length)}
            hint={t('dashboard.super.listHint')}
            icon={<BusinessIcon fontSize="small" />}
            accent="green"
            loading={query.isLoading}
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.super.recentTitle')}
        </Typography>
        {rows.length === 0 && !query.isLoading ? (
          <Typography color="text.secondary">{t('cooperatives.emptyDescription')}</Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {rows.map((coop) => (
              <Paper
                key={coop.id}
                elevation={0}
                onClick={() => openCooperative(coop.id)}
                sx={{
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {coop.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {coop.registrationNumber || coop.currency}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={t(`status.${coop.status}`, { defaultValue: coop.status })}
                  color={coop.status === 'ACTIVE' ? 'success' : coop.status === 'SUSPENDED' ? 'warning' : 'default'}
                />
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
