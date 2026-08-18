import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
import { Link as RouterLink, useParams } from 'react-router-dom'
import { useAppSelector } from '@/app/store/hooks'
import { selectIsCooperativeAdmin } from '@/app/store/authSlice'
import {
  RepaymentDialog,
  canShowApprove,
  canShowDisburse,
  canShowReject,
  canShowRepayment,
  canShowWriteOff,
  loanStatusColor,
} from '@/features/loans'
import {
  loanApproveDefaults,
  loanApproveSchema,
  loanRejectDefaults,
  loanRejectSchema,
  type LoanApproveFormValues,
  type LoanRejectFormValues,
} from '@/features/loans/loanFormSchemas'
import { getErrorMessage } from '@/shared/api/client'
import {
  approveLoan,
  createLoanRepayment,
  disburseLoan,
  fetchLoan,
  fetchLoanRepayments,
  rejectLoan,
  writeOffLoan,
} from '@/shared/api/loans'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import { ROUTES } from '@/shared/constants/routes'
import type { LoanRepayment, LoanRepaymentCreateRequest } from '@/shared/types/loan'
import { loanDisplayName } from '@/shared/types/loan'
import { formatMoney } from '@/shared/utils/formatMoney'

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

export function LoanDetailPage() {
  const { loanId = '' } = useParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const isAdmin = useAppSelector(selectIsCooperativeAdmin)

  const [confirmAction, setConfirmAction] = useState<
    'approve' | 'disburse' | 'writeOff' | null
  >(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [repayOpen, setRepayOpen] = useState(false)

  const loanQuery = useQuery({
    queryKey: ['loans', cooperativeId, loanId],
    queryFn: () => fetchLoan(cooperativeId!, loanId),
    enabled: Boolean(cooperativeId && loanId),
  })

  const repaymentsQuery = useQuery({
    queryKey: ['loans', cooperativeId, loanId, 'repayments'],
    queryFn: () => fetchLoanRepayments(cooperativeId!, loanId),
    enabled: Boolean(cooperativeId && loanId),
  })

  const approveForm = useForm<LoanApproveFormValues>({
    defaultValues: loanApproveDefaults,
    resolver: yupResolver(loanApproveSchema),
  })

  const rejectForm = useForm<LoanRejectFormValues>({
    defaultValues: loanRejectDefaults,
    resolver: yupResolver(loanRejectSchema),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['loans'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const approveMutation = useMutation({
    mutationFn: (values: LoanApproveFormValues) =>
      approveLoan(cooperativeId!, loanId, {
        approvedAmount: values.approvedAmount.trim() || undefined,
        termMonths: values.termMonths.trim()
          ? Number(values.termMonths.trim())
          : undefined,
        dueDate: values.dueDate.trim() || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar(t('loans.actions.approveSuccess'), { variant: 'success' })
      setApproveOpen(false)
      setConfirmAction(null)
      approveForm.reset(loanApproveDefaults)
      invalidate()
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (values: LoanRejectFormValues) =>
      rejectLoan(cooperativeId!, loanId, {
        rejectionReason: values.rejectionReason.trim(),
      }),
    onSuccess: () => {
      enqueueSnackbar(t('loans.actions.rejectSuccess'), { variant: 'success' })
      setRejectOpen(false)
      rejectForm.reset(loanRejectDefaults)
      invalidate()
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const disburseMutation = useMutation({
    mutationFn: () => disburseLoan(cooperativeId!, loanId),
    onSuccess: () => {
      enqueueSnackbar(t('loans.actions.disburseSuccess'), { variant: 'success' })
      setConfirmAction(null)
      invalidate()
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const writeOffMutation = useMutation({
    mutationFn: () => writeOffLoan(cooperativeId!, loanId),
    onSuccess: () => {
      enqueueSnackbar(t('loans.actions.writeOffSuccess'), { variant: 'success' })
      setConfirmAction(null)
      invalidate()
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const repayMutation = useMutation({
    mutationFn: (payload: LoanRepaymentCreateRequest) =>
      createLoanRepayment(cooperativeId!, loanId, payload),
    onSuccess: () => {
      enqueueSnackbar(t('loans.repayment.success'), { variant: 'success' })
      setRepayOpen(false)
      invalidate()
      void repaymentsQuery.refetch()
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const repaymentColumns: TableColumn<LoanRepayment>[] = useMemo(
    () => [
      {
        id: 'paymentDate',
        label: t('loans.fields.paymentDate'),
        render: (row) => row.paymentDate || '—',
      },
      {
        id: 'total',
        label: t('loans.repayment.amount'),
        render: (row) => formatMoney(row.amountTotal),
      },
      {
        id: 'principal',
        label: t('loans.repayment.principal'),
        render: (row) => formatMoney(row.principalPortion),
        hideOnMobile: true,
      },
      {
        id: 'interest',
        label: t('loans.repayment.interest'),
        render: (row) => formatMoney(row.interestPortion),
        hideOnMobile: true,
      },
      {
        id: 'reference',
        label: t('loans.fields.reference'),
        render: (row) => row.paymentReference || '—',
        hideOnMobile: true,
      },
    ],
    [t],
  )

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader title={t('pages.loans.title')} />
        <EmptyState
          title={t('loans.selectCooperativeTitle')}
          description={t('loans.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  const loan = loanQuery.data
  const status = loan ? String(loan.status) : ''
  const actionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    disburseMutation.isPending ||
    writeOffMutation.isPending

  const outstandingPrincipal = Number(loan?.outstandingPrincipal) || 0
  const outstandingInterest = Number(loan?.outstandingInterest) || 0
  const outstandingSum = outstandingPrincipal + outstandingInterest

  return (
    <Box>
      <Button
        component={RouterLink}
        to={ROUTES.loans}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 1 }}
      >
        {t('loans.backToList')}
      </Button>

      <PageHeader
        title={
          loan
            ? t('loans.detailTitle', { member: loanDisplayName(loan) })
            : t('pages.loans.title')
        }
        description={t('loans.detailDescription')}
      />

      {loanQuery.isLoading ? <LoadingState /> : null}
      {loanQuery.isError ? (
        <ErrorState
          message={getErrorMessage(loanQuery.error)}
          onRetry={() => void loanQuery.refetch()}
        />
      ) : null}

      {loan ? (
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            sx={{ p: { xs: 2.5, md: 3.5 }, border: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
              <Chip
                size="small"
                color={loanStatusColor(status)}
                label={t(`loans.status.${status}`, { defaultValue: status })}
              />
              <Chip
                size="small"
                variant="outlined"
                label={t(`loans.interestType.${loan.interestType}`, {
                  defaultValue: String(loan.interestType),
                })}
              />
            </Stack>

            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow label={t('loans.fields.member')} value={loanDisplayName(loan)} />
                <InfoRow
                  label={t('loans.fields.requestedAmount')}
                  value={formatMoney(loan.requestedAmount)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('loans.fields.approvedAmount')}
                  value={
                    loan.approvedAmount != null ? formatMoney(loan.approvedAmount) : '—'
                  }
                />
                <InfoRow
                  label={t('loans.fields.principal')}
                  value={
                    loan.principalAmount != null
                      ? formatMoney(loan.principalAmount)
                      : '—'
                  }
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('loans.fields.interestAmount')}
                  value={
                    loan.interestAmount != null ? formatMoney(loan.interestAmount) : '—'
                  }
                />
                <InfoRow
                  label={t('loans.fields.interestRate')}
                  value={`${loan.interestRatePercent}%`}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('loans.fields.outstandingPrincipal')}
                  value={formatMoney(outstandingPrincipal)}
                />
                <InfoRow
                  label={t('loans.fields.outstandingInterest')}
                  value={formatMoney(outstandingInterest)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('loans.fields.termMonths')}
                  value={String(loan.termMonths ?? '—')}
                />
                <InfoRow label={t('loans.fields.dueDate')} value={loan.dueDate ?? ''} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('loans.fields.requestDate')}
                  value={loan.requestDate ?? ''}
                />
                <InfoRow
                  label={t('loans.fields.disbursementDate')}
                  value={loan.disbursementDate ?? ''}
                />
              </Stack>
              <InfoRow label={t('loans.fields.purpose')} value={loan.purpose ?? ''} />
              {loan.rejectionReason ? (
                <InfoRow
                  label={t('loans.fields.rejectionReason')}
                  value={loan.rejectionReason}
                />
              ) : null}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ mt: 2.5, flexWrap: 'wrap' }}
            >
              {canShowApprove(status, isAdmin) ? (
                <Button
                  variant="contained"
                  onClick={() => {
                    approveForm.reset({
                      approvedAmount: String(
                        loan.approvedAmount ?? loan.requestedAmount ?? '',
                      ),
                      termMonths: loan.termMonths ? String(loan.termMonths) : '',
                      dueDate: loan.dueDate ?? '',
                    })
                    setApproveOpen(true)
                  }}
                >
                  {t('loans.actions.approve')}
                </Button>
              ) : null}
              {canShowReject(status, isAdmin) ? (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setRejectOpen(true)}
                >
                  {t('loans.actions.reject')}
                </Button>
              ) : null}
              {canShowDisburse(status, isAdmin) ? (
                <Button variant="contained" onClick={() => setConfirmAction('disburse')}>
                  {t('loans.actions.disburse')}
                </Button>
              ) : null}
              {canShowRepayment(status, isAdmin) ? (
                <Button variant="contained" onClick={() => setRepayOpen(true)}>
                  {t('loans.repayment.record')}
                </Button>
              ) : null}
              {canShowWriteOff(status, isAdmin) ? (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setConfirmAction('writeOff')}
                >
                  {t('loans.actions.writeOff')}
                </Button>
              ) : null}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="h6" gutterBottom>
              {t('loans.repayment.history')}
            </Typography>
            {repaymentsQuery.isLoading ? (
              <LoadingState variant="skeleton" rows={3} />
            ) : null}
            {repaymentsQuery.isError ? (
              <ErrorState
                message={getErrorMessage(repaymentsQuery.error)}
                onRetry={() => void repaymentsQuery.refetch()}
              />
            ) : null}
            {!repaymentsQuery.isLoading && !repaymentsQuery.isError ? (
              <ResponsiveTable
                columns={repaymentColumns}
                rows={repaymentsQuery.data ?? []}
                getRowId={(row) => row.id}
                emptyTitle={t('loans.repayment.emptyTitle')}
                emptyDescription={t('loans.repayment.emptyDescription')}
              />
            ) : null}
          </Paper>
        </Stack>
      ) : null}

      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('loans.actions.approveTitle')}</DialogTitle>
        <form
          onSubmit={approveForm.handleSubmit((values) => {
            setApproveOpen(false)
            setConfirmAction('approve')
            // stash values on form; confirm will submit
            approveForm.reset(values)
          })}
        >
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label={t('loans.fields.approvedAmount')}
                error={Boolean(approveForm.formState.errors.approvedAmount)}
                helperText={approveForm.formState.errors.approvedAmount?.message}
                {...approveForm.register('approvedAmount')}
                fullWidth
              />
              <TextField
                label={t('loans.fields.termMonths')}
                error={Boolean(approveForm.formState.errors.termMonths)}
                helperText={approveForm.formState.errors.termMonths?.message}
                {...approveForm.register('termMonths')}
                fullWidth
              />
              <TextField
                type="date"
                label={t('loans.fields.dueDate')}
                slotProps={{ inputLabel: { shrink: true } }}
                {...approveForm.register('dueDate')}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setApproveOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {t('common.confirm')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('loans.actions.rejectTitle')}</DialogTitle>
        <form
          onSubmit={rejectForm.handleSubmit((values) => rejectMutation.mutate(values))}
        >
          <DialogContent>
            <TextField
              label={t('loans.fields.rejectionReason')}
              error={Boolean(rejectForm.formState.errors.rejectionReason)}
              helperText={rejectForm.formState.errors.rejectionReason?.message}
              {...rejectForm.register('rejectionReason')}
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRejectOpen(false)} disabled={rejectMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={rejectMutation.isPending}
            >
              {t('loans.actions.reject')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmAction === 'approve'}
        title={t('loans.actions.confirmApproveTitle')}
        message={t('loans.actions.confirmApproveMessage')}
        loading={approveMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => approveMutation.mutate(approveForm.getValues())}
      />

      <ConfirmDialog
        open={confirmAction === 'disburse'}
        title={t('loans.actions.confirmDisburseTitle')}
        message={t('loans.actions.confirmDisburseMessage')}
        loading={disburseMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => disburseMutation.mutate()}
      />

      <ConfirmDialog
        open={confirmAction === 'writeOff'}
        title={t('loans.actions.confirmWriteOffTitle')}
        message={t('loans.actions.confirmWriteOffMessage')}
        loading={writeOffMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => writeOffMutation.mutate()}
      />

      <RepaymentDialog
        open={repayOpen}
        loading={repayMutation.isPending || actionPending}
        maxHint={t('loans.repayment.maxHint', {
          amount: formatMoney(outstandingSum),
        })}
        onClose={() => setRepayOpen(false)}
        onSubmit={(payload) => repayMutation.mutate(payload)}
      />
    </Box>
  )
}
