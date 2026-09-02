import type { AuditLog } from '@/shared/types/auditLog'

export function formatJsonBlock(value?: string | null): string {
  if (value == null || value === '') return '—'
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return JSON.stringify(parsed, null, 2)
  } catch {
    return value
  }
}

export function parseJsonSafe(value?: string | null): unknown {
  if (value == null || value === '') return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function toIsoDateStart(date: string): string | undefined {
  if (!date) return undefined
  return `${date}T00:00:00Z`
}

export function toIsoDateEnd(date: string): string | undefined {
  if (!date) return undefined
  return `${date}T23:59:59Z`
}

export function auditUserLabel(
  log: Pick<AuditLog, 'userName' | 'username' | 'userId'>,
): string {
  return log.userName?.trim() || log.username?.trim() || '—'
}

export function auditEntityLabel(
  log: Pick<AuditLog, 'entityLabel' | 'entityType'>,
): string {
  return log.entityLabel?.trim() || '—'
}

export function displayAuditEntityType(
  entityType: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!entityType?.trim()) return '—'
  if (entityType === 'Cooperative') return t('auditLogs.entityTypes.Cooperative')
  return entityType
}
