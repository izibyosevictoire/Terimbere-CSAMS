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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchCooperative } from '@/shared/api/cooperatives'
import { fetchMembers } from '@/shared/api/members'
import { exportReport, fetchReportTypes } from '@/shared/api/reports'
import { LoadingState } from '@/shared/components/LoadingState'
import { CONTRIBUTION_STATUSES } from '@/shared/types/contribution'
import { LEDGER_TRANSACTION_TYPES } from '@/shared/types/ledger'
import { memberDisplayName } from '@/shared/types/member'
import { REPORT_TYPES } from '@/shared/types/report'
import {
  defaultExportFilename,
  defaultReportFromDate,
  defaultReportToDate,
  reportSupportsFromTo,
  reportSupportsMember,
  reportSupportsStatus,
  reportSupportsTransactionType,
  reportSupportsYearMonth,
  reportTypeLabelKey,
  validateReportTimeline,
  validateReportYearMonth,
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
  const today = dayjs()
  const todayIso = today.format('YYYY-MM-DD')

  const [reportType, setReportType] = useState(initialReportType ?? '')
  const [fromDate, setFromDate] = useState(defaultReportFromDate(today))
  const [toDate, setToDate] = useState(defaultReportToDate(today))
  const [memberUserId, setMemberUserId] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [transactionType, setTransactionType] = useState('')

  const cooperativeQuery = useQuery({
    queryKey: ['cooperatives', cooperativeId],
    queryFn: () => fetchCooperative(cooperativeId),
    enabled: Boolean(cooperativeId),
  })
  const registrationDate = cooperativeQuery.data?.registrationDate ?? null

  useEffect(() => {
    if (!registrationDate) return
    setFromDate((current) =>
      dayjs(current).isBefore(dayjs(registrationDate), 'day')
        ? registrationDate
        : current,
    )
  }, [registrationDate])

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
    const current = today.year()
    return Array.from({ length: 8 }, (_, i) => current - i)
  }, [today])

  const monthOptions = useMemo(() => {
    const selectedYear = year ? Number(year) : null
    const maxMonth = selectedYear === today.year() ? today.month() + 1 : 12
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
      value: m,
      disabled: selectedYear != null && m > maxMonth,
    }))
  }, [today, year])

  const timelineIssue = validateReportTimeline(fromDate, toDate, today, registrationDate)
  const yearMonthIssue = showYearMonth
    ? validateReportYearMonth(year, month, today)
    : null
  const timelineValid = timelineIssue == null

  const exportMutation = useMutation({
    mutationFn: ({ type, includeFilters }: { type: string; includeFilters: boolean }) => {
      const issue = validateReportTimeline(fromDate, toDate, today, registrationDate)
      if (issue) {
        throw new Error(t(`reports.export.validation.${issue}`))
      }
      if (includeFilters && showYearMonth) {
        const ymIssue = validateReportYearMonth(year, month, today)
        if (ymIssue) {
          throw new Error(t(`reports.export.validation.${ymIssue}`))
        }
      }
      return exportReport(
        cooperativeId,
        {
          reportType: type,
          fromDate,
          toDate,
          memberUserId: includeFilters && showMember && memberUserId ? memberUserId : null,
          status: includeFilters && showStatus && status ? status : null,
          transactionType: includeFilters && showTxnType && transactionType ? transactionType : null,
          year: includeFilters && showYearMonth && year ? Number(year) : null,
          month: includeFilters && showYearMonth && month ? Number(month) : null,
        },
        defaultExportFilename(type),
      )
    },
    onSuccess: ({ filename }) => {
      enqueueSnackbar(t('reports.export.success', { filename }), { variant: 'success' })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const types =
    typesQuery.data && typesQuery.data.length > 0
      ? typesQuery.data
      : REPORT_TYPES.map((type) => ({ type, label: type }))

  if (typesQuery.isLoading) {
    return <LoadingState />
  }

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
    if (!timelineValid) {
      enqueueSnackbar(t(`reports.export.validation.${timelineIssue}`), { variant: 'warning' })
      return
    }
    exportMutation.mutate({ type, includeFilters: false })
  }

  return (
    <Box>
      {typesQuery.isError ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void typesQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        >
          {getErrorMessage(typesQuery.error, t('errors.generic'))}
        </Alert>
      ) : null}
      <Typography variant="h6" gutterBottom>
        {t('reports.export.timelineTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
        {t('reports.export.timelineDescription')}
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          mb: 3,
          maxWidth: 720,
          p: { xs: 2, sm: 2.5 },
          border: '1px solid',
          borderColor: timelineIssue ? 'warning.main' : 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          type="date"
          required
          label={t('reports.export.fromDate')}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          error={Boolean(timelineIssue && timelineIssue !== 'futureTo')}
          helperText={
            timelineIssue && timelineIssue !== 'futureTo'
              ? t(`reports.export.validation.${timelineIssue}`)
              : t('reports.export.timelineFromHint')
          }
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: {
              max: todayIso,
              min: registrationDate || undefined,
            },
          }}
          fullWidth
        />
        <TextField
          type="date"
          required
          label={t('reports.export.toDate')}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          error={Boolean(timelineIssue && timelineIssue !== 'futureFrom')}
          helperText={
            timelineIssue && timelineIssue !== 'futureFrom'
              ? t(`reports.export.validation.${timelineIssue}`)
              : t('reports.export.timelineToHint')
          }
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: todayIso, min: fromDate || undefined },
          }}
          fullWidth
        />
      </Stack>

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
              {t(card.descriptionKey)}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => runPrimary(card.type)}
              disabled={!timelineValid || exportMutation.isPending}
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
          if (!reportType || !timelineValid || yearMonthIssue) return
          exportMutation.mutate({ type: reportType, includeFilters: true })
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
          <Alert severity="info">{t('reports.export.usesTimeline')}</Alert>
        ) : null}

        {showYearMonth ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label={t('reports.export.year')}
              value={year}
              onChange={(e) => {
                setYear(e.target.value)
                setMonth('')
              }}
              error={yearMonthIssue === 'incompleteYearMonth' || yearMonthIssue === 'futureYearMonth'}
              helperText={
                yearMonthIssue
                  ? t(`reports.export.validation.${yearMonthIssue}`)
                  : t('reports.export.yearMonthHint')
              }
              fullWidth
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
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
              error={yearMonthIssue === 'incompleteYearMonth' || yearMonthIssue === 'futureYearMonth'}
              fullWidth
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              {monthOptions.map((m) => (
                <MenuItem key={m.value} value={String(m.value)} disabled={m.disabled}>
                  {dayjs().month(m.value - 1).format('MMMM')}
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
            disabled={!reportType || !timelineValid || Boolean(yearMonthIssue) || exportMutation.isPending}
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
