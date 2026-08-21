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
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { getErrorMessage } from '@/shared/api/client'
import {
  fetchContributionPeriodPreview,
  submitRegularContribution,
} from '@/shared/api/contributions'
import { uploadCooperativeFile } from '@/shared/api/files'
import { formatMoney } from '@/shared/utils/formatMoney'

interface FormValues {
  year: string
  month: string
  amount: string
  paymentDate: string
  paymentReference: string
  evidenceFileKey: string
  notes: string
}

function currentPeriod(): { year: string; month: string } {
  const now = new Date()
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
  }
}

const period = currentPeriod()

const defaults: FormValues = {
  year: period.year,
  month: period.month,
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  paymentReference: '',
  evidenceFileKey: '',
  notes: '',
}

interface MemberContributionSubmitPanelProps {
  cooperativeId: string
}

export function MemberContributionSubmitPanel({
  cooperativeId,
}: MemberContributionSubmitPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      yup.object({
        year: yup.string().trim().required(),
        month: yup.string().trim().required(),
        amount: yup
          .string()
          .trim()
          .required(t('contributions.submit.amountRequired'))
          .matches(/^\d+(\.\d{1,4})?$/, t('contributions.submit.amountInvalid')),
        paymentDate: yup.string().trim().required(t('contributions.submit.dateRequired')),
        paymentReference: yup.string().trim().max(128).default(''),
        evidenceFileKey: yup.string().trim().max(512).default(''),
        notes: yup.string().trim().max(2000).default(''),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: defaults,
    resolver: yupResolver(schema),
  })

  const evidenceKey = watch('evidenceFileKey')
  const year = Number(watch('year'))
  const month = Number(watch('month'))
  const amount = watch('amount')

  const previewQuery = useQuery({
    queryKey: ['contributions', 'period-preview', cooperativeId, year, month],
    queryFn: () => fetchContributionPeriodPreview(cooperativeId, year, month),
    enabled: Boolean(cooperativeId && year && month),
  })

  const preview = previewQuery.data
  const remaining = Number(preview?.remainingAmount ?? 0)
  const payingNow = Number(amount || 0)
  const remainingAfter = Math.max(0, remaining - payingNow)

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadCooperativeFile(cooperativeId, file, 'CONTRIBUTION_EVIDENCE'),
    onSuccess: (file) => {
      setValue('evidenceFileKey', file.storageKey)
      setUploadedName(file.originalFilename)
      setUploadError(null)
    },
    onError: (error) => {
      setUploadError(getErrorMessage(error, t('contributions.submit.uploadFailed')))
    },
  })

  const submitMutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitRegularContribution(cooperativeId, {
        year: Number(values.year),
        month: Number(values.month),
        amount: values.amount.trim(),
        paymentDate: values.paymentDate.trim(),
        paymentReference: values.paymentReference.trim() || undefined,
        evidenceFileKey: values.evidenceFileKey.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar(t('contributions.submit.success'), { variant: 'success' })
      reset({ ...defaults, year: String(year), month: String(month) })
      setUploadedName(null)
      void queryClient.invalidateQueries({ queryKey: ['contributions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => submitMutation.mutate(values))}
      sx={{
        maxWidth: 560,
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        {t('contributions.submit.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('contributions.submit.description')}
      </Typography>
      <Stack spacing={2}>
        <TextField
          select
          label={t('contributions.submit.paymentMonth')}
          error={Boolean(errors.month)}
          {...register('month')}
          fullWidth
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
            <MenuItem key={value} value={String(value)}>
              {t(`contributions.months.${value}`, {
                defaultValue: new Date(2000, value - 1, 1).toLocaleString(undefined, {
                  month: 'long',
                }),
              })}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label={t('contributions.fields.year')}
          error={Boolean(errors.year)}
          {...register('year')}
          fullWidth
        >
          {years.map((value) => (
            <MenuItem key={value} value={String(value)}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        {previewQuery.data ? (
          <Alert severity={preview?.canSubmit === false ? 'warning' : 'info'}>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                {t('contributions.submit.shares')}: {preview?.shareCount}
              </Typography>
              <Typography variant="body2">
                {t('contributions.submit.required')}: {formatMoney(preview?.requiredAmount ?? 0)}
              </Typography>
              <Typography variant="body2">
                {t('contributions.submit.alreadyPaid')}: {formatMoney(preview?.paidAmount ?? 0)}
              </Typography>
              <Typography variant="body2">
                {t('contributions.submit.payingNow')}: {formatMoney(payingNow || 0)}
              </Typography>
              <Typography variant="body2">
                {t('contributions.submit.remaining')}: {formatMoney(remainingAfter)}
              </Typography>
              <Typography variant="body2">
                {t('contributions.submit.paymentMonth')}: {preview?.year}-
                {String(preview?.month).padStart(2, '0')}
              </Typography>
              <Typography variant="body2">
                {t('contributions.fields.status')}:{' '}
                {preview?.reviewStatus
                  ? t(`contributions.reviewStatus.${preview.reviewStatus}`, {
                      defaultValue: String(preview.reviewStatus),
                    })
                  : t(`contributions.status.${preview?.status}`, {
                      defaultValue: String(preview?.status ?? 'PENDING'),
                    })}
              </Typography>
            </Stack>
          </Alert>
        ) : null}
        <TextField
          label={t('contributions.submit.amountPaidNow')}
          error={Boolean(errors.amount)}
          helperText={errors.amount?.message}
          {...register('amount')}
          fullWidth
        />
        <TextField
          type="date"
          label={t('contributions.fields.paymentDate')}
          slotProps={{ inputLabel: { shrink: true } }}
          error={Boolean(errors.paymentDate)}
          helperText={errors.paymentDate?.message}
          {...register('paymentDate')}
          fullWidth
        />
        <TextField
          label={t('contributions.fields.reference')}
          {...register('paymentReference')}
          fullWidth
        />
        <Stack spacing={1}>
          <Typography variant="subtitle2">{t('contributions.submit.proof')}</Typography>
          <Button
            variant="outlined"
            component="label"
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending
              ? t('common.loading')
              : t('contributions.submit.uploadProof')}
            <input
              hidden
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadMutation.mutate(file)
                e.target.value = ''
              }}
            />
          </Button>
          {uploadedName || evidenceKey ? (
            <Typography variant="body2" color="text.secondary">
              {uploadedName || evidenceKey}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {t('contributions.submit.proofHint')}
            </Typography>
          )}
          {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}
        </Stack>
        <TextField
          label={t('contributions.fields.notes')}
          {...register('notes')}
          fullWidth
          multiline
          minRows={2}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={submitMutation.isPending || preview?.canSubmit === false}
        >
          {t('contributions.submit.action')}
        </Button>
      </Stack>
    </Box>
  )
}
