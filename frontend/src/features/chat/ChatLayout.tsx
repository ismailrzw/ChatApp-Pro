import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from './chatStore'
import { useAuthStore } from '../auth/authStore'
import { useContactsStore } from '../contacts/contactsStore'
import { getSocket } from '../../shared/hooks/useSocket'
import { ConversationList } from './ConversationList'
import { MessageThread } from './MessageThread'
import { MessageInput } from './MessageInput'
import ContactList from '../contacts/ContactList'
import { useAuth } from '../../shared/hooks/useAuth'

type SidebarTab = 'chats' | 'contacts'

function whenSocketReady(callback: () => void, intervalMs = 250, maxMs = 5000) {
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

export default function ChatLayout() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<SidebarTab>('chats')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const currentUser = useAuthStore((s) => s.user)

  // Sync URL param → store + join socket room
  useEffect(() => {
    if (!conversationId) return
    const store = useChatStore.getState()
    store.setActiveConversation(conversationId)
    store.clearUnread(conversationId)

    const timer = whenSocketReady(() => {
      getSocket()?.emit('join_conversation', { conversation_id: conversationId })
    })
    return () => clearInterval(timer)
  }, [conversationId])

  const handleLogout = async () => {
    setShowProfileMenu(false)
    await signOut()
    navigate('/login')
  }

  const displayName =
    (currentUser as any)?.display_name ||
    (currentUser as any)?.email?.split('@')[0] ||
    'User'
  const avatarUrl = (currentUser as any)?.avatar_url

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Icon rail ── */}
      <div className="w-16 flex-shrink-0 bg-slate-900 flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 flex-shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        {/* Chats */}
        <button
          onClick={() => setActiveTab('chats')}
          title="Chats"
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'chats'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>

        {/* Contacts */}
        <button
          onClick={() => setActiveTab('contacts')}
          title="Contacts"
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
            activeTab === 'contacts'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Profile avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((v) => !v)}
            title={displayName}
            className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-700 hover:bg-slate-600 transition-all flex items-center justify-center"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>

          {showProfileMenu && (
            <div className="absolute bottom-0 left-14 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {(currentUser as any)?.email ?? ''}
                </p>
              </div>
              <button
                onClick={() => { setShowProfileMenu(false); navigate('/profile') }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar panel ── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col bg-white">
        {activeTab === 'chats' ? (
          <ConversationList />
        ) : (
          <ContactList isSidebarMode={true} />
        )}
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {activeConversationId ? (
          <>
            <ConversationHeader conversationId={activeConversationId} />
            <MessageThread />
            <MessageInput conversationId={activeConversationId} />
          </>
        ) : (
          <EmptyState onStartChat={() => setActiveTab('chats')} />
        )}
      </div>

      {/* Backdrop for profile menu */}
      {showProfileMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ConversationHeader({ conversationId }: { conversationId: string }) {
  const conversations = useChatStore((s) => s.conversations)
  const onlineStatus = useContactsStore((s) => s.onlineStatus)
  const conv = conversations.find((c) => c.id === conversationId)

  if (!conv) return null

  const isGroup = conv.type === 'group'
  const displayName = isGroup
    ? (conv.group_name ?? 'Group Chat')
    : (conv.other_user?.display_name ?? 'Unknown')
  const avatarUrl = isGroup ? conv.group_avatar : conv.other_user?.avatar_url
  const otherUid = isGroup
    ? null
    : ((conv.other_user as any)?.firebase_uid ?? (conv.other_user as any)?.uid ?? null)
  const isOnline = otherUid ? (onlineStatus[otherUid] ?? false) : false

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            displayName.slice(0, 2).toUpperCase()
          )}
        </div>
        {!isGroup && (
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isOnline ? 'bg-emerald-400' : 'bg-slate-300'
          }`} />
        )}
      </div>
      <div>
        <p className="font-bold text-slate-900 text-sm">{displayName}</p>
        <p className={`text-xs font-medium ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
          {isGroup
            ? `${conv.participants.length} members`
            : isOnline ? 'Online' : 'Offline'}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ onStartChat }: { onStartChat: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-lg font-black text-slate-900 tracking-tight">Your messages</h3>
      <p className="text-sm text-slate-400 font-medium mt-2 max-w-xs">
        Select a conversation or start a new one with your contacts.
      </p>
      <button
        onClick={onStartChat}
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all active:scale-95"
      >
        Start a conversation
      </button>
    </div>
  )
}