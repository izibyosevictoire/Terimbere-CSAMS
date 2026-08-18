import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { LoanRepaymentCreateRequest } from '@/shared/types/loan'
import {
  repaymentDefaults,
  repaymentSchema,
  toRepaymentPayload,
  type RepaymentFormValues,
} from './loanFormSchemas'

interface RepaymentDialogProps {
  open: boolean
  loading?: boolean
  maxHint?: string
  onClose: () => void
  onSubmit: (payload: LoanRepaymentCreateRequest) => void
}

export function RepaymentDialog({
  open,
  loading,
  maxHint,
  onClose,
  onSubmit,
}: RepaymentDialogProps) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RepaymentFormValues>({
    defaultValues: repaymentDefaults,
    resolver: yupResolver(repaymentSchema),
  })

  useEffect(() => {
    if (open) reset(repaymentDefaults)
  }, [open, reset])

  const handleClose = () => {
    reset(repaymentDefaults)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('loans.repayment.title')}</DialogTitle>
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(toRepaymentPayload(values))
        })}
      >
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label={t('loans.repayment.amount')}
              error={Boolean(errors.amount)}
              helperText={errors.amount?.message || maxHint}
              {...register('amount')}
              fullWidth
              autoFocus
            />
            <TextField
              type="date"
              label={t('loans.fields.paymentDate')}
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('paymentDate')}
              fullWidth
            />
            <TextField
              label={t('loans.fields.reference')}
              {...register('paymentReference')}
              fullWidth
            />
            <TextField
              label={t('loans.fields.notes')}
              {...register('notes')}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {t('loans.repayment.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
