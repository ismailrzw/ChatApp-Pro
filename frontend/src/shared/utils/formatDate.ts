/**
 * Date formatting utilities for ChatNow.
 */

/**
 * Format time for message bubbles.
 * Uses 24-hour format: "14:26", "02:37" — no AM/PM confusion.
 */
export function formatMessageTime(isoStr: string): string {
  if (!isoStr) return ''
  try {
    const date = new Date(isoStr)
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24h — avoids the "02:26 am" vs "14:26" inconsistency
    })
  } catch {
    return ''
  }
}

/**
 * Format timestamp for conversation list items.
 * - < 1 min  → "now"
 * - < 1 hour → "5m"
 * - today    → "14:30"
 * - yesterday → "Yesterday"
 * - this week → "Mon"
 * - this year → "12 Mar"
 * - older    → "12/03/26"
 */
export function formatConversationTime(isoStr: string): string {
  if (!isoStr) return ''
  try {
    const date = new Date(isoStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    }

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    if (isYesterday) return 'Yesterday'

    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
    }

    return date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Format last seen for contact cards.
 * isOnline = true  → "Online"
 * isOnline = false → "Last seen today at 14:30" etc.
 */
export function formatLastSeen(
  isoStr: string | null | undefined,
  isOnline: boolean
): string {
  if (isOnline) return 'Online'
  if (!isoStr) return 'Offline'

  try {
    const date = new Date(isoStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Last seen just now'
    if (diffMins < 60) return `Last seen ${diffMins}m ago`

    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    if (isToday) return `Last seen today at ${timeStr}`

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    if (isYesterday) return `Last seen yesterday at ${timeStr}`

    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays < 7) {
      const dayName = date.toLocaleDateString([], { weekday: 'short' })
      return `Last seen ${dayName} at ${timeStr}`
    }

    return `Last seen ${date.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
    })}`
  } catch {
    return 'Offline'
  }
}