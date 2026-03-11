import React, { useEffect, useRef, useState } from 'react'
import { getContacts, updateContact, deleteContact } from '../../shared/api/contactsApi'
import { useContactsStore } from './contactsStore'
import ContactCard from './ContactCard'
import ContactSearch from './ContactSearch'
import Modal from '../../shared/components/Modal'
import { useToast } from '../../shared/components/Toast'
import Avatar from '../../shared/components/Avatar'
import BaseLayout from '../../shared/components/BaseLayout'
import { getSocket } from '../../shared/hooks/useSocket'
import { useAuthStore } from '../auth/authStore'

interface ContactListProps {
  isSidebarMode?: boolean
}

export default function ContactList({ isSidebarMode = false }: ContactListProps) {
  const {
    contacts,
    setContacts,
    loading,
    setLoading,
    setError,
    removeContact,
    addContact,
  } = useContactsStore()

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [blockModal, setBlockModal] = useState<{
    isOpen: boolean
    contactId: string
    name: string
  }>({ isOpen: false, contactId: '', name: '' })
  const [unfriendModal, setUnfriendModal] = useState<{
    isOpen: boolean
    contactId: string
    name: string
  }>({ isOpen: false, contactId: '', name: '' })
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])

  // Single ToastContainer lives here.
  // ContactSearch receives showToast as a prop — never calls useToast() itself.
  const { showToast, ToastContainer } = useToast()

  // showToastRef: keeps latest showToast without it ever entering a dep array.
  // Functions from hooks are recreated every render. Putting them in dep arrays
  // causes infinite loops. A ref is always the same object — safe.
  const showToastRef = useRef(showToast)
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  // ─── Load contacts — runs ONCE on mount ──────────────────────────────────
  // Empty []. No functions, no reactive values.
  // currentUser read via getState() — reads once at call-time without
  // subscribing React to auth changes (which would re-trigger this effect).
  useEffect(() => {
    let cancelled = false

    async function loadAllRelationships() {
      setLoading(true)
      try {
        const currentUser = useAuthStore.getState().user
        const data = await getContacts()

        if (!cancelled) {
          const accepted = data.filter((c: any) => c.status === 'accepted')
          const pendingIncoming = currentUser
            ? data
                .filter(
                  (c: any) =>
                    c.status === 'pending' &&
                    c.addressee_uid === currentUser.firebase_uid
                )
                .map((c: any) => ({
                  contact_id: c.contact_id,
                  from_user: c.other_user,
                }))
            : []

          setContacts(accepted)
          setIncomingRequests(pendingIncoming)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message)
          showToastRef.current('Failed to load contacts', 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAllRelationships()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Socket listener — retry until socket is ready ───────────────────────
  // Socket connects async. On first render it is almost always null.
  // Retry every 500ms until available, then attach once and stop.
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10

    function attachListener() {
      const socket = getSocket()

      if (!socket) {
        if (attempts < maxAttempts) {
          attempts++
          retryRef.current = setTimeout(attachListener, 500)
        }
        return
      }

      const handleIncomingRequest = (data: any) => {
        setIncomingRequests((prev) => {
          if (prev.some((r) => r.contact_id === data.contact_id)) return prev
          return [...prev, data]
        })
        showToastRef.current(
          `Contact request from ${data.from_user.display_name}`,
          'info'
        )
      }

      socket.on('user:contact_request', handleIncomingRequest)
      cleanupRef.current = () =>
        socket.off('user:contact_request', handleIncomingRequest)
    }

    attachListener()

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (cleanupRef.current) cleanupRef.current()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleBlock = async () => {
    try {
      await updateContact(blockModal.contactId, { status: 'blocked' })
      removeContact(blockModal.contactId)
      showToastRef.current(`${blockModal.name} blocked`, 'success')
    } catch {
      showToastRef.current('Failed to block contact', 'error')
    } finally {
      setBlockModal((prev) => ({ ...prev, isOpen: false }))
    }
  }

  const handleUnfriend = async () => {
    try {
      await deleteContact(unfriendModal.contactId)
      removeContact(unfriendModal.contactId)
      showToastRef.current(`${unfriendModal.name} removed from contacts`, 'success')
    } catch {
      showToastRef.current('Failed to remove contact', 'error')
    } finally {
      setUnfriendModal((prev) => ({ ...prev, isOpen: false }))
    }
  }

  const handleAddToFavourites = (contactId: string) => {
    const contact = contacts.find((c) => c.contact_id === contactId)
    showToastRef.current(
      `${contact?.other_user?.display_name || 'User'} added to favourites`,
      'success'
    )
  }

  const handleAcceptRequest = async (request: any) => {
    try {
      const updated = await updateContact(request.contact_id, { status: 'accepted' })
      addContact(updated)
      setIncomingRequests((prev) =>
        prev.filter((r) => r.contact_id !== request.contact_id)
      )
      showToastRef.current('Request accepted', 'success')
    } catch {
      showToastRef.current('Failed to accept request', 'error')
    }
  }

  const handleDeclineRequest = async (request: any) => {
    try {
      await deleteContact(request.contact_id)
      setIncomingRequests((prev) =>
        prev.filter((r) => r.contact_id !== request.contact_id)
      )
      showToastRef.current('Request declined', 'info')
    } catch {
      showToastRef.current('Failed to decline request', 'error')
    }
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const sortedContacts = [...contacts].sort((a, b) =>
    (a.other_user?.display_name ?? '').localeCompare(b.other_user?.display_name ?? '')
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  const content = (
    <div className="flex flex-col h-full bg-white relative min-h-0">

      {/* Header */}
      <div className={`
        flex items-center justify-between shrink-0
        ${isSidebarMode
          ? 'p-4 border-b border-slate-50 mt-2'
          : 'p-6 md:p-10 border-b border-slate-100'}
      `}>
        <div>
          <h1 className={`
            ${isSidebarMode ? 'text-lg' : 'text-3xl'}
            font-black text-slate-900 tracking-tight
          `}>
            Contacts
          </h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
            {contacts.length} Total
          </p>
        </div>

        <button
          onClick={() => setIsSearchOpen(true)}
          className={`
            flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white
            transition-all active:scale-95 shadow-lg shadow-blue-100
            ${isSidebarMode ? 'w-10 h-10 rounded-xl' : 'px-6 py-3 rounded-2xl font-black text-sm'}
          `}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M12 4v16m8-8H4" />
          </svg>
          {!isSidebarMode && (
            <span className="ml-2 hidden sm:inline">Add Contact</span>
          )}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

        {/* Incoming requests banner */}
        {incomingRequests.length > 0 && (
          <div className={`
            bg-blue-50/50 border-b border-blue-100 space-y-3
            animate-in fade-in duration-500
            ${isSidebarMode ? 'p-4' : 'px-6 md:px-10 py-6'}
          `}>
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">
              New Requests
            </h3>
            <div className={`grid gap-3 ${!isSidebarMode ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
              {incomingRequests.map((req) => (
                <div
                  key={req.contact_id}
                  className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-blue-100/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={req.from_user.avatar_url}
                      name={req.from_user.display_name}
                      size="sm"
                    />
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {req.from_user.display_name}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                      aria-label="Decline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      aria-label="Accept"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content: skeleton → contacts → empty state */}
        {loading ? (
          <div className="p-6 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-50 rounded-full w-1/3" />
                  <div className="h-2 bg-slate-50/50 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedContacts.length > 0 ? (
          <div className="divide-y divide-slate-50 px-2">
            {sortedContacts.map((contact) => (
              <ContactCard
                key={contact.contact_id}
                contact={contact}
                isSidebarMode={isSidebarMode}
                onClick={() => {
                  showToastRef.current('Messaging coming in Sprint 3', 'info')
                }}
                onBlock={(id) =>
                  setBlockModal({
                    isOpen: true,
                    contactId: id,
                    name: contact.other_user!.display_name,
                  })
                }
                onUnfriend={(id) =>
                  setUnfriendModal({
                    isOpen: true,
                    contactId: id,
                    name: contact.other_user!.display_name,
                  })
                }
                onAddToFavourites={(id) => handleAddToFavourites(id)}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-400">No contacts yet</p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="mt-4 text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
            >
              Add Someone
            </button>
          </div>
        )}
      </div>

      {/* Search modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Find People"
      >
        <ContactSearch showToast={showToast} />
      </Modal>

      {/* Block modal */}
      <Modal
        isOpen={blockModal.isOpen}
        onClose={() => setBlockModal((prev) => ({ ...prev, isOpen: false }))}
        title="Block User?"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setBlockModal((prev) => ({ ...prev, isOpen: false }))}
              className="flex-1 py-3 text-xs font-black text-slate-400 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleBlock}
              className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-100"
            >
              Block
            </button>
          </div>
        }
      >
        <p className="text-slate-500 text-sm font-medium">
          This will prevent further messages and requests.
        </p>
      </Modal>

      {/* Unfriend modal */}
      <Modal
        isOpen={unfriendModal.isOpen}
        onClose={() => setUnfriendModal((prev) => ({ ...prev, isOpen: false }))}
        title="Remove Contact?"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setUnfriendModal((prev) => ({ ...prev, isOpen: false }))}
              className="flex-1 py-3 text-xs font-black text-slate-400 uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleUnfriend}
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-100"
            >
              Remove
            </button>
          </div>
        }
      >
        <p className="text-slate-500 text-sm font-medium">
          This will remove them from your contacts list.
        </p>
      </Modal>

      {/* Single ToastContainer — owned exclusively by ContactList */}
      <ToastContainer />
    </div>
  )

  if (isSidebarMode) return content
  return <BaseLayout>{content}</BaseLayout>
}