import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { LoanApplicationFormView } from './LoanApplicationFormView'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api/client'
import { fetchLoanSettings } from '@/shared/api/loanSettings'
import { createLoan, fetchLoanApplicationPreview } from '@/shared/api/loans'
import { fetchMembers } from '@/shared/api/members'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { ROUTES } from '@/shared/constants/routes'
import { memberDisplayName } from '@/shared/types/member'
import {
  loanRequestDefaults,
  loanRequestSchema,
  toLoanCreatePayload,
  type LoanRequestFormValues,
} from './loanFormSchemas'

interface LoanRequestPanelProps {
  cooperativeId: string
  isAdmin: boolean
}

export function LoanRequestPanel({ cooperativeId, isAdmin }: LoanRequestPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  const settingsQuery = useQuery({
    queryKey: ['loan-settings', cooperativeId],
    queryFn: () => fetchLoanSettings(cooperativeId),
    enabled: Boolean(cooperativeId),
  })

  const membersQuery = useQuery({
    queryKey: ['members', cooperativeId, 'loan-select'],
    queryFn: () => fetchMembers(cooperativeId, { status: 'ACTIVE', size: 200 }),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const previewQuery = useQuery({
    queryKey: ['loans', 'application-preview', cooperativeId],
    queryFn: () => fetchLoanApplicationPreview(cooperativeId),
    enabled: Boolean(cooperativeId) && !isAdmin,
  })

  const schema = useMemo(() => loanRequestSchema(isAdmin), [isAdmin])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LoanRequestFormValues>({
    defaultValues: loanRequestDefaults,
    resolver: yupResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (values: LoanRequestFormValues) =>
      createLoan(cooperativeId, toLoanCreatePayload(values, isAdmin)),
    onSuccess: (loan) => {
      enqueueSnackbar(
        isAdmin ? t('loans.request.issueSuccess') : t('loans.request.requestSuccess'),
        { variant: 'success' },
      )
      reset(loanRequestDefaults)
      void queryClient.invalidateQueries({ queryKey: ['loans'] })
      navigate(ROUTES.loanDetail(loan.id))
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  if (settingsQuery.isLoading || (!isAdmin && previewQuery.isLoading)) {
    return <LoadingState variant="skeleton" rows={3} />
  }
  if (settingsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(settingsQuery.error)}
        onRetry={() => void settingsQuery.refetch()}
      />
    )
  }

  const settings = settingsQuery.data
  const memberRequestsBlocked = !isAdmin && settings && !settings.allowMemberRequests
  const amount = watch('amount')
  const purpose = watch('purpose')
  const termMonths = watch('termMonths')

  if (memberRequestsBlocked) {
    return (
      <Alert severity="warning">{t('loans.request.memberRequestsDisabled')}</Alert>
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
        {isAdmin ? t('loans.request.issueTitle') : t('loans.request.applyTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isAdmin
          ? t('loans.request.issueDescription')
          : t('loans.request.applyDescription')}
      </Typography>

      {!isAdmin && previewQuery.data ? (
        <Box sx={{ mb: 2 }}>
          <LoanApplicationFormView
            form={previewQuery.data}
            amount={amount}
            purpose={purpose}
            termMonths={termMonths}
          />
        </Box>
      ) : null}

      {settings ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('loans.request.settingsHint', {
            rate: settings.interestRatePercent,
            type: t(`loans.interestType.${settings.interestType}`, {
              defaultValue: String(settings.interestType),
            }),
            maxAmount:
              settings.maxLoanAmount != null && settings.maxLoanAmount !== ''
                ? String(settings.maxLoanAmount)
                : '—',
            maxTerm: settings.maxTermMonths ?? '—',
          })}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {isAdmin ? (
          <TextField
            select
            label={t('loans.fields.member')}
            error={Boolean(errors.memberUserId)}
            helperText={errors.memberUserId?.message}
            {...register('memberUserId')}
            fullWidth
            disabled={membersQuery.isLoading}
          >
            {(membersQuery.data?.content ?? []).map((member) => (
              <MenuItem key={member.userId} value={member.userId}>
                {memberDisplayName(member)}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <TextField
          label={t('loans.fields.amount')}
          error={Boolean(errors.amount)}
          helperText={errors.amount?.message}
          {...register('amount')}
          fullWidth
        />
        {isAdmin ? (
          <TextField
            label={t('loans.fields.termMonths')}
            error={Boolean(errors.termMonths)}
            helperText={errors.termMonths?.message}
            {...register('termMonths')}
            fullWidth
          />
        ) : null}
        <TextField
          label={t('loans.fields.purpose')}
          error={Boolean(errors.purpose)}
          helperText={errors.purpose?.message}
          {...register('purpose')}
          fullWidth
          required={!isAdmin}
        />
        {isAdmin ? (
          <TextField
            label={t('loans.fields.notes')}
            {...register('notes')}
            fullWidth
            multiline
            minRows={2}
          />
        ) : null}
        <Button
          type="submit"
          variant="contained"
          disabled={mutation.isPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          {isAdmin ? t('loans.request.issue') : t('loans.request.apply')}
        </Button>
      </Stack>
    </Box>
  )
}
