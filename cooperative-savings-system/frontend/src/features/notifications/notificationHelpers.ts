import type { AppNotification } from '@/shared/types/notification'

export function isUnread(notification: Pick<AppNotification, 'read'>): boolean {
  return !notification.read
}

export function unreadHighlightSx(unread: boolean) {
  if (!unread) return undefined
  return {
    bgcolor: 'action.hover',
    borderLeft: '3px solid',
    borderLeftColor: 'primary.main',
  } as const
}

export function sortNotificationsNewestFirst(
  items: AppNotification[],
): AppNotification[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
    return bTime - aTime
  })
}
