import { useEffect } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuthStore } from '../../features/auth/authStore'
import { postVerifyToken } from '../api/authApi'

export function useAuth() {
  const { user, loading, idToken, setUser, setLoading, setIdToken, reset } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken()
          setIdToken(token)
          // Initially set firebase user to avoid UI flash
          // setUser(firebaseUser) 
          
          // Call backend to upsert profile and get full UserProfile
          const userProfile = await postVerifyToken(token)
          setUser(userProfile)
        } catch (error) {
          console.error('Error during auth state change:', error)
          // Fallback to firebase user if backend fails? 
          // For now, let's stick to happy path or keep it null/error
        }
      } else {
        reset()
      }
      setLoading(false)
    })
    return unsubscribe // cleanup on unmount
  }, [setUser, setLoading, setIdToken, reset])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      reset()
    } catch (error) {
      console.error('Error during sign out:', error)
    }
  }

  return { user, loading, idToken, signOut, isAuthenticated: !!user }
}
