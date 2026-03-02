import { create } from 'zustand'
import type { User } from 'firebase/auth'

interface AuthState {
  user: User | null
  loading: boolean
  idToken: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setIdToken: (token: string | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  idToken: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setIdToken: (token) => set({ idToken: token }),
  reset: () => set({ user: null, loading: false, idToken: null }),
}))
