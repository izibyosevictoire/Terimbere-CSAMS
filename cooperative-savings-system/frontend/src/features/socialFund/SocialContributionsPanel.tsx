import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/api/client'
import { fetchMembers } from '@/shared/api/members'
import {
  approveSocialContribution,
  createSocialContribution,
  fetchMySocialContributions,
  fetchSocialContributions,
  rejectSocialContribution,
} from '@/shared/api/socialFund'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ErrorState } from '@/shared/components/ErrorState'
import { LoadingState } from '@/shared/components/LoadingState'
import { ResponsiveTable, type TableColumn } from '@/shared/components/ResponsiveTable'
import type { SocialContribution } from '@/shared/types/socialFund'
import {
  SOCIAL_CONTRIBUTION_STATUSES,
  socialContributionDisplayName,
} from '@/shared/types/socialFund'
import { memberDisplayName } from '@/shared/types/member'
import { formatMoney } from '@/shared/utils/formatMoney'
import {
  canApproveSocialContribution,
  canRejectSocialContribution,
  socialStatusColor,
} from './socialFundHelpers'
import {
  socialContributionDefaults,
  socialContributionSchema,
  toSocialContributionPayload,
  type SocialContributionFormValues,
} from './socialFundFormSchemas'

interface SocialContributionsPanelProps {
  cooperativeId: string
  isAdmin: boolean
}

export function SocialContributionsPanel({
  cooperativeId,
  isAdmin,
}: SocialContributionsPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [reviewTarget, setReviewTarget] = useState<{
    id: string
    action: 'approve' | 'reject'
  } | null>(null)

  const listQuery = useQuery({
    queryKey: ['social-fund', 'contributions', cooperativeId, isAdmin, status, page, size],
    queryFn: async () => {
      if (isAdmin) {
        return fetchSocialContributions(cooperativeId, {
          status: status || undefined,
          page,
          size,
          sort: 'createdAt,desc',
        })
      }
      const list = await fetchMySocialContributions(cooperativeId)
      const filtered = status
        ? list.filter((row) => String(row.status) === status)
        : list
      const start = page * size
      const totalElements = filtered.length
      const totalPages = Math.ceil(totalElements / size) || 0
      return {
        content: filtered.slice(start, start + size),
        page,
        size,
        totalElements,
        totalPages,
        first: page === 0,
        last: page >= totalPages - 1 || totalElements === 0,
      }
    },
    enabled: Boolean(cooperativeId),
  })

  const membersQuery = useQuery({
    queryKey: ['members', cooperativeId, 'social-contrib-select'],
    queryFn: () => fetchMembers(cooperativeId, { status: 'ACTIVE', size: 200 }),
    enabled: Boolean(cooperativeId) && isAdmin,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SocialContributionFormValues>({
    defaultValues: socialContributionDefaults,
    resolver: yupResolver(socialContributionSchema),
  })

  const submitMutation = useMutation({
    mutationFn: (values: SocialContributionFormValues) =>
      createSocialContribution(
        cooperativeId,
        toSocialContributionPayload(values, { includeMember: isAdmin }),
      ),
    onSuccess: () => {
      enqueueSnackbar(t('socialFund.contributions.submitSuccess'), { variant: 'success' })
      reset(socialContributionDefaults)
      void queryClient.invalidateQueries({ queryKey: ['social-fund'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!reviewTarget) throw new Error('Missing review target')
      return reviewTarget.action === 'approve'
        ? approveSocialContribution(cooperativeId, reviewTarget.id)
        : rejectSocialContribution(cooperativeId, reviewTarget.id)
    },
    onSuccess: () => {
      enqueueSnackbar(
        reviewTarget?.action === 'approve'
          ? t('socialFund.contributions.approveSuccess')
          : t('socialFund.contributions.rejectSuccess'),
        { variant: 'success' },
      )
      setReviewTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['social-fund'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      enqueueSnackbar(getErrorMessage(error, t('errors.generic')), { variant: 'error' })
    },
  })

  const columns: TableColumn<SocialContribution>[] = useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              id: 'member',
              label: t('socialFund.fields.member'),
              render: (row: SocialContribution) => socialContributionDisplayName(row),
            },
          ]
        : []),
      {
        id: 'amount',
        label: t('socialFund.fields.amount'),
        render: (row) => formatMoney(row.amount),
      },
      {
        id: 'date',
        label: t('socialFund.fields.contributionDate'),
        render: (row) => row.contributionDate || '—',
        hideOnMobile: true,
      },
      {
        id: 'reference',
        label: t('socialFund.fields.reference'),
        render: (row) => row.paymentReference || '—',
        hideOnMobile: true,
      },
      {
        id: 'status',
        label: t('socialFund.fields.status'),
        render: (row) => (
          <Chip
            size="small"
            color={socialStatusColor(String(row.status))}
            label={t(`socialFund.status.${row.status}`, { defaultValue: row.status })}
          />
        ),
      },
      ...(isAdmin
        ? [
            {
              id: 'actions',
              label: t('common.actions'),
              render: (row: SocialContribution) => {
                const canApprove = canApproveSocialContribution(String(row.status), isAdmin)
                const canReject = canRejectSocialContribution(String(row.status), isAdmin)
                if (!canApprove && !canReject) return '—'
                return (
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {canApprove ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReviewTarget({ id: row.id, action: 'approve' })
                        }}
                      >
                        {t('socialFund.actions.approve')}
                      </Button>
                    ) : null}
                    {canReject ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReviewTarget({ id: row.id, action: 'reject' })
                        }}
                      >
                        {t('socialFund.actions.reject')}
                      </Button>
                    ) : null}
                  </Stack>
                )
              },
            },
          ]
        : []),
    ],
    [isAdmin, t],
  )

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">{t('socialFund.contributions.hint')}</Alert>

      <Box
        component="form"
        onSubmit={handleSubmit((values) => submitMutation.mutate(values))}
        sx={{
          maxWidth: 560,
          p: { xs: 2, sm: 2.5 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="h6" gutterBottom>
          {t('socialFund.contributions.submitTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('socialFund.contributions.submitDescription')}
        </Typography>
        <Stack spacing={2}>
          {isAdmin ? (
            <TextField
              select
              label={t('socialFund.fields.member')}
              error={Boolean(errors.memberUserId)}
              helperText={
                errors.memberUserId?.message || t('socialFund.contributions.memberOptional')
              }
              {...register('memberUserId')}
              fullWidth
            >
              <MenuItem value="">{t('socialFund.contributions.selfSubmit')}</MenuItem>
              {(membersQuery.data?.content ?? []).map((member) => (
                <MenuItem key={member.userId} value={member.userId}>
                  {memberDisplayName(member)}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label={t('socialFund.fields.amount')}
            error={Boolean(errors.amount)}
            helperText={errors.amount?.message}
            {...register('amount')}
            fullWidth
          />
          <TextField
            type="date"
            label={t('socialFund.fields.contributionDate')}
            slotProps={{ inputLabel: { shrink: true } }}
            error={Boolean(errors.contributionDate)}
            helperText={errors.contributionDate?.message}
            {...register('contributionDate')}
            fullWidth
          />
          <TextField
            label={t('socialFund.fields.reference')}
            error={Boolean(errors.paymentReference)}
            helperText={errors.paymentReference?.message}
            {...register('paymentReference')}
            fullWidth
          />
          <TextField
            label={t('socialFund.fields.notes')}
            multiline
            minRows={2}
            error={Boolean(errors.notes)}
            helperText={errors.notes?.message}
            {...register('notes')}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={submitMutation.isPending}>
            {t('socialFund.contributions.submit')}
          </Button>
        </Stack>
      </Box>

      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ mb: 2, flexWrap: 'wrap', alignItems: { sm: 'center' } }}
        >
          <Typography variant="h6" sx={{ flex: 1 }}>
            {isAdmin
              ? t('socialFund.contributions.allTitle')
              : t('socialFund.contributions.myTitle')}
          </Typography>
          <TextField
            select
            size="small"
            label={t('socialFund.fields.status')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            {SOCIAL_CONTRIBUTION_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {t(`socialFund.status.${s}`)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {listQuery.isLoading ? <LoadingState variant="skeleton" rows={4} /> : null}
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
              rows={listQuery.data?.content ?? []}
              getRowId={(row) => row.id}
              emptyTitle={t('socialFund.contributions.emptyTitle')}
              emptyDescription={
                isAdmin
                  ? t('socialFund.contributions.emptyDescription')
                  : t('socialFund.contributions.myEmptyDescription')
              }
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
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        ) : null}
      </Box>

      <ConfirmDialog
        open={Boolean(reviewTarget)}
        title={
          reviewTarget?.action === 'approve'
            ? t('socialFund.contributions.confirmApproveTitle')
            : t('socialFund.contributions.confirmRejectTitle')
        }
        message={
          reviewTarget?.action === 'approve'
            ? t('socialFund.contributions.confirmApproveMessage')
            : t('socialFund.contributions.confirmRejectMessage')
        }
        loading={reviewMutation.isPending}
        onCancel={() => setReviewTarget(null)}
        onConfirm={() => reviewMutation.mutate()}
      />
    </Stack>
  )
}
