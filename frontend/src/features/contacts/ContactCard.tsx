import { useState, useRef, useEffect, memo } from 'react'
import type { Contact } from '../../types/contact'
import Avatar from '../../shared/components/Avatar'
import { formatLastSeen } from '../../shared/utils/formatDate'
import { useContactsStore } from './contactsStore'

interface ContactCardProps {
  contact: Contact
  onClick: (uid: string) => void
  onBlock?: (contactId: string) => void
  onUnfriend?: (contactId: string) => void
  onAddToFavourites?: (contactId: string) => void
}

const ContactCard = ({
  contact,
  onClick,
  onBlock,
  onUnfriend,
  onAddToFavourites,
}: ContactCardProps) => {
  const isOnline = useContactsStore((s) =>
    s.isUserOnline(contact.other_user!.firebase_uid)
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const lastSeenStr = formatLastSeen(
    contact.other_user!.last_seen ?? null,
    isOnline
  )

  return (
    <div
      onClick={() => onClick(contact.other_user!.firebase_uid)}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 cursor-pointer transition-all group relative"
    >
      {/* Avatar with online ring */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={contact.other_user!.avatar_url}
          name={contact.other_user!.display_name}
          isOnline={isOnline}
          size="lg"
          className="shadow-sm"
        />
        {/* Online pulse for active users */}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}
        {!isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-300 border-2 border-white rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-black text-slate-900 text-[15px] tracking-tight truncate">
            {contact.other_user!.display_name}
          </h3>
          {isOnline && (
            <span className="flex-shrink-0 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
              Online
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-medium truncate">
          {contact.other_user!.status_message || lastSeenStr}
        </p>
      </div>

      {/* Menu */}
      <div className="relative flex-shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(!menuOpen)
          }}
          className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          title="Options"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
            <div className="py-1.5">
              <button
                onClick={() => { setMenuOpen(false); onAddToFavourites?.(contact.contact_id) }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Add to Favourites
              </button>
              <button
                onClick={() => { setMenuOpen(false); onUnfriend?.(contact.contact_id) }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                Unfriend
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onBlock?.(contact.contact_id) }}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Block
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ContactCard)