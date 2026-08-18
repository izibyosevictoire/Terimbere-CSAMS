import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { formatJsonBlock, toIsoDateEnd, toIsoDateStart } from '@/features/auditLogs'
import { fetchAuditLog, fetchAuditLogs } from '@/shared/api/auditLogs'
import { getErrorMessage } from '@/shared/api/client'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import type { AuditLog } from '@/shared/types/auditLog'

export function AuditLogsPage() {
  const { t } = useTranslation()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['audit-logs', cooperativeId, action, entityType, from, to, page, size],
    queryFn: () =>
      fetchAuditLogs(cooperativeId!, {
        action: action || undefined,
        entityType: entityType || undefined,
        from: toIsoDateStart(from),
        to: toIsoDateEnd(to),
        page,
        size,
        sort: 'createdAt,desc',
      }),
    enabled: Boolean(cooperativeId),
  })

  const detailQuery = useQuery({
    queryKey: ['audit-log', cooperativeId, selectedId],
    queryFn: () => fetchAuditLog(cooperativeId!, selectedId!),
    enabled: Boolean(cooperativeId && selectedId),
  })

  const columns: TableColumn<AuditLog>[] = useMemo(
    () => [
      {
        id: 'createdAt',
        label: t('auditLogs.fields.createdAt'),
        render: (row) =>
          row.createdAt ? dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') : '—',
      },
      {
        id: 'action',
        label: t('auditLogs.fields.action'),
        render: (row) => row.action || '—',
      },
      {
        id: 'entityType',
        label: t('auditLogs.fields.entityType'),
        render: (row) => row.entityType || '—',
      },
      {
        id: 'entityId',
        label: t('auditLogs.fields.entityId'),
        hideOnMobile: true,
        render: (row) => row.entityId || '—',
      },
      {
        id: 'userId',
        label: t('auditLogs.fields.userId'),
        hideOnMobile: true,
        render: (row) => row.userId || '—',
      },
    ],
    [t],
  )

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.auditLogs.title')}
          description={t('pages.auditLogs.description')}
        />
        <EmptyState
          title={t('auditLogs.selectCooperativeTitle')}
          description={t('auditLogs.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  const rows = listQuery.data?.content ?? []
  const detail = detailQuery.data

  return (
    <Box>
      <PageHeader
        title={t('pages.auditLogs.title')}
        description={t('pages.auditLogs.description')}
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <TextField
          size="small"
          label={t('auditLogs.fields.action')}
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: { xs: '100%', sm: 180 } }}
        />
        <TextField
          size="small"
          label={t('auditLogs.fields.entityType')}
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value)
            setPage(0)
          }}
          sx={{ minWidth: { xs: '100%', sm: 180 } }}
        />
        <TextField
          size="small"
          type="date"
          label={t('auditLogs.fields.from')}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            setPage(0)
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
        />
        <TextField
          size="small"
          type="date"
          label={t('auditLogs.fields.to')}
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            setPage(0)
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
        />
        <Button
          variant="outlined"
          onClick={() => {
            setAction('')
            setEntityType('')
            setFrom('')
            setTo('')
            setPage(0)
          }}
          sx={{ minHeight: 40 }}
        >
          {t('auditLogs.clearFilters')}
        </Button>
      </Stack>

      {listQuery.isLoading ? <LoadingState variant="skeleton" rows={5} /> : null}

      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error)}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            emptyTitle={t('auditLogs.emptyTitle')}
            emptyDescription={t('auditLogs.emptyDescription')}
            onRowClick={(row) => setSelectedId(row.id)}
          />
          <TablePagination
            component="div"
            count={listQuery.data?.totalElements ?? 0}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={size}
            onRowsPerPageChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </>
      ) : null}

      <Drawer
        anchor="right"
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 420, md: 480 },
              p: 2.5,
            },
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t('auditLogs.detailTitle')}
        </Typography>
        <Button
          onClick={() => setSelectedId(null)}
          sx={{ mb: 2, minHeight: 40, alignSelf: 'flex-start' }}
        >
          {t('common.cancel')}
        </Button>
        <Divider sx={{ mb: 2 }} />

        {detailQuery.isLoading ? <LoadingState /> : null}
        {detailQuery.isError ? (
          <ErrorState
            message={getErrorMessage(detailQuery.error)}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : null}

        {detail ? (
          <Stack spacing={1.5}>
            <DetailRow label={t('auditLogs.fields.action')} value={detail.action} />
            <DetailRow
              label={t('auditLogs.fields.createdAt')}
              value={
                detail.createdAt
                  ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss')
                  : '—'
              }
            />
            <DetailRow
              label={t('auditLogs.fields.entityType')}
              value={detail.entityType || '—'}
            />
            <DetailRow
              label={t('auditLogs.fields.entityId')}
              value={detail.entityId || '—'}
            />
            <DetailRow label={t('auditLogs.fields.userId')} value={detail.userId || '—'} />
            <DetailRow
              label={t('auditLogs.fields.ipAddress')}
              value={detail.ipAddress || '—'}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('auditLogs.fields.previousValues')}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  mt: 0.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {formatJsonBlock(detail.previousValues)}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('auditLogs.fields.newValues')}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  mt: 0.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {formatJsonBlock(detail.newValues)}
              </Box>
            </Box>
          </Stack>
        ) : null}
      </Drawer>
    </Box>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}
