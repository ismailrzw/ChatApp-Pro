import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from './chatStore'
import { useAuthStore } from '../auth/authStore'
import { useInfiniteMessages } from '../../shared/hooks/useInfiniteMessages'
import { getMessages } from '../../shared/api/messagesApi'
import MessageBubble from './MessageBubble'
import type { Message } from '../../types/message'

const NEAR_BOTTOM_THRESHOLD = 100

const SkeletonBubble = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex mb-3 px-4 ${isOwn ? 'justify-end' : 'justify-start'} animate-pulse`}>
    <div className={`h-9 rounded-2xl bg-gray-200 ${isOwn ? 'w-40' : 'w-48'}`} />
  </div>
)

export const MessageThread = () => {
  const activeConversationId = useChatStore((s) => s.activeConversationId)

  // Explicit type annotation — avoids 'unknown' inference
  // Store the conversation_id string to use as a stable key for message lookup
  const messagesMap = useChatStore((s) => s.messages)
  const messages: Message[] = activeConversationId
    ? (messagesMap[activeConversationId] ?? [])
    : []

  const paginationLoading = useChatStore((s) =>
    activeConversationId ? (s.pagination[activeConversationId]?.loading ?? false) : false
  )
  const paginationHasMore = useChatStore((s) =>
    activeConversationId ? (s.pagination[activeConversationId]?.hasMore ?? true) : true
  )

  const initialLoading = paginationLoading && messages.length === 0

  const currentUid = useAuthStore((s) => {
    const u = s.user as any
    return ((u?.firebase_uid ?? u?.uid) || '') as string
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef(0)
  const [showNewBadge, setShowNewBadge] = useState(false)
  const messagesLengthRef = useRef(0)

  const { sentinelRef, isLoading: loadingOlder } = useInfiniteMessages(
    activeConversationId ?? ''
  )

  useEffect(() => {
    if (!activeConversationId) return
    useChatStore.getState().clearUnread(activeConversationId)
    const existing = useChatStore.getState().messages[activeConversationId]
    if (existing && existing.length > 0) return

    useChatStore.getState().setPaginationLoading(activeConversationId, true)
    getMessages(activeConversationId)
      .then(({ messages: msgs, has_more, next_cursor }) => {
        useChatStore
          .getState()
          .setMessages(activeConversationId, msgs, has_more, next_cursor)
      })
      .catch((err: Error) => {
        console.error('[MessageThread] load failed:', err)
        useChatStore.getState().setPaginationLoading(activeConversationId, false)
      })
  }, [activeConversationId])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [initialLoading]) // eslint-disable-line

  // Auto-scroll or badge on new message
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const newLen = messages.length
    const prevLen = messagesLengthRef.current
    messagesLengthRef.current = newLen
    if (newLen <= prevLen) return
    const distFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distFromBottom <= NEAR_BOTTOM_THRESHOLD) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShowNewBadge(false)
    } else {
      setShowNewBadge(true)
    }
  }, [messages.length])

  // Preserve scroll position after prepend
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    if (loadingOlder) {
      prevScrollHeightRef.current = container.scrollHeight
    } else {
      const delta = container.scrollHeight - prevScrollHeightRef.current
      if (delta > 0) container.scrollTop += delta
    }
  }, [loadingOlder])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowNewBadge(false)
  }, [])

  if (!activeConversationId) return null

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto flex flex-col pt-2 pb-2"
      >
        <div ref={sentinelRef} className="h-1 flex-shrink-0" />

        {loadingOlder && (
          <div className="text-center text-xs text-gray-400 py-2">Loading…</div>
        )}
        {!loadingOlder && !paginationHasMore && messages.length > 0 && (
          <div className="text-center text-xs text-gray-300 py-2">
            Beginning of conversation
          </div>
        )}

        {initialLoading ? (
          <>
            <SkeletonBubble />
            <SkeletonBubble isOwn />
            <SkeletonBubble />
            <SkeletonBubble isOwn />
            <SkeletonBubble />
          </>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg: Message) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_uid === currentUid}
              showAvatar={false}
              currentUid={currentUid}
            />
          ))
        )}

        <div ref={bottomRef} className="h-1 flex-shrink-0" />
      </div>

      {showNewBadge && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-md hover:bg-blue-600 transition-colors flex items-center gap-1"
        >
          <span>↓</span>
          <span>New message</span>
        </button>
      )}
    </div>
  )
}