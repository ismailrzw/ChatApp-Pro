import React from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../shared/hooks/useAuth'
import { useSocket } from '../../shared/hooks/useSocket'
import Avatar from '../../shared/components/Avatar'
import ContactList from '../contacts/ContactList' // We will refactor this to be a "List Only" component

interface ChatLayoutProps {
  children?: React.ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  useSocket()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || 'User'
  
  const isContactsPath = location.pathname === '/contacts'
  const isChatsPath = location.pathname.startsWith('/chat')
  const isSettingsPath = location.pathname.includes('settings')

  // Mobile visibility logic
  // On mobile, if we have children (like Settings or a Message Thread), we hide the sidebar
  const showSidebarOnMobile = !children

  const navItems = [
    { 
      name: 'Chats', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ), 
      path: '/chat' 
    },
    { 
      name: 'Contacts', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ), 
      path: '/contacts' 
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`
        ${showSidebarOnMobile ? 'flex' : 'hidden'} 
        md:flex w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex-col shadow-sm z-20 transition-all duration-300 shrink-0
      `}>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">ChatNow</h1>
          </div>
          <Link to="/settings/profile" className={`p-2.5 rounded-xl transition-all ${isSettingsPath ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>

        {/* Dynamic Sidebar Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {isContactsPath ? (
            <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-left-4 duration-300">
              <ContactList isSidebarMode={true} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
              {/* User Card */}
              <div className="p-4 mx-4 mt-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 shrink-0">
                <Avatar src={user?.photoURL} name={userName} isOnline={true} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Now</p>
                </div>
              </div>

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
          )}
        </div>

        {/* Footer Navigation */}
        <nav className="p-4 border-t border-slate-100 bg-slate-50/30 flex gap-2 shrink-0">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all
                  ${isActive 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all"
            title="Sign Out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`
        ${children ? 'flex' : 'hidden md:flex'} 
        flex-1 bg-white md:bg-slate-50 relative overflow-hidden flex-col
      `}>
        {/* Mobile Header for Main View */}
        {children && (
          <div className="md:hidden h-16 flex items-center gap-4 px-4 border-b border-slate-100 shrink-0 bg-white">
            <button 
              onClick={() => navigate(isSettingsPath ? '/chat' : -1)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {isSettingsPath ? 'Settings' : 'Conversation'}
            </h2>
          </div>
        )}

        <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
          {children ? (
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300">
              {children}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl shadow-blue-200/50 flex items-center justify-center text-blue-600 mx-auto mb-10 border border-blue-50 relative group">
                <div className="absolute inset-0 bg-blue-600 rounded-[40px] opacity-0 group-hover:opacity-5 transition-opacity duration-500 scale-110"></div>
                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Start a conversation</h2>
              <p className="text-slate-500 max-w-sm leading-relaxed font-medium text-lg">
                Connect with your contacts to begin chatting instantly.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
