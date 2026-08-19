import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  fetchCooperative,
  updateCooperative,
  updateCooperativeStatus,
  uploadCooperativeLogo,
} from '@/shared/api/cooperatives'
import { getErrorMessage } from '@/shared/api/client'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { PageHeader } from '@/shared/components/PageHeader'
import { ROUTES } from '@/shared/constants/routes'
import type { CooperativeStatus } from '@/shared/types/cooperative'
import { COOPERATIVE_STATUSES } from '@/shared/types/cooperative'
import { formatMoney } from '@/shared/utils/formatMoney'
import { CooperativeFormDialog } from '@/features/cooperatives/CooperativeFormDialog'
import type { CooperativeCreateRequest } from '@/shared/types/cooperative'

function statusColor(
  status: CooperativeStatus,
): 'success' | 'default' | 'warning' | 'error' {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'warning'
    case 'ARCHIVED':
      return 'error'
    default:
      return 'default'
  }
}

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

export function CooperativeDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [editOpen, setEditOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<CooperativeStatus | null>(null)

  const query = useQuery({
    queryKey: ['cooperatives', id],
    queryFn: () => fetchCooperative(id),
    enabled: Boolean(id),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CooperativeCreateRequest) => updateCooperative(id, payload),
    onSuccess: () => {
      enqueueSnackbar(t('cooperatives.updateSuccess'), { variant: 'success' })
      setEditOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['cooperatives'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (next: CooperativeStatus) => updateCooperativeStatus(id, { status: next }),
    onSuccess: () => {
      enqueueSnackbar(t('cooperatives.statusUpdated'), { variant: 'success' })
      setStatusTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['cooperatives'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => uploadCooperativeLogo(id, file),
    onSuccess: () => {
      enqueueSnackbar(t('cooperatives.logoUpdated'), { variant: 'success' })
      void queryClient.invalidateQueries({ queryKey: ['cooperatives'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const coop = query.data

  return (
    <Box>
      <Button
        component={RouterLink}
        to={ROUTES.cooperatives}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 1 }}
      >
        {t('cooperatives.backToList')}
      </Button>

      <PageHeader
        title={coop?.name ?? t('pages.cooperatives.title')}
        description={t('cooperatives.detailDescription')}
        hideBack
        actions={
          coop ? (
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
              {t('common.edit')}
            </Button>
          ) : null
        }
      />

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {coop ? (
        <Stack spacing={2.5}>
          <Paper
            elevation={0}
            sx={{ p: { xs: 2.5, md: 3.5 }, border: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip size="small" color={statusColor(coop.status)} label={t(`status.${coop.status}`)} />
              <Typography variant="body2" color="text.secondary">
                {coop.currency}
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <InfoRow label={t('cooperatives.fields.description')} value={coop.description ?? ''} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('cooperatives.fields.registrationNumber')}
                  value={coop.registrationNumber ?? ''}
                />
                <InfoRow
                  label={t('cooperatives.fields.registrationDate')}
                  value={coop.registrationDate ?? ''}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('cooperatives.fields.contactEmail')}
                  value={coop.contactEmail ?? ''}
                />
                <InfoRow
                  label={t('cooperatives.fields.contactPhone')}
                  value={coop.contactPhone ?? ''}
                />
              </Stack>
              <InfoRow label={t('cooperatives.fields.address')} value={coop.address ?? ''} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoRow
                  label={t('cooperatives.fields.financialYearStartMonth')}
                  value={String(coop.financialYearStartMonth)}
                />
                <InfoRow
                  label={t('cooperatives.fields.contributionDueDay')}
                  value={String(coop.contributionDueDay)}
                />
                <InfoRow
                  label={t('cooperatives.fields.monthlyContributionAmount')}
                  value={formatMoney(coop.monthlyContributionAmount ?? 0, {
                    currency: coop.currency || 'RWF',
                  })}
                />
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="h6" gutterBottom>
              {t('cooperatives.statusActions')}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {COOPERATIVE_STATUSES.filter((s) => s !== coop.status).map((next) => (
                <Button key={next} variant="outlined" size="small" onClick={() => setStatusTarget(next)}>
                  {t(`status.${next}`)}
                </Button>
              ))}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="h6" gutterBottom>
              {t('cooperatives.logo')}
            </Typography>
            {coop.logoUrl ? (
              <Box
                component="img"
                src={coop.logoUrl}
                alt={coop.name}
                sx={{ maxWidth: 160, maxHeight: 80, mb: 2, objectFit: 'contain' }}
              />
            ) : (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {t('cooperatives.noLogo')}
              </Typography>
            )}
            <Button variant="outlined" component="label" disabled={logoMutation.isPending}>
              {t('cooperatives.uploadLogo')}
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) logoMutation.mutate(file)
                  e.target.value = ''
                }}
              />
            </Button>
          </Paper>
        </Stack>
      ) : null}

      <CooperativeFormDialog
        open={editOpen}
        mode="edit"
        initial={coop}
        loading={updateMutation.isPending}
        onClose={() => setEditOpen(false)}
        onSubmit={(payload) => updateMutation.mutate(payload)}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={t('cooperatives.confirmStatusTitle')}
        message={
          statusTarget && coop
            ? t('cooperatives.confirmStatusMessage', {
                name: coop.name,
                status: t(`status.${statusTarget}`),
              })
            : ''
        }
        loading={statusMutation.isPending}
        onCancel={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget) return
          statusMutation.mutate(statusTarget)
        }}
      />
    </Box>
  )
}
