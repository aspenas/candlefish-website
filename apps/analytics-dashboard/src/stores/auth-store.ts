import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, Organization } from '../types/graphql'
import { getAuthToken, setAuthToken, removeAuthToken, clearApolloCache } from '../lib/apollo-client'

export interface AuthState {
  // State
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User) => void
  setOrganization: (organization: Organization) => void
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Computed
  hasPermission: (permission: string) => boolean
  isOrgAdmin: () => boolean
  isOrgOwner: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          error: null,
        })
      },

      setOrganization: (organization: Organization) => {
        set({ organization })
      },

      login: (token: string, user: User) => {
        setAuthToken(token)
        set({
          user,
          isAuthenticated: true,
          error: null,
          isLoading: false,
        })
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          // Clear Apollo cache and token
          await clearApolloCache()

          // Reset auth state
          set({
            user: null,
            organization: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          console.error('Logout error:', error)
          set({
            isLoading: false,
            error: 'Failed to logout properly',
          })
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      clearError: () => {
        set({ error: null })
      },

      // Computed values
      hasPermission: (permission: string): boolean => {
        const { user } = get()
        if (!user) return false

        // Super admin has all permissions
        if (user.role === 'SUPER_ADMIN') return true

        // Check organization membership permissions
        const orgMembership = user.organizations?.find(
          (membership) => membership.organization.id === get().organization?.id
        )

        return orgMembership?.permissions?.some(
          (perm) => perm.name === permission || perm.action === permission
        ) ?? false
      },

      isOrgAdmin: (): boolean => {
        const { user, organization } = get()
        if (!user || !organization) return false

        // Super admin is always org admin
        if (user.role === 'SUPER_ADMIN') return true

        // Check organization role
        const orgMembership = user.organizations?.find(
          (membership) => membership.organization.id === organization.id
        )

        return orgMembership?.role === 'ADMIN' || orgMembership?.role === 'OWNER'
      },

      isOrgOwner: (): boolean => {
        const { user, organization } = get()
        if (!user || !organization) return false

        // Super admin is considered org owner
        if (user.role === 'SUPER_ADMIN') return true

        // Check organization role
        const orgMembership = user.organizations?.find(
          (membership) => membership.organization.id === organization.id
        )

        return orgMembership?.role === 'OWNER'
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Check if token still exists after rehydration
        if (state?.isAuthenticated && !getAuthToken()) {
          // Token was removed externally, clear auth state
          state.user = null
          state.organization = null
          state.isAuthenticated = false
        }
      },
    }
  )
)
