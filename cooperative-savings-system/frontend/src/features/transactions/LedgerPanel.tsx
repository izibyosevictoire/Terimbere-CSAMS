import {
  Box,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchLedgerEntries } from '@/shared/api/ledger'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import type { LedgerEntry } from '@/shared/types/ledger'
import { LEDGER_TRANSACTION_TYPES } from '@/shared/types/ledger'
import { formatMoney } from '@/shared/utils/formatMoney'

interface LedgerPanelProps {
  cooperativeId: string
}

export function LedgerPanel({ cooperativeId }: LedgerPanelProps) {
  const { t } = useTranslation()
  const [transactionType, setTransactionType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  const query = useQuery({
    queryKey: ['ledger', cooperativeId, transactionType, from, to, page, size],
    queryFn: () =>
      fetchLedgerEntries(cooperativeId, {
        transactionType: transactionType || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        size,
        sort: 'transactionDate,desc',
      }),
    enabled: Boolean(cooperativeId),
  })

  const columns: TableColumn<LedgerEntry>[] = useMemo(
    () => [
      {
        id: 'date',
        label: t('ledger.fields.transactionDate'),
        render: (row) => row.transactionDate || '—',
      },
      {
        id: 'type',
        label: t('ledger.fields.transactionType'),
        render: (row) =>
          t(`ledger.types.${row.transactionType}`, {
            defaultValue: String(row.transactionType),
          }),
      },
      {
        id: 'debit',
        label: t('ledger.fields.debit'),
        render: (row) =>
          Number(row.debitAmount) > 0
            ? formatMoney(row.debitAmount, { currency: row.currency })
            : '—',
      },
      {
        id: 'credit',
        label: t('ledger.fields.credit'),
        render: (row) =>
          Number(row.creditAmount) > 0
            ? formatMoney(row.creditAmount, { currency: row.currency })
            : '—',
      },
      {
        id: 'reference',
        label: t('ledger.fields.reference'),
        render: (row) => row.reference || '—',
        hideOnMobile: true,
      },
      {
        id: 'description',
        label: t('ledger.fields.description'),
        render: (row) => row.description || '—',
        hideOnMobile: true,
      },
    ],
    [t],
  )

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
        <TextField
          select
          size="small"
          label={t('ledger.fields.transactionType')}
          value={transactionType}
          onChange={(e) => {
            setTransactionType(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {LEDGER_TRANSACTION_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(`ledger.types.${type}`, { defaultValue: type })}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label={t('ledger.fields.from')}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            setPage(0)
          }}
        />
        <TextField
          size="small"
          type="date"
          label={t('ledger.fields.to')}
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            setPage(0)
          }}
        />
      </Stack>

      <ResponsiveTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle={t('ledger.emptyTitle')}
        emptyDescription={t('ledger.emptyDescription')}
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
    </Box>
  )
}
