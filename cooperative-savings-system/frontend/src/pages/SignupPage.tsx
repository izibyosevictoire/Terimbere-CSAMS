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
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useAppDispatch } from '@/app/store/hooks'
import { setCredentials } from '@/app/store/authSlice'
import { signup } from '@/shared/api/auth'
import { getErrorMessage } from '@/shared/api/client'
import { ROUTES } from '@/shared/constants/routes'

interface SignupFormValues {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

const schema = yup.object({
  firstName: yup.string().trim().required('First name is required'),
  lastName: yup.string().trim().required('Last name is required'),
  username: yup
    .string()
    .trim()
    .min(3, 'At least 3 characters')
    .max(64)
    .required('Username is required'),
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: yup.string().min(8, 'At least 8 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm your password'),
})

export function SignupPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: SignupFormValues) =>
      signup({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
        email: values.email,
        password: values.password,
      }),
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
      navigate(ROUTES.dashboard, { replace: true })
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error, t('errors.signupFailed')))
    },
  })

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    mutation.mutate(values)
  })

  return (
    <Stack spacing={3}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          component="p"
          sx={{
            fontFamily: 'var(--font-brand)',
            fontSize: { xs: '2.25rem', sm: '2.75rem' },
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'primary.main',
            lineHeight: 1,
            mb: 1,
          }}
        >
          {t('app.name')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('signup.subtitle')}
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
            {t('signup.title')}
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('signup.firstName')}
                  autoComplete="given-name"
                  fullWidth
                  error={Boolean(errors.firstName)}
                  helperText={errors.firstName?.message}
                  {...register('firstName')}
                />
                <TextField
                  label={t('signup.lastName')}
                  autoComplete="family-name"
                  fullWidth
                  error={Boolean(errors.lastName)}
                  helperText={errors.lastName?.message}
                  {...register('lastName')}
                />
              </Stack>
              <TextField
                label={t('signup.username')}
                autoComplete="username"
                fullWidth
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
                {...register('username')}
              />
              <TextField
                label={t('signup.email')}
                type="email"
                autoComplete="email"
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label={t('signup.password')}
                type="password"
                autoComplete="new-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <TextField
                label={t('signup.confirmPassword')}
                type="password"
                autoComplete="new-password"
                fullWidth
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
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
                {t('signup.submit')}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t('signup.haveAccount')}{' '}
                <MuiLink component={RouterLink} to={ROUTES.login}>
                  {t('signup.signIn')}
                </MuiLink>
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  )
}
