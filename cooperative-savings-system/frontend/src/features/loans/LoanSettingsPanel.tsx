import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchLoanSettings, updateLoanSettings } from '@/shared/api/loanSettings'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { INTEREST_TYPES } from '@/shared/types/loan'
import {
  loanSettingsDefaults,
  loanSettingsSchema,
  toLoanSettingsPayload,
  type LoanSettingsFormValues,
} from './loanFormSchemas'

interface LoanSettingsPanelProps {
  cooperativeId: string
}

export function LoanSettingsPanel({ cooperativeId }: LoanSettingsPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  const query = useQuery({
    queryKey: ['loan-settings', cooperativeId],
    queryFn: () => fetchLoanSettings(cooperativeId),
    enabled: Boolean(cooperativeId),
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<LoanSettingsFormValues>({
    defaultValues: loanSettingsDefaults,
    resolver: yupResolver(loanSettingsSchema),
  })

  useEffect(() => {
    if (!query.data) return
    reset({
      interestRatePercent: String(query.data.interestRatePercent ?? '0'),
      interestType: (query.data.interestType as 'FLAT' | 'REDUCING') || 'FLAT',
      maxLoanAmount:
        query.data.maxLoanAmount != null && query.data.maxLoanAmount !== ''
          ? String(query.data.maxLoanAmount)
          : '',
      maxTermMonths:
        query.data.maxTermMonths != null ? String(query.data.maxTermMonths) : '',
      minMembershipMonths:
        query.data.minMembershipMonths != null
          ? String(query.data.minMembershipMonths)
          : '0',
      allowMemberRequests: Boolean(query.data.allowMemberRequests),
      lateFeeEnabled: Boolean(query.data.lateFeeEnabled),
    })
  }, [query.data, reset])

  const mutation = useMutation({
    mutationFn: (values: LoanSettingsFormValues) =>
      updateLoanSettings(cooperativeId, toLoanSettingsPayload(values)),
    onSuccess: () => {
      enqueueSnackbar(t('loans.settings.saveSuccess'), { variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['loan-settings', cooperativeId] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  if (query.isLoading) return <LoadingState variant="skeleton" rows={4} />
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      sx={{
        maxWidth: 560,
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        {t('loans.settings.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('loans.settings.description')}
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        {t('loans.settings.snapshotHint')}
      </Alert>

      <Stack spacing={2}>
        <TextField
          label={t('loans.settings.interestRatePercent')}
          error={Boolean(errors.interestRatePercent)}
          helperText={errors.interestRatePercent?.message}
          {...register('interestRatePercent')}
          fullWidth
        />
        <TextField
          select
          label={t('loans.settings.interestType')}
          error={Boolean(errors.interestType)}
          helperText={
            errors.interestType?.message ||
            t('loans.settings.reducingUnavailable', {
              defaultValue:
                'Reducing-balance interest is not currently available. Please use Flat Interest or contact the cooperative administrator.',
            })
          }
          {...register('interestType')}
          fullWidth
        >
          {INTEREST_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(`loans.interestType.${type}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('loans.settings.maxLoanAmount')}
          error={Boolean(errors.maxLoanAmount)}
          helperText={errors.maxLoanAmount?.message}
          {...register('maxLoanAmount')}
          fullWidth
        />
        <TextField
          label={t('loans.settings.maxTermMonths')}
          error={Boolean(errors.maxTermMonths)}
          helperText={errors.maxTermMonths?.message}
          {...register('maxTermMonths')}
          fullWidth
        />
        <TextField
          label={t('loans.settings.minMembershipMonths')}
          error={Boolean(errors.minMembershipMonths)}
          helperText={errors.minMembershipMonths?.message}
          {...register('minMembershipMonths')}
          fullWidth
        />
        <Controller
          name="allowMemberRequests"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              }
              label={t('loans.settings.allowMemberRequests')}
            />
          )}
        />
        <Controller
          name="lateFeeEnabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                />
              }
              label={t('loans.settings.lateFeeEnabled')}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending || !isDirty}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('common.save')}
        </Button>
      </Stack>
    </Box>
  )
}
