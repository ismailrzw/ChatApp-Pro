import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import ChatLayout from './features/chat/ChatLayout'
import ProfileSettings from './features/profile/ProfileSettings'
import ContactList from './features/contacts/ContactList'
import { ProtectedRoute } from './shared/components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        } />
        
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute>
            <ChatLayout>
              {/* Sprint 3: MessageThread goes here */}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                  Messaging Thread Component (Coming in Sprint 3)
                </p>
              </div>
            </ChatLayout>
          </ProtectedRoute>
        } />

        <Route path="/contacts" element={
          <ProtectedRoute>
            {/* ContactList now handles its own BaseLayout or Sidebar mode */}
            <ContactList />
          </ProtectedRoute>
        } />

        <Route path="/settings/profile" element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
