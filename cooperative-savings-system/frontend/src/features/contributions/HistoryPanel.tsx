import {
  Box,
  Chip,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchContributions, fetchMyContributions } from '@/shared/api/contributions'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import type { Contribution } from '@/shared/types/contribution'
import { CONTRIBUTION_STATUSES } from '@/shared/types/contribution'
import { formatMoney } from '@/shared/utils/formatMoney'
import { contributionStatusColor } from './contributionHelpers'

interface HistoryPanelProps {
  cooperativeId: string
  isAdmin: boolean
}

export function HistoryPanel({ cooperativeId, isAdmin }: HistoryPanelProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  const query = useQuery({
    queryKey: [
      'contributions',
      isAdmin ? 'history' : 'my',
      cooperativeId,
      debouncedSearch,
      status,
      year,
      month,
      page,
      size,
    ],
    queryFn: () => {
      const params = {
        q: debouncedSearch || undefined,
        status: status || undefined,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        page,
        size,
      }
      return isAdmin
        ? fetchContributions(cooperativeId, params)
        : fetchMyContributions(cooperativeId, params)
    },
    enabled: Boolean(cooperativeId),
  })

  const columns: TableColumn<Contribution>[] = useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              id: 'member',
              label: t('contributions.fields.member'),
              render: (row: Contribution) => row.fullName || row.username || row.memberUserId,
            },
          ]
        : []),
      {
        id: 'period',
        label: t('contributions.fields.period'),
        render: (row) => `${row.year}-${String(row.month).padStart(2, '0')}`,
      },
      {
        id: 'expected',
        label: t('contributions.fields.expected'),
        render: (row) => formatMoney(row.expectedAmount),
        hideOnMobile: true,
      },
      {
        id: 'paid',
        label: t('contributions.fields.paid'),
        render: (row) => formatMoney(row.paidAmount),
      },
      {
        id: 'outstanding',
        label: t('contributions.fields.outstanding'),
        render: (row) => formatMoney(row.outstandingAmount),
        hideOnMobile: true,
      },
      {
        id: 'status',
        label: t('contributions.fields.status'),
        render: (row) => (
          <Chip
            size="small"
            color={contributionStatusColor(String(row.status))}
            label={t(`contributions.status.${row.status}`, { defaultValue: row.status })}
          />
        ),
      },
      {
        id: 'paymentDate',
        label: t('contributions.fields.paymentDate'),
        render: (row) => row.paymentDate || '—',
        hideOnMobile: true,
      },
    ],
    [isAdmin, t],
  )

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i)

  if (query.isLoading) return <LoadingState variant="skeleton" rows={4} />
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const rows = query.data?.content ?? []

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        {isAdmin ? (
          <TextField
            size="small"
            label={t('common.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 200 }}
          />
        ) : null}
        <TextField
          select
          size="small"
          label={t('contributions.fields.status')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {CONTRIBUTION_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {t(`contributions.status.${s}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('contributions.fields.year')}
          value={year}
          onChange={(e) => {
            setYear(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 110 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {years.map((y) => (
            <MenuItem key={y} value={String(y)}>
              {y}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('contributions.fields.month')}
          value={month}
          onChange={(e) => {
            setMonth(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <MenuItem key={m} value={String(m)}>
              {m}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {!isAdmin ? (
        <Box sx={{ mb: 1.5 }}>
          <Chip size="small" label={t('contributions.myContributions')} color="primary" />
        </Box>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={t('contributions.historyEmptyTitle')}
          description={t('contributions.historyEmptyDescription')}
        />
      ) : (
        <>
          <ResponsiveTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
          />
          <TablePagination
            component="div"
            count={query.data?.totalElements ?? 0}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={size}
            onRowsPerPageChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </>
      )}
    </Box>
  )
}
