'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string
  franchiseTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM'
  role: 'OPERATOR' | 'ADMIN' | 'CLIENT'
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('auth-token')
    if (token) {
      // In a real implementation, verify token with server
      // For demo purposes, we'll simulate a logged-in user
      setUser({
        id: 'demo-operator-1',
        email: 'operator@candlefish.ai',
        name: 'Demo Operator',
        franchiseTier: 'PROFESSIONAL',
        role: 'OPERATOR',
        permissions: ['read:assessments', 'write:assessments', 'read:clients', 'write:clients']
      })
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Demo user - in real implementation, this would come from API
      const demoUser: User = {
        id: 'demo-operator-1',
        email,
        name: 'Demo Operator',
        franchiseTier: 'PROFESSIONAL',
        role: 'OPERATOR',
        permissions: ['read:assessments', 'write:assessments', 'read:clients', 'write:clients']
      }

      const mockToken = 'demo-jwt-token'
      localStorage.setItem('auth-token', mockToken)
      setUser(demoUser)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider 
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}