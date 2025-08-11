import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Organization } from '@/types'

interface AuthState {
  user: User | null
  organization: Organization | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User) => void
  setOrganization: (organization: Organization) => void
  setToken: (token: string) => void
  login: (user: User, token: string, organization?: Organization) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user }),

      setOrganization: (organization) => set({ organization }),

      setToken: (token) => set({ token }),

      login: (user, token, organization) => set({
        user,
        token,
        organization: organization || get().organization,
        isAuthenticated: true,
        isLoading: false,
      }),

      logout: () => set({
        user: null,
        token: null,
        organization: null,
        isAuthenticated: false,
        isLoading: false,
      }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'candlefish-auth',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
