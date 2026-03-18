import { create } from 'zustand'
import type { UserProfile } from '../../types/user'

interface AuthState {
  user: UserProfile | null
  idToken: string | null
  loading: boolean

  setUser: (user: UserProfile | null) => void
  setIdToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  idToken: null,
  loading: true,

  setUser: (user) => set({ user }),
  setIdToken: (idToken) => set({ idToken }),
  setLoading: (loading) => set({ loading }),

  // reset() MUST set loading: false — never true.
  // If this sets loading: true, the app spins forever when logged out.
  reset: () => set({ user: null, idToken: null, loading: false }),
}))