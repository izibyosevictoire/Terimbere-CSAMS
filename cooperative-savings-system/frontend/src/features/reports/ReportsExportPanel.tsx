import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchMembers } from '@/shared/api/members'
import { exportReport, fetchReportTypes } from '@/shared/api/reports'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { CONTRIBUTION_STATUSES } from '@/shared/types/contribution'
import { LEDGER_TRANSACTION_TYPES } from '@/shared/types/ledger'
import { memberDisplayName } from '@/shared/types/member'
import {
  defaultExportFilename,
  reportSupportsFromTo,
  reportSupportsMember,
  reportSupportsStatus,
  reportSupportsTransactionType,
  reportSupportsYearMonth,
  reportTypeLabelKey,
} from './reportHelpers'

interface ReportsExportPanelProps {
  cooperativeId: string
  initialReportType?: string
}

export function ReportsExportPanel({
  cooperativeId,
  initialReportType,
}: ReportsExportPanelProps) {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()

  const [reportType, setReportType] = useState(initialReportType ?? '')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState(String(dayjs().year()))
  const [month, setMonth] = useState(String(dayjs().month() + 1))
  const [transactionType, setTransactionType] = useState('')

  const typesQuery = useQuery({
    queryKey: ['reports', 'types', cooperativeId],
    queryFn: () => fetchReportTypes(cooperativeId),
    enabled: Boolean(cooperativeId),
  })

  const membersQuery = useQuery({
    queryKey: ['members', cooperativeId, 'report-filter'],
    queryFn: () => fetchMembers(cooperativeId, { status: 'ACTIVE', size: 200, sort: 'firstName,asc' }),
    enabled: Boolean(cooperativeId),
  })

  const selectedMeta = useMemo(
    () => typesQuery.data?.find((item) => item.type === reportType) ?? null,
    [typesQuery.data, reportType],
  )

  const showDates = reportType ? reportSupportsFromTo(reportType, selectedMeta) : true
  const showMember = reportType ? reportSupportsMember(reportType, selectedMeta) : false
  const showStatus = reportType ? reportSupportsStatus(reportType, selectedMeta) : false
  const showYearMonth = reportType ? reportSupportsYearMonth(reportType, selectedMeta) : false
  const showTxnType = reportType
    ? reportSupportsTransactionType(reportType, selectedMeta)
    : false

  const yearOptions = useMemo(() => {
    const current = dayjs().year()
    return Array.from({ length: 8 }, (_, i) => current - i)
  }, [])

  const exportMutation = useMutation({
    mutationFn: () =>
      exportReport(
        cooperativeId,
        {
          reportType,
          fromDate: showDates && fromDate ? fromDate : null,
          toDate: showDates && toDate ? toDate : null,
          memberUserId: showMember && memberUserId ? memberUserId : null,
          status: showStatus && status ? status : null,
          transactionType: showTxnType && transactionType ? transactionType : null,
          year: showYearMonth && year ? Number(year) : null,
          month: showYearMonth && month ? Number(month) : null,
        },
        defaultExportFilename(reportType),
      ),
    onSuccess: ({ filename }) => {
      enqueueSnackbar(t('reports.export.success', { filename }), { variant: 'success' })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  if (typesQuery.isLoading) {
    return <LoadingState />
  }

  if (typesQuery.isError) {
    return (
      <ErrorState
        title={t('common.errorTitle')}
        message={getErrorMessage(typesQuery.error, t('errors.generic'))}
        onRetry={() => void typesQuery.refetch()}
      />
    )
  }

  const types = typesQuery.data ?? []

  const primaryCards = [
    {
      type: 'CONTRIBUTIONS',
      titleKey: 'reports.primary.contributions',
      descriptionKey: 'reports.primary.contributionsHint',
    },
    {
      type: 'INVESTMENTS',
      titleKey: 'reports.primary.investments',
      descriptionKey: 'reports.primary.investmentsHint',
    },
    {
      type: 'FULL_FINANCIAL',
      titleKey: 'reports.primary.full',
      descriptionKey: 'reports.primary.fullHint',
    },
  ] as const

  const runPrimary = (type: string) => {
    setReportType(type)
    exportReport(
      cooperativeId,
      {
        reportType: type,
        fromDate: fromDate || null,
        toDate: toDate || null,
        memberUserId: null,
        status: null,
        transactionType: null,
        year: null,
        month: null,
      },
      defaultExportFilename(type),
    )
      .then(({ filename }) => {
        enqueueSnackbar(t('reports.export.success', { filename }), { variant: 'success' })
      })
      .catch((error) => {
        enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
      })
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('reports.primaryTitle')}
      </Typography>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        useFlexGap
      >
        {primaryCards.map((card) => (
          <Box
            key={card.type}
            sx={{
              flex: 1,
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t(card.titleKey)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {t(card.descriptionKey, {
                defaultValue: t('reports.export.description'),
              })}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => runPrimary(card.type)}
              disabled={exportMutation.isPending}
            >
              {t('reports.export.submit')}
            </Button>
          </Box>
        ))}
      </Stack>

      <Typography variant="h6" gutterBottom>
        {t('reports.advancedTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
        {t('reports.export.description')}
      </Typography>

      <Alert severity="info" sx={{ mb: 2.5, maxWidth: 720 }}>
        {t('reports.export.pdfLater')}
      </Alert>

      <Stack
        component="form"
        spacing={2}
        sx={{
          maxWidth: 560,
          p: { xs: 2, sm: 2.5 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
        onSubmit={(event) => {
          event.preventDefault()
          if (!reportType) return
          exportMutation.mutate()
        }}
      >
        <TextField
          select
          required
          label={t('reports.export.reportType')}
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          fullWidth
        >
          {types.length === 0 ? (
            <MenuItem value="" disabled>
              {t('reports.export.noTypes')}
            </MenuItem>
          ) : (
            types.map((item) => (
              <MenuItem key={item.type} value={item.type}>
                {item.label && item.label !== item.type
                  ? item.label
                  : t(reportTypeLabelKey(item.type), { defaultValue: item.type })}
              </MenuItem>
            ))
          )}
        </TextField>

        {showDates ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              label={t('reports.export.fromDate')}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              type="date"
              label={t('reports.export.toDate')}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
        ) : null}

        {showYearMonth ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('reports.export.year')}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              fullWidth
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={String(y)}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('reports.export.month')}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              fullWidth
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={String(m)}>
                  {dayjs().month(m - 1).format('MMMM')}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        ) : null}

        {showMember ? (
          <TextField
            select
            label={t('reports.export.member')}
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
            fullWidth
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {(membersQuery.data?.content ?? []).map((member) => (
              <MenuItem key={member.userId} value={member.userId}>
                {memberDisplayName(member)}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {showStatus ? (
          <TextField
            select
            label={t('reports.export.status')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {CONTRIBUTION_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {t(`contributions.status.${s}`, { defaultValue: s })}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {showTxnType ? (
          <TextField
            select
            label={t('reports.export.transactionType')}
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            fullWidth
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {LEDGER_TRANSACTION_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {t(`ledger.types.${type}`, { defaultValue: type })}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        <Box>
          <Button
            type="submit"
            variant="contained"
            disabled={!reportType || exportMutation.isPending}
          >
            {exportMutation.isPending
              ? t('reports.export.exporting')
              : t('reports.export.submit')}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
