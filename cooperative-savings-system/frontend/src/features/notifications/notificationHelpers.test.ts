import { describe, expect, it } from 'vitest'
import type { AppNotification } from '@/shared/types/notification'
import {
  isUnread,
  sortNotificationsNewestFirst,
  unreadHighlightSx,
} from './notificationHelpers'

function n(partial: Partial<AppNotification> & Pick<AppNotification, 'id'>): AppNotification {
  return {
    userId: 'u1',
    type: 'SYSTEM',
    title: 't',
    read: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('notificationHelpers', () => {
  it('detects unread notifications', () => {
    expect(isUnread({ read: false })).toBe(true)
    expect(isUnread({ read: true })).toBe(false)
  })

  it('returns highlight styles only for unread', () => {
    expect(unreadHighlightSx(false)).toBeUndefined()
    expect(unreadHighlightSx(true)).toMatchObject({
      borderLeft: '3px solid',
      borderLeftColor: 'primary.main',
    })
  })

  it('sorts newest first', () => {
    const sorted = sortNotificationsNewestFirst([
      n({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
      n({ id: 'b', createdAt: '2026-02-01T00:00:00Z' }),
      n({ id: 'c', createdAt: '2026-01-15T00:00:00Z' }),
    ])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })
})
