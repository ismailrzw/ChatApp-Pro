// frontend/src/shared/components/AuthProvider.tsx
import React from 'react'
import { useAuth } from '../hooks/useAuth'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider — a global wrapper that initialises the authentication state.
 *
 * It calls the useAuth() hook which contains the onAuthStateChanged listener.
 * Without this (or a similar global call), the authentication state will
 * never transition from loading: true, causing ProtectedRoute to block
 * the UI indefinitely.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // This call initializes the onAuthStateChanged listener in useAuth.ts
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return <>{children}</>
}
