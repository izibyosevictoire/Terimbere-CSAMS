import { yupResolver } from '@hookform/resolvers/yup'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Cooperative } from '@/shared/types/cooperative'
import {
  cooperativeFormDefaults,
  cooperativeFormSchema,
  toCooperativePayload,
  type CooperativeFormValues,
} from './cooperativeFormSchema'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DUE_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

interface CooperativeFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Cooperative | null
  loading?: boolean
  onClose: () => void
  onSubmit: (payload: ReturnType<typeof toCooperativePayload>) => void
}

function fromCooperative(coop: Cooperative): CooperativeFormValues {
  return {
    name: coop.name ?? '',
    description: coop.description ?? '',
    registrationNumber: coop.registrationNumber ?? '',
    contactEmail: coop.contactEmail ?? '',
    contactPhone: coop.contactPhone ?? '',
    address: coop.address ?? '',
    currency: coop.currency ?? 'RWF',
    financialYearStartMonth: coop.financialYearStartMonth ?? 1,
    monthlyContributionAmount: String(coop.monthlyContributionAmount ?? '0'),
    contributionDueDay: coop.contributionDueDay ?? 1,
    registrationDate: coop.registrationDate ?? '',
  }
}

export function CooperativeFormDialog({
  open,
  mode,
  initial,
  loading = false,
  onClose,
  onSubmit,
}: CooperativeFormDialogProps) {
  const { t } = useTranslation()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CooperativeFormValues>({
    resolver: yupResolver(cooperativeFormSchema),
    defaultValues: cooperativeFormDefaults,
  })

  useEffect(() => {
    if (!open) return
    reset(initial ? fromCooperative(initial) : cooperativeFormDefaults)
  }, [open, initial, reset])

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create' ? t('cooperatives.createTitle') : t('cooperatives.editTitle')}
      </DialogTitle>
      <form
        onSubmit={handleSubmit((values) => onSubmit(toCooperativePayload(values)))}
        noValidate
      >
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label={t('cooperatives.fields.name')}
              required
              fullWidth
              error={Boolean(errors.name)}
              helperText={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label={t('cooperatives.fields.description')}
              fullWidth
              multiline
              minRows={2}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <TextField
              label={t('cooperatives.fields.registrationNumber')}
              fullWidth
              {...register('registrationNumber')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('cooperatives.fields.contactEmail')}
                fullWidth
                error={Boolean(errors.contactEmail)}
                helperText={errors.contactEmail?.message}
                {...register('contactEmail')}
              />
              <TextField
                label={t('cooperatives.fields.contactPhone')}
                fullWidth
                {...register('contactPhone')}
              />
            </Stack>
            <TextField
              label={t('cooperatives.fields.address')}
              fullWidth
              multiline
              minRows={2}
              {...register('address')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('cooperatives.fields.currency')}
                required
                fullWidth
                error={Boolean(errors.currency)}
                helperText={errors.currency?.message}
                {...register('currency')}
              />
              <TextField
                label={t('cooperatives.fields.registrationDate')}
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('registrationDate')}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="financialYearStartMonth"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t('cooperatives.fields.financialYearStartMonth')}
                    fullWidth
                    error={Boolean(errors.financialYearStartMonth)}
                    helperText={errors.financialYearStartMonth?.message}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="contributionDueDay"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t('cooperatives.fields.contributionDueDay')}
                    fullWidth
                    error={Boolean(errors.contributionDueDay)}
                    helperText={errors.contributionDueDay?.message}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {DUE_DAYS.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
            <TextField
              label={t('cooperatives.fields.monthlyContributionAmount')}
              required
              fullWidth
              error={Boolean(errors.monthlyContributionAmount)}
              helperText={errors.monthlyContributionAmount?.message}
              {...register('monthlyContributionAmount')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
