import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../hooks/useAuth'
import { User, AuthTokens } from '../../types/api'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

// Test data
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockTokens: AuthTokens = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  expiresIn: 3600,
}

// Test wrapper
const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  afterAll(() => {
    mockConsoleError.mockRestore()
  })

  describe('Initial State', () => {
    it('initializes with default state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      // Initially loading should be true
      expect(result.current.loading).toBe(true)
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('throws error when used outside AuthProvider', () => {
      const { result } = renderHook(() => useAuth())
      expect(result.error).toEqual(Error('useAuth must be used within an AuthProvider'))
    })

    it('loads saved auth data from localStorage', async () => {
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokens).toEqual(mockTokens)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles corrupted localStorage data gracefully', async () => {
      localStorageMock.setItem('auth_tokens', 'invalid-json')
      localStorageMock.setItem('auth_user', 'invalid-json')

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(mockConsoleError).toHaveBeenCalled()
      expect(localStorageMock.getItem('auth_tokens')).toBeNull()
      expect(localStorageMock.getItem('auth_user')).toBeNull()
    })
  })

  describe('Login', () => {
    it('handles successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          tokens: mockTokens,
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokens).toEqual(mockTokens)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
        })
      ).rejects.toThrow('Login failed')

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('handles network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.login({
            email: 'test@example.com',
            password: 'password123',
          })
        })
      ).rejects.toThrow('Network error')
    })
  })

  describe('Register', () => {
    it('handles successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          tokens: mockTokens,
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.tokens).toEqual(mockTokens)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('handles registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.register({
            email: 'test@example.com',
            password: 'weak',
            firstName: 'John',
            lastName: 'Doe',
          })
        })
      ).rejects.toThrow('Registration failed')

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Logout', () => {
    it('clears user data and localStorage', async () => {
      // Set up authenticated state
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(localStorageMock.getItem('auth_tokens')).toBeNull()
      expect(localStorageMock.getItem('auth_user')).toBeNull()
    })
  })

  describe('Refresh Token', () => {
    it('handles successful token refresh', async () => {
      const newTokens = {
        ...mockTokens,
        accessToken: 'new-access-token',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tokens: newTokens }),
      })

      // Set up authenticated state
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.refreshToken()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: mockTokens.refreshToken }),
      })

      expect(result.current.tokens).toEqual(newTokens)
    })

    it('handles refresh token failure and logs out', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      // Set up authenticated state
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await expect(
        act(async () => {
          await result.current.refreshToken()
        })
      ).rejects.toThrow('Token refresh failed')

      // Should log out user after failed refresh
      expect(result.current.user).toBeNull()
      expect(result.current.tokens).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('throws error when no refresh token available', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.refreshToken()
        })
      ).rejects.toThrow('No refresh token available')
    })
  })

  describe('LocalStorage Persistence', () => {
    it('saves tokens to localStorage when tokens change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          tokens: mockTokens,
        }),
      })

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(localStorageMock.getItem('auth_tokens')).toBe(
        JSON.stringify(mockTokens)
      )
      expect(localStorageMock.getItem('auth_user')).toBe(
        JSON.stringify(mockUser)
      )
    })

    it('removes data from localStorage on logout', async () => {
      // Set up authenticated state
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      act(() => {
        result.current.logout()
      })

      expect(localStorageMock.getItem('auth_tokens')).toBeNull()
      expect(localStorageMock.getItem('auth_user')).toBeNull()
    })
  })

  describe('Authentication State', () => {
    it('isAuthenticated is true when both user and tokens exist', async () => {
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('isAuthenticated is false when user is null', async () => {
      localStorageMock.setItem('auth_tokens', JSON.stringify(mockTokens))
      // No user in localStorage

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })
    })

    it('isAuthenticated is false when tokens are null', async () => {
      localStorageMock.setItem('auth_user', JSON.stringify(mockUser))
      // No tokens in localStorage

      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false)
      })
    })
  })

  describe('Context Provider', () => {
    it('provides all expected values', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('tokens')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('register')
      expect(result.current).toHaveProperty('logout')
      expect(result.current).toHaveProperty('refreshToken')
      expect(result.current).toHaveProperty('isAuthenticated')

      expect(typeof result.current.login).toBe('function')
      expect(typeof result.current.register).toBe('function')
      expect(typeof result.current.logout).toBe('function')
      expect(typeof result.current.refreshToken).toBe('function')
    })
  })
})