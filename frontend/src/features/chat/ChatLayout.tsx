import React from 'react'
import { Link } from 'react-router-dom'
import BaseLayout from '../../shared/components/BaseLayout'

interface ChatLayoutProps {
  children?: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const sidebarContent = (
    <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
      {/* Chat Area Search & List Placeholder */}
      <div className="px-4 mt-6 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all outline-none"
          />
          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 mt-4 space-y-1 custom-scrollbar">
        <div className="p-10 text-center animate-in fade-in duration-500 mt-10">
          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-400">No active chats</p>
          <p className="text-xs text-slate-400/70 mt-1.5 leading-relaxed">Start a conversation from your contacts list.</p>
          <Link 
            to="/contacts"
            className="mt-6 inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Find Contacts
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <BaseLayout sidebarContent={sidebarContent}>
      {children}
    </BaseLayout>
  )
}
