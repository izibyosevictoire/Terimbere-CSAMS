import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin, selectIsSuperAdmin } from '@/app/store/authSlice'
import { PageHeader } from '@/shared/components/PageHeader'
import { ROUTES } from '@/shared/constants/routes'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const user = useAppSelector((s) => s.auth.user)
  const isCoopAdmin = useAppSelector(selectIsCooperativeAdmin)
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin)

  return (
    <Box>
      <PageHeader
        title={t('pages.profile.title')}
        description={t('pages.profile.description')}
        actions={
          <Button component={RouterLink} to={ROUTES.changePassword} variant="contained">
            {t('profile.changePassword')}
          </Button>
        }
      />

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', maxWidth: 640 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          {!user ? (
            <Typography color="text.secondary">{t('errors.unauthorized')}</Typography>
          ) : (
            <Stack spacing={2.5}>
              <InfoRow label={t('profile.fullName')} value={user.fullName} />
              <InfoRow label={t('profile.username')} value={user.username} />
              <InfoRow label={t('profile.email')} value={user.email} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                <InfoRow label={t('profile.firstName')} value={user.firstName} />
                <InfoRow label={t('profile.lastName')} value={user.lastName} />
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t('profile.roles')}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {user.roles.length ? (
                    user.roles.map((role) => (
                      <Chip
                        key={role}
                        label={t(`roles.${role}`, { defaultValue: role })}
                        size="small"
                        color="primary"
                      />
                    ))
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                </Stack>
              </Box>
              {isCoopAdmin || isSuperAdmin ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('profile.permissions')}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {user.permissions.length ? (
                      user.permissions.map((permission) => (
                        <Chip key={permission} label={permission} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('profile.noPermissions')}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ) : null}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t('profile.cooperatives')}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {user.cooperativeIds.length ? (
                    user.cooperativeIds.map((id) => (
                      <Chip key={id} label={id} size="small" variant="outlined" />
                    ))
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
