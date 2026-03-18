import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../../features/chat/chatStore'
import { getMessages } from '../api/messagesApi'

export function useInfiniteMessages(conversationId: string) {
  // ✅ Select individual primitives — NOT s.getPagination(id) which returns new object
  const hasMore = useChatStore((s) => s.pagination[conversationId]?.hasMore ?? true)
  const isLoading = useChatStore((s) => s.pagination[conversationId]?.loading ?? false)
  const nextCursor = useChatStore((s) => s.pagination[conversationId]?.nextCursor ?? null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || isLoading) return
    useChatStore.getState().setPaginationLoading(conversationId, true)
    try {
      const { messages, has_more, next_cursor } = await getMessages(conversationId, nextCursor)
      useChatStore.getState().prependMessages(conversationId, messages, has_more, next_cursor)
    } catch (err) {
      console.error('[useInfiniteMessages] load failed:', err)
      useChatStore.getState().setPaginationLoading(conversationId, false)
    }
  }, [conversationId, hasMore, isLoading, nextCursor])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  return { sentinelRef, isLoading, hasMore }
}