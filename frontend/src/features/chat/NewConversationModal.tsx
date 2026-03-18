import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from './chatStore'
import { useContactsStore } from '../contacts/contactsStore'
import { createConversation } from '../../shared/api/conversationsApi'
import { getSocket } from '../../shared/hooks/useSocket'

interface NewConversationModalProps {
  onClose: () => void
}

export const NewConversationModal = ({ onClose }: NewConversationModalProps) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ✅ Select raw array — stable reference
  // NEVER do: useContactsStore((s) => s.contacts.filter(...))
  // .filter() returns a new array every render → infinite loop
  const allContacts = useContactsStore((s) => s.contacts)

  // ✅ Derive filtered list with useMemo — only re-runs when allContacts or query changes
  const acceptedContacts = useMemo(
    () => allContacts.filter((c) => c.status === 'accepted' && c.other_user != null),
    [allContacts]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return acceptedContacts
    return acceptedContacts.filter((c) => {
      const name = (c.other_user?.display_name ?? '').toLowerCase()
      const email = (c.other_user?.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [acceptedContacts, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSelect = async (contact: typeof acceptedContacts[0]) => {
    if (creating || !contact.other_user) return
    setCreating(true)
    setError(null)

    const otherUid: string =
      (contact.other_user as any).firebase_uid ??
      (contact.other_user as any).uid ??
      ''

    if (!otherUid) {
      setError('Cannot determine user ID')
      setCreating(false)
      return
    }

    try {
      const conv = await createConversation({ type: 'direct', participant_uid: otherUid })

      const store = useChatStore.getState()
      store.upsertConversation(conv)
      store.setActiveConversation(conv.id)
      store.clearUnread(conv.id)

      let attempts = 0
      const tryJoin = () => {
        const sock = getSocket()
        if (sock?.connected) {
          sock.emit('join_conversation', { conversation_id: conv.id })
        } else if (attempts < 10) {
          attempts++
          setTimeout(tryJoin, 300)
        }
      }
      tryJoin()

      onClose()
      navigate(`/chat/${conv.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open conversation')
    } finally {
      setCreating(false)
    }
  }

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Message</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm outline-none placeholder-gray-400 text-gray-800"
          />
        </div>

        {error && <p className="px-5 py-2 text-xs text-red-500 bg-red-50">{error}</p>}

        <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-gray-400">
              {query.trim().length > 0 ? 'No contacts match your search.' : 'You have no contacts yet.'}
            </li>
          ) : (
            filtered.map((contact) => {
              const key =
                (contact as any).id ??
                (contact as any)._id ??
                contact.contact_id ??
                (contact.other_user as any)?.firebase_uid
              const name = contact.other_user?.display_name || 'Unknown User'
              const avatar = contact.other_user?.avatar_url

              return (
                <li key={key}>
                  <button
                    onClick={() => handleSelect(contact)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden">
                      {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      {contact.other_user?.email && (
                        <p className="text-xs text-gray-400 truncate">{contact.other_user.email}</p>
                      )}
                    </div>
                    {creating && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}