import BusinessIcon from '@mui/icons-material/Business'
import {
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setSelectedCooperativeId } from '@/app/store/authSlice'
import { fetchMyCooperatives } from '@/shared/api/cooperatives'
import { getErrorMessage } from '@/shared/api/client'

export function CooperativeSelector() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const selected = useAppSelector((s) => s.auth.selectedCooperativeId)
  const authStatus = useAppSelector((s) => s.auth.status)

  const query = useQuery({
    queryKey: ['cooperatives', 'mine'],
    queryFn: fetchMyCooperatives,
    enabled: authStatus === 'authenticated',
    staleTime: 60_000,
  })

  const cooperatives = query.data ?? []

  useEffect(() => {
    if (!cooperatives.length) return
    const stillValid = selected && cooperatives.some((c) => c.id === selected)
    if (!stillValid) {
      dispatch(setSelectedCooperativeId(cooperatives[0].id))
    }
  }, [cooperatives, selected, dispatch])

  if (query.isLoading) {
    return (
      <Skeleton
        variant="rounded"
        width={160}
        height={40}
        animation="wave"
        aria-label={t('common.loading')}
        sx={{ minWidth: { xs: 120, sm: 180 } }}
      />
    )
  }

  if (query.isError) {
    return (
      <Typography
        variant="caption"
        color="error"
        sx={{ maxWidth: 160, display: { xs: 'none', sm: 'block' } }}
        title={getErrorMessage(query.error)}
      >
        {t('cooperatives.selectorError')}
      </Typography>
    )
  }

  if (!cooperatives.length) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          maxWidth: { xs: 120, sm: 200 },
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {t('cooperatives.noneAvailable')}
      </Typography>
    )
  }

  return (
    <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 200 }, maxWidth: { xs: 180, sm: 260 } }}>
      <InputLabel id="coop-select-label">{t('common.selectCooperative')}</InputLabel>
      <Select
        labelId="coop-select-label"
        label={t('common.selectCooperative')}
        value={selected && cooperatives.some((c) => c.id === selected) ? selected : ''}
        onChange={(e) => dispatch(setSelectedCooperativeId(e.target.value || null))}
        startAdornment={
          query.isFetching ? (
            <CircularProgress size={14} sx={{ mr: 1 }} />
          ) : (
            <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          )
        }
      >
        {cooperatives.map((coop) => (
          <MenuItem key={coop.id} value={coop.id}>
            {coop.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
