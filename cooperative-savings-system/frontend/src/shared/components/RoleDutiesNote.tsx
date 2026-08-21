import { Alert, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { primaryRole } from '@/shared/types/auth'
import { normalizeRoleInCooperative } from '@/shared/types/member'

interface RoleDutiesNoteProps {
  /** JWT roles or a single cooperative office code. */
  role?: string | null
  roles?: string[]
  compact?: boolean
}

export function dutyRoleCode(role?: string | null, roles?: string[]): string {
  if (roles?.length) {
    return primaryRole(roles)
  }
  if (!role) return 'MEMBER'
  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  return normalizeRoleInCooperative(role)
}

export function RoleDutiesNote({ role, roles, compact = false }: RoleDutiesNoteProps) {
  const { t } = useTranslation()
  const code = dutyRoleCode(role, roles)
  const duties = t(`roles.duties.${code}`, { defaultValue: '' })
  if (!duties) return null

  const title = t(`members.roles.${code}`, {
    defaultValue: t(`roles.${code}`, { defaultValue: code }),
  })

  return (
    <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
      {compact ? null : (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('roles.dutiesTitle', { role: title })}
        </Typography>
      )}
      <Typography variant="body2">{duties}</Typography>
    </Alert>
  )
}
