/**
 * ProtectedRoute — wraps all authenticated routes.
 *
 * useSocket() is called here (NOT in ChatLayout).
 * This component persists across all internal route changes, so the socket
 * is established once and never torn down during navigation.
 */
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/authStore'
import { useSocket } from '../hooks/useSocket'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  // Sole caller of useSocket — one connection for the entire session
  useSocket()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute