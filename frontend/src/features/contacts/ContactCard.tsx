import React from 'react'
import type { Contact } from '../../types/contact'
import Avatar from '../../shared/components/Avatar'
import { formatLastSeen } from '../../shared/utils/formatDate'
import { useContactsStore } from './contactsStore'

interface ContactCardProps {
  contact: Contact
  onClick: (uid: string) => void
  onBlock?: (contactId: string) => void
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick, onBlock }) => {
  const isOnline = useContactsStore((s) => s.isUserOnline(contact.other_user!.firebase_uid))
  
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
      
      {onBlock && (
        <div className="shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onBlock(contact.contact_id)
            }}
            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
            title="Block User"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default React.memo(ContactCard)
