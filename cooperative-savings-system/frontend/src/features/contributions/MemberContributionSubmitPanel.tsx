import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { getErrorMessage } from '@/shared/api/client'
import { submitRegularContribution } from '@/shared/api/contributions'
import { uploadCooperativeFile } from '@/shared/api/files'

interface FormValues {
  amount: string
  paymentDate: string
  paymentReference: string
  evidenceFileKey: string
  notes: string
}

const defaults: FormValues = {
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
        amount: values.amount.trim(),
        paymentDate: values.paymentDate.trim(),
        paymentReference: values.paymentReference.trim() || undefined,
        evidenceFileKey: values.evidenceFileKey.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar(t('contributions.submit.success'), { variant: 'success' })
      reset(defaults)
      setUploadedName(null)
      void queryClient.invalidateQueries({ queryKey: ['contributions'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

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
          label={t('contributions.fields.paid')}
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
        <Button type="submit" variant="contained" disabled={submitMutation.isPending}>
          {t('contributions.submit.action')}
        </Button>
      </Stack>
    </Box>
  )
}
