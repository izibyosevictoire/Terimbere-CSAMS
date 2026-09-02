import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/app/store/hooks'
import { getErrorMessage } from '@/shared/api/client'
import {
  cancelHistoricalImport,
  confirmHistoricalImport,
  downloadHistoricalImportTemplate,
  fetchHistoricalImportHistory,
  previewHistoricalImport,
} from '@/shared/api/historicalImport'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import { importStatusColor } from '@/features/reports/reportHelpers'
import {
  canCancelHistoricalImport,
  isHistoricalImportReady,
  type HistoricalImportConfirm,
  type HistoricalImportError,
  type HistoricalImportPreview,
  type HistoricalImportSheetSummary,
  type HistoricalImportSummary,
} from '@/shared/types/historicalImport'
import { formatMoney } from '@/shared/utils/formatMoney'

export function HistoricalImportPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const cooperativeId = useAppSelector((s) => s.auth.selectedCooperativeId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<HistoricalImportPreview | null>(null)
  const [confirmResult, setConfirmResult] = useState<HistoricalImportConfirm | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<HistoricalImportSummary | null>(null)

  const historyQuery = useQuery({
    queryKey: ['historical-imports', cooperativeId],
    queryFn: () => fetchHistoricalImportHistory(cooperativeId!),
    enabled: Boolean(cooperativeId),
  })

  const templateMutation = useMutation({
    mutationFn: () => downloadHistoricalImportTemplate(cooperativeId!),
    onSuccess: ({ filename }) => {
      enqueueSnackbar(t('historicalImport.templateSuccess', { filename }), { variant: 'success' })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const previewMutation = useMutation({
    mutationFn: (selected: File) => previewHistoricalImport(cooperativeId!, selected),
    onSuccess: (data) => {
      setPreview(data)
      setConfirmResult(null)
      enqueueSnackbar(t('historicalImport.previewSuccess'), { variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['historical-imports'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmHistoricalImport(cooperativeId!, preview!.importId),
    onSuccess: (data) => {
      setConfirmResult(data)
      setConfirmOpen(false)
      setPreview(null)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      enqueueSnackbar(t('historicalImport.confirmSuccess'), { variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['historical-imports'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['contributions'] })
      void queryClient.invalidateQueries({ queryKey: ['ledger'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (importId: string) => cancelHistoricalImport(cooperativeId!, importId),
    onSuccess: () => {
      enqueueSnackbar(t('historicalImport.cancelSuccess'), { variant: 'success' })
      setCancelTarget(null)
      if (preview && cancelTarget?.id === preview.importId) {
        setPreview(null)
      }
      void queryClient.invalidateQueries({ queryKey: ['historical-imports'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const errorColumns: TableColumn<HistoricalImportError>[] = useMemo(
    () => [
      { id: 'sheet', label: t('historicalImport.fields.sheet'), render: (row) => row.sheet || '—' },
      { id: 'row', label: t('historicalImport.fields.row'), render: (row) => row.rowNumber ?? '—' },
      { id: 'field', label: t('historicalImport.fields.field'), render: (row) => row.field || '—' },
      { id: 'message', label: t('historicalImport.fields.error'), render: (row) => row.message || '—' },
    ],
    [t],
  )

  const historyColumns: TableColumn<HistoricalImportSummary>[] = useMemo(
    () => [
      {
        id: 'file',
        label: t('historicalImport.fields.filename'),
        render: (row) => row.originalFilename || '—',
      },
      {
        id: 'uploadedBy',
        label: t('historicalImport.fields.uploadedBy'),
        render: (row) => row.uploadedBy || '—',
        hideOnMobile: true,
      },
      {
        id: 'created',
        label: t('historicalImport.fields.uploadedAt'),
        render: (row) => (row.createdAt ? dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') : '—'),
      },
      {
        id: 'status',
        label: t('historicalImport.fields.status'),
        render: (row) => (
          <Chip
            size="small"
            color={importStatusColor(String(row.status))}
            label={t(`historicalImport.status.${row.status}`, { defaultValue: String(row.status) })}
          />
        ),
      },
      {
        id: 'counts',
        label: t('historicalImport.fields.counts'),
        render: (row) =>
          t('historicalImport.countsSummary', {
            total: row.totalRows,
            valid: row.validRows,
            invalid: row.invalidRows,
          }),
        hideOnMobile: true,
      },
      {
        id: 'confirmed',
        label: t('historicalImport.fields.confirmedAt'),
        render: (row) =>
          row.confirmedAt ? dayjs(row.confirmedAt).format('YYYY-MM-DD HH:mm') : '—',
        hideOnMobile: true,
      },
      {
        id: 'actions',
        label: t('historicalImport.fields.actions'),
        render: (row) =>
          canCancelHistoricalImport(String(row.status)) ? (
            <Button size="small" onClick={() => setCancelTarget(row)}>
              {t('historicalImport.cancel')}
            </Button>
          ) : (
            '—'
          ),
      },
    ],
    [t],
  )

  if (!cooperativeId) {
    return (
      <Box>
        <PageHeader
          title={t('pages.historicalImport.title')}
          description={t('pages.historicalImport.description')}
        />
        <EmptyState
          title={t('historicalImport.selectCooperativeTitle')}
          description={t('historicalImport.selectCooperativeDescription')}
        />
      </Box>
    )
  }

  const confirmEnabled = isHistoricalImportReady(preview)
  const recon = preview?.reconciliation

  return (
    <Box>
      <PageHeader
        title={t('pages.historicalImport.title')}
        description={t('pages.historicalImport.description')}
      />

      <Stack spacing={3}>
        <Alert severity="info">{t('historicalImport.instructions')}</Alert>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Button
            variant="outlined"
            onClick={() => templateMutation.mutate()}
            disabled={templateMutation.isPending}
          >
            {t('historicalImport.downloadTemplate')}
          </Button>
          <Button variant="outlined" component="label">
            {t('historicalImport.chooseFile')}
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                setFile(selected)
                setPreview(null)
                setConfirmResult(null)
              }}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {file?.name ?? t('historicalImport.noFile')}
          </Typography>
          <Button
            variant="contained"
            disabled={!file || previewMutation.isPending}
            onClick={() => file && previewMutation.mutate(file)}
          >
            {t('historicalImport.preview')}
          </Button>
        </Stack>

        {previewMutation.isPending && <LoadingState />}
        {previewMutation.isError && (
          <ErrorState
            title={t('historicalImport.previewFailed')}
            message={getErrorMessage(previewMutation.error, t('errors.generic'))}
          />
        )}

        {preview && (
          <Stack spacing={2}>
            <Typography variant="h6">{t('historicalImport.previewTitle')}</Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              }}
            >
              {(preview.sheets ?? []).map((sheet) => (
                <SheetSummaryCard key={sheet.sheet} sheet={sheet} />
              ))}
            </Box>

            {recon && (
              <Alert severity={recon.blocked ? 'error' : recon.warnings?.length ? 'warning' : 'info'}>
                <Typography variant="subtitle2">{t('historicalImport.reconciliationTitle')}</Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationCredits', {
                    value: formatMoney(recon.projectedCredits ?? 0),
                  })}
                </Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationDebits', {
                    value: formatMoney(recon.projectedDebits ?? 0),
                  })}
                </Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationOutstanding', {
                    value: formatMoney(recon.projectedOutstandingLoanPrincipal ?? 0),
                  })}
                </Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationPayouts', {
                    value: formatMoney(recon.projectedPayouts ?? 0),
                  })}
                </Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationAvailable', {
                    value: formatMoney(recon.projectedAvailableFund ?? 0),
                  })}
                </Typography>
                <Typography variant="body2">
                  {t('historicalImport.reconciliationSocial', {
                    value: formatMoney(recon.projectedSocialBalance ?? 0),
                  })}
                </Typography>
                {(recon.warnings ?? []).map((warning) => (
                  <Typography key={warning} variant="body2">
                    {warning}
                  </Typography>
                ))}
                {(recon.errors ?? []).map((error) => (
                  <Typography key={error} variant="body2">
                    {error}
                  </Typography>
                ))}
              </Alert>
            )}

            {preview.totalRows === 0 && (
              <Alert severity="info">{t('historicalImport.emptyWorkbook')}</Alert>
            )}

            {preview.invalidRows > 0 && (
              <Alert severity="error">{t('historicalImport.fixAndReupload')}</Alert>
            )}

            <ResponsiveTable
              columns={errorColumns}
              rows={preview.errors ?? []}
              emptyTitle={t('historicalImport.noErrors')}
              getRowId={(row) =>
                `${row.sheet ?? 'sheet'}-${row.rowNumber ?? 'row'}-${row.field ?? 'field'}-${row.message ?? ''}`
              }
            />

            <Button
              variant="contained"
              disabled={!confirmEnabled || confirmMutation.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {t('historicalImport.confirm')}
            </Button>
          </Stack>
        )}

        {confirmResult && (
          <Alert severity="success">
            <Typography variant="subtitle2">{t('historicalImport.confirmSummaryTitle')}</Typography>
            <Typography variant="body2">
              {t('historicalImport.confirmSummaryBody', {
                members: confirmResult.membersImported,
                contributions: confirmResult.contributionsImported,
                loans: confirmResult.loansImported,
                repayments: confirmResult.repaymentsImported,
                ledger: confirmResult.ledgerEntriesCreated,
              })}
            </Typography>
          </Alert>
        )}

        <Box>
          <Typography variant="h6" gutterBottom>
            {t('historicalImport.historyTitle')}
          </Typography>
          {historyQuery.isLoading && <LoadingState />}
          {historyQuery.isError && (
            <ErrorState
              title={t('historicalImport.historyFailed')}
              message={getErrorMessage(historyQuery.error, t('errors.generic'))}
            />
          )}
          {historyQuery.data && (
            <ResponsiveTable
              columns={historyColumns}
              rows={historyQuery.data}
              emptyTitle={t('historicalImport.noHistory')}
              getRowId={(row) => row.id}
            />
          )}
        </Box>
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        title={t('historicalImport.confirmTitle')}
        message={t('historicalImport.confirmWarning')}
        loading={confirmMutation.isPending}
        onConfirm={() => confirmMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={t('historicalImport.cancelTitle')}
        message={t('historicalImport.cancelMessage')}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      />
    </Box>
  )
}

function SheetSummaryCard({ sheet }: { sheet: HistoricalImportSheetSummary }) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2">{sheet.sheet}</Typography>
        <Typography variant="body2">
          {t('historicalImport.sheetCounts', {
            total: sheet.totalRows,
            valid: sheet.validRows,
            invalid: sheet.invalidRows,
          })}
        </Typography>
      </CardContent>
    </Card>
  )
}
