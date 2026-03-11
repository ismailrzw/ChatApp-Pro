import React, { useState, useRef, useEffect } from 'react'
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

const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick, onBlock, onUnfriend, onAddToFavourites }) => {
  const isOnline = useContactsStore((s) => s.isUserOnline(contact.other_user!.firebase_uid))
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])
  
  return (
    <div 
      onClick={() => onClick(contact.other_user!.firebase_uid)}
      className="flex items-center gap-5 p-5 md:p-6 hover:bg-slate-50/80 cursor-pointer transition-all rounded-[24px] group relative"
    >
      <div className="relative shrink-0">
        <Avatar 
          src={contact.other_user!.avatar_url} 
          name={contact.other_user!.display_name} 
          isOnline={isOnline}
          size="lg"
          className="shadow-sm group-hover:shadow-md transition-shadow ring-2 ring-transparent group-hover:ring-blue-100"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-black text-slate-900 truncate text-lg tracking-tight">
            {contact.other_user!.display_name}
          </h3>
          <span className={`text-[10px] font-black uppercase tracking-[0.15em] shrink-0 mt-1.5 ${isOnline ? 'text-emerald-500' : 'text-slate-300'}`}>
            {formatLastSeen(contact.other_user!.last_seen, isOnline)}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate mt-1 font-medium leading-relaxed">
          {contact.other_user!.status_message || 'Hey there! I am using ChatNow.'}
        </p>
      </div>
      
      <div className="relative shrink-0 ml-2" ref={menuRef}>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(!menuOpen)
          }}
          className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
          title="Options"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onAddToFavourites?.(contact.contact_id)
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Add to Favourites
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onUnfriend?.(contact.contact_id)
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                Unfriend
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onBlock?.(contact.contact_id)
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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

export default React.memo(ContactCard)
