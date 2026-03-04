import { create } from 'zustand'
import type { Contact } from '../../types/contact'

interface OnlineStatus {
  [uid: string]: boolean
}

interface ContactsState {
  contacts: Contact[]
  onlineStatus: OnlineStatus
  loading: boolean
  error: string | null

  // Actions
  setContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (contactId: string, updates: Partial<Contact>) => void
  removeContact: (contactId: string) => void
  setUserOnline: (uid: string, isOnline: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Selectors (derived)
  getContactByUid: (uid: string) => Contact | undefined
  isUserOnline: (uid: string) => boolean
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  onlineStatus: {},
  loading: false,
  error: null,

  setContacts: (contacts) => set({ contacts }),
  addContact: (contact) => set((s) => ({ contacts: [...s.contacts, contact] })),
  updateContact: (contactId, updates) => set((s) => ({
    contacts: s.contacts.map((c) =>
      c.contact_id === contactId ? { ...c, ...updates } : c
    )
  })),
  removeContact: (contactId) => set((s) => ({
    contacts: s.contacts.filter((c) => c.contact_id !== contactId)
  })),
  setUserOnline: (uid, isOnline) => set((s) => ({
    onlineStatus: { ...s.onlineStatus, [uid]: isOnline }
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  getContactByUid: (uid) =>
    get().contacts.find((c) => c.other_user?.firebase_uid === uid),
  isUserOnline: (uid) => get().onlineStatus[uid] ?? false,
}))
