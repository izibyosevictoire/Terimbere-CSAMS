import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useAppDispatch } from '@/app/store/hooks'
import { setCredentials, setSelectedCooperativeId } from '@/app/store/authSlice'
import { login } from '@/shared/api/auth'
import { getErrorMessage } from '@/shared/api/client'
import { fetchHealth } from '@/shared/api/health'
import { ROUTES } from '@/shared/constants/routes'
import { ROLE_COOPERATIVE_ADMIN, ROLE_SUPER_ADMIN } from '@/shared/types/auth'
import { isPreviewLoginEnabled } from '@/shared/auth/previewLogin'

interface LoginFormValues {
  username: string
  password: string
}

const schema = yup.object({
  username: yup.string().trim().required('Username is required'),
  password: yup.string().min(8, 'At least 8 characters').required('Password is required'),
})

export function LoginPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [healthEnabled, setHealthEnabled] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const healthQuery = useQuery({
    queryKey: ['public-health'],
    queryFn: fetchHealth,
    enabled: healthEnabled,
    retry: 1,
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
      navigate(ROUTES.dashboard, { replace: true })
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error, t('errors.loginFailed')))
    },
  })

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    mutation.mutate(values)
  })

  const enterDevPreview = () => {
    if (!isPreviewLoginEnabled()) {
      return
    }
    dispatch(
      setCredentials({
        accessToken: 'dev-preview-memory-token',
        user: {
          id: 'dev-preview',
          username: 'dev.preview',
          email: 'demo@terimbere.local',
          firstName: 'Dev',
          lastName: 'Preview',
          fullName: 'Dev Preview User',
          roles: [ROLE_COOPERATIVE_ADMIN, ROLE_SUPER_ADMIN],
          permissions: [],
          cooperativeIds: ['demo-coop-1'],
        },
      }),
    )
    dispatch(setSelectedCooperativeId('demo-coop-1'))
    navigate(ROUTES.dashboard, { replace: true })
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="p"
          sx={{
            fontFamily: 'var(--font-brand)',
            fontSize: { xs: '2.75rem', sm: '3.5rem' },
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'primary.main',
            lineHeight: 1,
            mb: 1,
          }}
        >
          {t('app.name')}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          {t('app.tagline')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          {t('login.subtitle')}
        </Typography>
      </Box>

      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'var(--shadow-soft)',
          bgcolor: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Typography variant="h5" gutterBottom>
            {t('login.title')}
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <TextField
                label={t('login.username')}
                type="text"
                autoComplete="username"
                fullWidth
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                {...register('username')}
              />
              <TextField
                label={t('login.password')}
                type="password"
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <Box sx={{ textAlign: 'right', mt: -1 }}>
                <MuiLink component={RouterLink} to={ROUTES.forgotPassword} variant="body2">
                  {t('login.forgotPassword')}
                </MuiLink>
              </Box>
              {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={mutation.isPending}
                startIcon={
                  mutation.isPending ? <CircularProgress size={18} color="inherit" /> : null
                }
              >
                {t('login.submit')}
              </Button>
              {isPreviewLoginEnabled() ? (
                <Stack spacing={1}>
                  <Alert severity="warning">{t('login.devPreviewWarning')}</Alert>
                  <Button variant="outlined" size="large" onClick={enterDevPreview}>
                    {t('login.devPreview')}
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} sx={{ mb: 1, alignItems: 'center' }}>
            <HealthAndSafetyIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('login.foundation')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('login.foundationHint')}
          </Typography>
          <Button
            variant="text"
            onClick={() => setHealthEnabled(true)}
            disabled={healthQuery.isFetching}
            sx={{ fontWeight: 700, px: 0 }}
          >
            {t('login.checkHealth')} →
          </Button>
          {healthQuery.isFetching ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('common.loading')}
            </Typography>
          ) : null}
          {healthQuery.isError ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {getErrorMessage(healthQuery.error)}
            </Alert>
          ) : null}
          {healthQuery.data ? (
            <Alert severity="success" sx={{ mt: 1.5 }}>
              Status: {healthQuery.data.status}
              {healthQuery.data.service ? ` · ${healthQuery.data.service}` : ''}
              {healthQuery.data.version ? ` · v${healthQuery.data.version}` : ''}
            </Alert>
          ) : null}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={i18n.language === 'en' ? 'contained' : 'outlined'}
              onClick={() => void i18n.changeLanguage('en')}
            >
              EN
            </Button>
            <Button
              size="small"
              variant={i18n.language === 'rw' ? 'contained' : 'outlined'}
              onClick={() => void i18n.changeLanguage('rw')}
            >
              RW
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
