import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from './chatStore'
import { useAuthStore } from '../auth/authStore'
import { useContactsStore } from '../contacts/contactsStore'
import { getConversations } from '../../shared/api/conversationsApi'
import { getSocket } from '../../shared/hooks/useSocket'
import { NewConversationModal } from './NewConversationModal'
import { formatConversationTime } from '../../shared/utils/formatDate'
import type { Conversation } from '../../types/conversation'

function whenSocketReady(callback: () => void, intervalMs = 300, maxMs = 5000) {
  let elapsed = 0
  const timer = setInterval(() => {
    elapsed += intervalMs
    const sock = getSocket()
    if (sock?.connected) {
      clearInterval(timer)
      callback()
    } else if (elapsed >= maxMs) {
      clearInterval(timer)
    }
  }, intervalMs)
  return timer
}

const SkeletonRow = () => (
  <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-slate-100 rounded-full w-2/3" />
      <div className="h-3 bg-slate-50 rounded-full w-4/5" />
    </div>
    <div className="h-3 bg-slate-100 rounded w-8 flex-shrink-0" />
  </div>
)

export const ConversationList = () => {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const loading = useChatStore((s) => s.conversationsLoading)
  const onlineStatus = useContactsStore((s) => s.onlineStatus)

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [conversations]
  )

  const currentUser = useAuthStore((s) => s.user)
  const currentUid: string =
    (currentUser as any)?.firebase_uid ?? (currentUser as any)?.uid ?? ''

  useEffect(() => {
    if (useChatStore.getState().conversations.length > 0) {
      whenSocketReady(() => {
        const sock = getSocket()
        useChatStore.getState().conversations.forEach((c) =>
          sock?.emit('join_conversation', { conversation_id: c.id })
        )
      })
      return
    }

    const store = useChatStore.getState()
    store.setConversationsLoading(true)

    getConversations()
      .then((convs) => {
        store.setConversations(convs)
        store.setConversationsLoading(false)
        whenSocketReady(() => {
          const sock = getSocket()
          convs.forEach((c) =>
            sock?.emit('join_conversation', { conversation_id: c.id })
          )
        })
      })
      .catch((err: Error) => {
        store.setConversationsError(err.message ?? 'Failed to load conversations')
        store.setConversationsLoading(false)
      })
  }, [])

  const handleSelect = (conv: Conversation) => {
    const store = useChatStore.getState()
    store.setActiveConversation(conv.id)
    store.clearUnread(conv.id)
    navigate(`/chat/${conv.id}`)
  }

  const getOtherUid = (conv: Conversation): string =>
    (conv.other_user as any)?.firebase_uid ??
    (conv.other_user as any)?.uid ??
    ''

  const getDisplayName = (conv: Conversation) =>
    conv.type === 'direct' && conv.other_user
      ? conv.other_user.display_name || 'Unknown'
      : conv.group_name || 'Group Chat'

  const getAvatarUrl = (conv: Conversation) =>
    conv.type === 'direct' && conv.other_user
      ? conv.other_user.avatar_url ?? null
      : conv.group_avatar ?? null

  const getPreview = (conv: Conversation): string => {
    if (!conv.last_message) return 'No messages yet'
    const isOwn = conv.last_message.sender_uid === currentUid
    const prefix = isOwn ? 'You: ' : ''
    const text = conv.last_message.text
    const truncated = text.length > 35 ? text.slice(0, 35) + '…' : text
    return `${prefix}${truncated}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="font-black text-slate-900 text-lg tracking-tight">Messages</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {sortedConversations.length} conversation{sortedConversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 shadow-lg shadow-blue-100"
          title="New conversation"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-400">No conversations yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              Start one
            </button>
          </div>
        ) : (
          <div className="py-1">
            {sortedConversations.map((conv) => {
              const isActive = conv.id === activeId
              const displayName = getDisplayName(conv)
              const avatarUrl = getAvatarUrl(conv)
              const preview = getPreview(conv)
              const unread = conv.unread_count ?? 0
              const otherUid = conv.type === 'direct' ? getOtherUid(conv) : ''
              const isOnline = otherUid ? (onlineStatus[otherUid] ?? false) : false
              const timeStr = conv.last_message
                ? formatConversationTime(conv.last_message.sent_at)
                : formatConversationTime(conv.updated_at)

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left hover:bg-slate-50 ${
                    isActive
                      ? 'bg-blue-50 border-r-[3px] border-blue-600'
                      : ''
                  }`}
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden ${
                      isActive ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                    } bg-gradient-to-br from-blue-500 to-blue-600`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayName.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    {/* Online indicator */}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isOnline ? 'bg-emerald-400' : 'bg-slate-300'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm font-bold truncate ${
                        isActive ? 'text-blue-700' : 'text-slate-900'
                      }`}>
                        {displayName}
                      </span>
                      <span className={`text-[11px] flex-shrink-0 font-medium ${
                        unread > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'
                      }`}>
                        {timeStr}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${
                        unread > 0 ? 'text-slate-800 font-semibold' : 'text-slate-500'
                      }`}>
                        {preview}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 bg-blue-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <NewConversationModal onClose={() => setShowModal(false)} />}
    </div>
  )
}