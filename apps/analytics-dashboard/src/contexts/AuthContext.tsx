import React, { createContext, useContext, useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useAuthStore } from '../stores/auth-store'
import { useUIStore } from '../stores/ui-store'
import { getAuthToken } from '../lib/apollo-client'
import { User } from '../types/graphql'

// GraphQL queries and mutations (these would be defined in separate files)
const ME_QUERY = `
  query Me {
    me {
      id
      email
      firstName
      lastName
      avatar
      role
      status
      preferences {
        theme
        language
        timezone
        dateFormat
        currency
        dashboardLayout
        emailNotifications
        pushNotifications
      }
      organizations {
        id
        role
        permissions {
          id
          name
          resource
          action
        }
        organization {
          id
          name
          slug
          logo
          status
          settings {
            timezone
            currency
            language
          }
        }
      }
      createdAt
      updatedAt
      lastLoginAt
    }
  }
`

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        avatar
        role
        status
        organizations {
          id
          role
          permissions {
            id
            name
            resource
            action
          }
          organization {
            id
            name
            slug
            logo
            status
          }
        }
      }
    }
  }
`

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        status
        organizations {
          id
          role
          organization {
            id
            name
            slug
          }
        }
      }
    }
  }
`

const FORGOT_PASSWORD_MUTATION = `
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      success
      message
    }
  }
`

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`

interface AuthContextType {
  // Auth actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string, organizationName?: string) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>

  // Auth state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Organization methods
  switchOrganization: (organizationId: string) => void
  hasPermission: (permission: string) => boolean
  isOrgAdmin: () => boolean
  isOrgOwner: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authStore = useAuthStore()
  const { addToast } = useUIStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // Query current user if token exists
  const { data, loading, error } = useQuery(ME_QUERY, {
    skip: !getAuthToken() || authStore.isAuthenticated,
    onCompleted: (data) => {
      if (data?.me) {
        authStore.setUser(data.me)
        // Set current organization to the first one if available
        if (data.me.organizations?.length > 0 && !authStore.organization) {
          authStore.setOrganization(data.me.organizations[0].organization)
        }
      }
      setIsInitialized(true)
    },
    onError: (error) => {
      console.error('Failed to fetch current user:', error)
      authStore.logout()
      setIsInitialized(true)
    },
  })

  // Mutations
  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION)
  const [registerMutation, { loading: registerLoading }] = useMutation(REGISTER_MUTATION)
  const [forgotPasswordMutation, { loading: forgotPasswordLoading }] = useMutation(FORGOT_PASSWORD_MUTATION)
  const [resetPasswordMutation, { loading: resetPasswordLoading }] = useMutation(RESET_PASSWORD_MUTATION)

  // Initialize authentication state
  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setIsInitialized(true)
    }
  }, [])

  // Auth actions
  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      authStore.setLoading(true)
      authStore.clearError()

      const { data } = await loginMutation({
        variables: {
          input: {
            email,
            password,
            rememberMe,
          },
        },
      })

      if (data?.login?.token && data?.login?.user) {
        authStore.login(data.login.token, data.login.user)

        // Set current organization
        if (data.login.user.organizations?.length > 0) {
          authStore.setOrganization(data.login.user.organizations[0].organization)
        }

        addToast({
          type: 'success',
          title: 'Welcome back!',
          description: `Logged in as ${data.login.user.firstName} ${data.login.user.lastName}`,
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed'
      authStore.setError(errorMessage)

      addToast({
        type: 'error',
        title: 'Login Failed',
        description: errorMessage,
      })

      throw error
    } finally {
      authStore.setLoading(false)
    }
  }

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName?: string
  ) => {
    try {
      authStore.setLoading(true)
      authStore.clearError()

      const { data } = await registerMutation({
        variables: {
          input: {
            email,
            password,
            firstName,
            lastName,
            organizationName,
          },
        },
      })

      if (data?.register?.token && data?.register?.user) {
        authStore.login(data.register.token, data.register.user)

        // Set current organization
        if (data.register.user.organizations?.length > 0) {
          authStore.setOrganization(data.register.user.organizations[0].organization)
        }

        addToast({
          type: 'success',
          title: 'Account Created!',
          description: `Welcome to Analytics Dashboard, ${firstName}!`,
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed'
      authStore.setError(errorMessage)

      addToast({
        type: 'error',
        title: 'Registration Failed',
        description: errorMessage,
      })

      throw error
    } finally {
      authStore.setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authStore.logout()

      addToast({
        type: 'info',
        title: 'Logged Out',
        description: 'You have been logged out successfully',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      authStore.setLoading(true)
      authStore.clearError()

      const { data } = await forgotPasswordMutation({
        variables: {
          input: { email },
        },
      })

      if (data?.forgotPassword?.success) {
        addToast({
          type: 'success',
          title: 'Reset Link Sent',
          description: 'Check your email for password reset instructions',
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset link'
      authStore.setError(errorMessage)

      addToast({
        type: 'error',
        title: 'Reset Failed',
        description: errorMessage,
      })

      throw error
    } finally {
      authStore.setLoading(false)
    }
  }

  const resetPassword = async (token: string, password: string) => {
    try {
      authStore.setLoading(true)
      authStore.clearError()

      const { data } = await resetPasswordMutation({
        variables: {
          input: { token, password },
        },
      })

      if (data?.resetPassword?.token && data?.resetPassword?.user) {
        authStore.login(data.resetPassword.token, data.resetPassword.user)

        addToast({
          type: 'success',
          title: 'Password Reset',
          description: 'Your password has been updated successfully',
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset failed'
      authStore.setError(errorMessage)

      addToast({
        type: 'error',
        title: 'Reset Failed',
        description: errorMessage,
      })

      throw error
    } finally {
      authStore.setLoading(false)
    }
  }

  const switchOrganization = (organizationId: string) => {
    const user = authStore.user
    if (!user) return

    const orgMembership = user.organizations.find(
      (membership) => membership.organization.id === organizationId
    )

    if (orgMembership) {
      authStore.setOrganization(orgMembership.organization)

      addToast({
        type: 'info',
        title: 'Organization Switched',
        description: `Switched to ${orgMembership.organization.name}`,
      })
    }
  }

  // Show loading spinner during initialization
  if (!isInitialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  const contextValue: AuthContextType = {
    // Actions
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    switchOrganization,

    // State
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading || loginLoading || registerLoading || forgotPasswordLoading || resetPasswordLoading,
    error: authStore.error,

    // Computed values
    hasPermission: authStore.hasPermission,
    isOrgAdmin: authStore.isOrgAdmin,
    isOrgOwner: authStore.isOrgOwner,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
