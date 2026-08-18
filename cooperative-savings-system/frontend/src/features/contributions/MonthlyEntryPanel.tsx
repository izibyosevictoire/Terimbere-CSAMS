import SaveIcon from '@mui/icons-material/Save'
import {
  Box,
  Chip,
  Paper,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import {
  fetchContributionPeriod,
  saveContributionPeriod,
} from '@/shared/api/contributions'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { FinancialActionButton } from '@/shared/components/FinancialActionButton'
import { LoadingState } from '@/shared/components/LoadingState'
import type { ContributionPeriodLine } from '@/shared/types/contribution'
import { formatMoney } from '@/shared/utils/formatMoney'
import {
  computeOutstandingAmount,
  contributionStatusColor,
  deriveContributionStatus,
  isNonNegativeMoney,
} from './contributionHelpers'

interface EditableLine extends ContributionPeriodLine {
  paidAmountInput: string
  paymentDateInput: string
  paymentReferenceInput: string
  notesInput: string
}

function toEditable(line: ContributionPeriodLine): EditableLine {
  return {
    ...line,
    paidAmountInput: String(line.paidAmount ?? '0'),
    paymentDateInput: line.paymentDate ?? '',
    paymentReferenceInput: line.paymentReference ?? '',
    notesInput: line.notes ?? '',
  }
}

interface MonthlyEntryPanelProps {
  cooperativeId: string
  canWrite: boolean
}

export function MonthlyEntryPanel({ cooperativeId, canWrite }: MonthlyEntryPanelProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  const now = dayjs()
  const [year, setYear] = useState(now.year())
  const [month, setMonth] = useState(now.month() + 1)
  const [lines, setLines] = useState<EditableLine[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['contributions', 'period', cooperativeId, year, month],
    queryFn: () => fetchContributionPeriod(cooperativeId, year, month),
    enabled: Boolean(cooperativeId),
  })

  useEffect(() => {
    if (query.data?.lines) {
      setLines(query.data.lines.map(toEditable))
      setValidationError(null)
    }
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      saveContributionPeriod(cooperativeId, year, month, {
        lines: lines.map((line) => ({
          memberUserId: line.memberUserId,
          paidAmount: line.paidAmountInput.trim() || '0',
          paymentDate: line.paymentDateInput.trim() || null,
          paymentReference: line.paymentReferenceInput.trim() || null,
          notes: line.notesInput.trim() || null,
        })),
      }),
    onSuccess: () => {
      enqueueSnackbar(t('contributions.saveSuccess'), { variant: 'success' })
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['contributions', cooperativeId] })
      void queryClient.invalidateQueries({
        queryKey: ['contributions', 'period', cooperativeId, year, month],
      })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', cooperativeId] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const yearOptions = useMemo(() => {
    const current = now.year()
    return Array.from({ length: 8 }, (_, i) => current - 3 + i)
  }, [now])

  const updateLine = (memberUserId: string, patch: Partial<EditableLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.memberUserId === memberUserId ? { ...line, ...patch } : line)),
    )
  }

  const handleSaveClick = () => {
    const invalid = lines.find((line) => !isNonNegativeMoney(line.paidAmountInput.trim() || '0'))
    if (invalid) {
      setValidationError(t('contributions.validation.nonNegativeAmount'))
      return
    }
    setValidationError(null)
    setConfirmOpen(true)
  }

  if (query.isLoading) return <LoadingState variant="skeleton" rows={5} />
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  }

  if (!lines.length) {
    return (
      <EmptyState
        title={t('contributions.periodEmptyTitle')}
        description={t('contributions.periodEmptyDescription')}
      />
    )
  }

  const renderFields = (line: EditableLine) => {
    const outstanding = computeOutstandingAmount(line.expectedAmount, line.paidAmountInput || '0')
    const status = deriveContributionStatus(
      line.expectedAmount,
      line.paidAmountInput || '0',
      line.status,
    )

    return (
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
            {line.fullName || line.username}
          </Typography>
          <Chip
            size="small"
            color={contributionStatusColor(status)}
            label={t(`contributions.status.${status}`, { defaultValue: status })}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t('contributions.fields.expected')}: {formatMoney(line.expectedAmount)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('contributions.fields.outstanding')}: {formatMoney(outstanding)}
        </Typography>
        {canWrite ? (
          <>
            <TextField
              size="small"
              label={t('contributions.fields.paid')}
              value={line.paidAmountInput}
              onChange={(e) => updateLine(line.memberUserId, { paidAmountInput: e.target.value })}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              size="small"
              type="date"
              label={t('contributions.fields.paymentDate')}
              value={line.paymentDateInput}
              onChange={(e) => updateLine(line.memberUserId, { paymentDateInput: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              label={t('contributions.fields.reference')}
              value={line.paymentReferenceInput}
              onChange={(e) =>
                updateLine(line.memberUserId, { paymentReferenceInput: e.target.value })
              }
            />
            <TextField
              size="small"
              label={t('contributions.fields.notes')}
              value={line.notesInput}
              onChange={(e) => updateLine(line.memberUserId, { notesInput: e.target.value })}
              multiline
              minRows={1}
            />
          </>
        ) : (
          <>
            <Typography variant="body2">
              {t('contributions.fields.paid')}: {formatMoney(line.paidAmount)}
            </Typography>
            <Typography variant="body2">
              {t('contributions.fields.paymentDate')}: {line.paymentDate || '—'}
            </Typography>
            <Typography variant="body2">
              {t('contributions.fields.reference')}: {line.paymentReference || '—'}
            </Typography>
          </>
        )}
      </Stack>
    )
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2, alignItems: { sm: 'center' } }}
      >
        <TextField
          select
          size="small"
          label={t('contributions.fields.month')}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          sx={{ minWidth: 140 }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <MenuItem key={m} value={m}>
              {dayjs().month(m - 1).format('MMMM')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('contributions.fields.year')}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          sx={{ minWidth: 120 }}
        >
          {yearOptions.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </TextField>
        {canWrite ? (
          <FinancialActionButton
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveClick}
            disabled={saveMutation.isPending}
          >
            {t('contributions.savePeriod')}
          </FinancialActionButton>
        ) : null}
      </Stack>

      {validationError ? (
        <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
          {validationError}
        </Typography>
      ) : null}

      {isMobile ? (
        <Stack spacing={1.5}>
          {lines.map((line) => (
            <Paper
              key={line.memberUserId}
              elevation={0}
              sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}
            >
              {renderFields(line)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('contributions.fields.member')}</TableCell>
                <TableCell>{t('contributions.fields.expected')}</TableCell>
                <TableCell>{t('contributions.fields.paid')}</TableCell>
                <TableCell>{t('contributions.fields.outstanding')}</TableCell>
                <TableCell>{t('contributions.fields.status')}</TableCell>
                <TableCell>{t('contributions.fields.paymentDate')}</TableCell>
                <TableCell>{t('contributions.fields.reference')}</TableCell>
                <TableCell>{t('contributions.fields.notes')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line) => {
                const outstanding = computeOutstandingAmount(
                  line.expectedAmount,
                  line.paidAmountInput || '0',
                )
                const status = deriveContributionStatus(
                  line.expectedAmount,
                  line.paidAmountInput || '0',
                  line.status,
                )
                return (
                  <TableRow key={line.memberUserId}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {line.fullName || line.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {line.username}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatMoney(line.expectedAmount)}</TableCell>
                    <TableCell sx={{ minWidth: 110 }}>
                      {canWrite ? (
                        <TextField
                          size="small"
                          value={line.paidAmountInput}
                          onChange={(e) =>
                            updateLine(line.memberUserId, { paidAmountInput: e.target.value })
                          }
                          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                        />
                      ) : (
                        formatMoney(line.paidAmount)
                      )}
                    </TableCell>
                    <TableCell>{formatMoney(outstanding)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={contributionStatusColor(status)}
                        label={t(`contributions.status.${status}`, { defaultValue: status })}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      {canWrite ? (
                        <TextField
                          size="small"
                          type="date"
                          value={line.paymentDateInput}
                          onChange={(e) =>
                            updateLine(line.memberUserId, { paymentDateInput: e.target.value })
                          }
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      ) : (
                        line.paymentDate || '—'
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      {canWrite ? (
                        <TextField
                          size="small"
                          value={line.paymentReferenceInput}
                          onChange={(e) =>
                            updateLine(line.memberUserId, {
                              paymentReferenceInput: e.target.value,
                            })
                          }
                        />
                      ) : (
                        line.paymentReference || '—'
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      {canWrite ? (
                        <TextField
                          size="small"
                          value={line.notesInput}
                          onChange={(e) =>
                            updateLine(line.memberUserId, { notesInput: e.target.value })
                          }
                        />
                      ) : (
                        line.notes || '—'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('contributions.confirmSaveTitle')}
        message={t('contributions.confirmSaveMessage', { count: lines.length, month, year })}
        loading={saveMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => saveMutation.mutate()}
      />
    </Box>
  )
}
