import { useEffect } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuthStore } from '../../features/auth/authStore'
import { postVerifyToken } from '../api/authApi'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const idToken = useAuthStore((s) => s.idToken)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken()
          useAuthStore.getState().setIdToken(token)
          const userProfile = await postVerifyToken(token)
          useAuthStore.getState().setUser(userProfile)
        } else {
          // Not logged in — clear state
          useAuthStore.getState().setUser(null)
          useAuthStore.getState().setIdToken(null)
        }
      } catch (err) {
        console.error('[useAuth] Error:', err)
        useAuthStore.getState().setUser(null)
        useAuthStore.getState().setIdToken(null)
      } finally {
        // Runs unconditionally — loading will always resolve
        useAuthStore.getState().setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (err) {
      console.error('[useAuth] Sign out error:', err)
    } finally {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().setIdToken(null)
      useAuthStore.getState().setLoading(false)
    }
  }

  return { user, loading, idToken, signOut, isAuthenticated: !!user }
}