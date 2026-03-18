import { useState, useEffect, useCallback, useRef } from 'react'
import { searchUsers } from '../../shared/api/usersApi'
import { sendContactRequest } from '../../shared/api/contactsApi'
import type { UserSearchResult } from '../../types/user'
import Avatar from '../../shared/components/Avatar'
import { useContactsStore } from './contactsStore'

/**
 * ContactSearch
 * - Debounced user search (300ms)
 * - Per-result Add button state machine
 * - No internal ToastContainer — parent ContactList owns the single renderer
 * - showToast accepted as prop to avoid unstable hook reference in deps
 */

interface ContactSearchProps {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

export default function ContactSearch({ showToast }: ContactSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [requesting, setRequesting] = useState<Record<string, boolean>>({})
  const [requested, setRequested] = useState<Record<string, boolean>>({})

  // Stable ref so handleSearch never needs showToast in its dep array
  const showToastRef = useRef(showToast)
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  const contacts = useContactsStore((state) => state.contacts)

  // handleSearch is stable — empty dep array.
  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await searchUsers(q)
      setResults(data)
    } catch {
      showToastRef.current('Search failed', 'error')
    } finally {
      setLoading(false)
    }
  }, []) // intentionally empty — showToast accessed via ref

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, handleSearch]) // handleSearch is stable, query is a primitive — safe

  const handleAddContact = async (uid: string) => {
    setRequesting((prev) => ({ ...prev, [uid]: true }))
    try {
      await sendContactRequest({ addressee_uid: uid })
      setRequested((prev) => ({ ...prev, [uid]: true }))
      showToastRef.current('Contact request sent', 'success')
    } catch (err: any) {
      if (err.response?.status === 409) {
        setRequested((prev) => ({ ...prev, [uid]: true }))
        showToastRef.current('Already connected or pending', 'info')
      } else {
        showToastRef.current(
          err.response?.data?.error || 'Failed to send request',
          'error'
        )
      }
    } finally {
      setRequesting((prev) => ({ ...prev, [uid]: false }))
    }
  }

  const getButtonState = (uid: string) => {
    const contact = contacts.find((c) => c.other_user?.firebase_uid === uid)
    if (contact) {
      if (contact.status === 'accepted')
        return {
          label: 'Connected',
          disabled: true,
          style:
            'bg-slate-100 text-slate-500 cursor-default border border-slate-200',
        }
      if (contact.status === 'pending')
        return {
          label: 'Pending',
          disabled: true,
          style:
            'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100',
        }
      if (contact.status === 'blocked')
        return {
          label: 'Blocked',
          disabled: true,
          style:
            'bg-rose-50 text-rose-500 cursor-default border border-rose-100',
        }
    }
    if (requested[uid])
      return {
        label: 'Pending ✓',
        disabled: true,
        style:
          'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100',
      }

    return {
      label: 'Connect',
      disabled: false,
      style:
        'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-100',
    }
  }

  return (
    <div className="space-y-8 py-2 px-1">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="block w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar min-h-[100px]">
        {results.length > 0 ? (
          results.map((user) => {
            const btnState = getButtonState(user.firebase_uid)
            return (
              <div
                key={user.firebase_uid}
                className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name}
                    size="md"
                    className="ring-2 ring-transparent group-hover:ring-white transition-all"
                  />
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 truncate text-sm">
                      {user.display_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate font-bold uppercase tracking-wider">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleAddContact(user.firebase_uid)}
                  disabled={requesting[user.firebase_uid] || btnState.disabled}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${btnState.style}`}
                >
                  {requesting[user.firebase_uid] ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    btnState.label
                  )}
                </button>
              </div>
            )
          })
        ) : query.length >= 2 && !loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.172 9.172a4 4 0 0112.728 0M5.636 5.636a9 9 0 0114.142 0M12 14a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
            </div>
            <p className="text-slate-400 font-bold text-sm italic">
              No users found for "{query}"
            </p>
          </div>
        ) : query.length > 0 && query.length < 2 ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
              Type 2+ characters
            </p>
          </div>
        ) : !loading ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] italic">
              Ready to search
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}