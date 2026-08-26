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
import { selectIsSuperAdmin, setSelectedCooperativeId } from '@/app/store/authSlice'
import { fetchMyCooperatives } from '@/shared/api/cooperatives'
import { getErrorMessage } from '@/shared/api/client'

export function CooperativeSelector({ onDark = false }: { onDark?: boolean }) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const selected = useAppSelector((s) => s.auth.selectedCooperativeId)
  const authStatus = useAppSelector((s) => s.auth.status)
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin)

  const query = useQuery({
    queryKey: ['cooperatives', 'mine'],
    queryFn: fetchMyCooperatives,
    enabled: authStatus === 'authenticated',
    staleTime: 60_000,
  })

  const cooperatives = query.data ?? []

  useEffect(() => {
    if (!cooperatives.length) return
    const stillValid = Boolean(selected && cooperatives.some((c) => c.id === selected))
    if (stillValid) return
    if (isSuperAdmin) {
      if (selected) dispatch(setSelectedCooperativeId(null))
      return
    }
    dispatch(setSelectedCooperativeId(cooperatives[0].id))
  }, [cooperatives, selected, dispatch, isSuperAdmin])

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
    <FormControl
      size="small"
      sx={{
        minWidth: { xs: 140, sm: 200 },
        maxWidth: { xs: 180, sm: 260 },
        ...(onDark
          ? {
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.75)' },
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
              },
              '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.8)' },
            }
          : null),
      }}
    >
      <InputLabel id="coop-select-label" shrink={isSuperAdmin || Boolean(selected)}>
        {t('common.selectCooperative')}
      </InputLabel>
      <Select
        labelId="coop-select-label"
        label={t('common.selectCooperative')}
        displayEmpty={isSuperAdmin}
        notched={isSuperAdmin || Boolean(selected)}
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
        {isSuperAdmin ? (
          <MenuItem value="">
            {t('dashboard.super.allCooperatives')}
          </MenuItem>
        ) : null}
        {cooperatives.map((coop) => (
          <MenuItem key={coop.id} value={coop.id}>
            {coop.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
