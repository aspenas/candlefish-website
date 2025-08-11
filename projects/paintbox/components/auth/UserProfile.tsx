'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface UserProfileProps {
  variant?: 'minimal' | 'full'
  className?: string
}

export function UserProfile({ variant = 'full', className = '' }: UserProfileProps) {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Loading state
  if (status === 'loading') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        {variant === 'full' && (
          <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
        )}
      </div>
    )
  }

  // Not authenticated
  if (status === 'unauthenticated') {
    return (
      <Link
        href="/login"
        className={`
          flex items-center gap-2 px-4 py-2
          bg-white border border-gray-200 rounded-lg
          text-gray-700 font-medium text-sm
          hover:border-gray-300 hover:shadow-sm
          transition-all duration-200
          ${className}
        `}
      >
        <User className="w-4 h-4" />
        Sign In
      </Link>
    )
  }

  // Authenticated user
  const user = session?.user
  if (!user) return null

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserRole = (email?: string | null) => {
    if (!email) return 'User'
    if (email.includes('@kindhomepaint.com') || email.includes('@candlefish.ai')) {
      return 'Admin'
    }
    return 'User'
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-3 p-2 rounded-lg
          hover:bg-gray-50 transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-500/20
        "
        aria-label="User menu"
      >
        {/* User Avatar */}
        <div className="relative">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || 'User avatar'}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="
              w-8 h-8 rounded-full
              bg-gradient-to-br from-purple-500 to-pink-500
              flex items-center justify-center
              text-white text-sm font-medium
            ">
              {getUserInitials(user.name)}
            </div>
          )}

          {/* Online indicator */}
          <div className="
            absolute -bottom-0.5 -right-0.5
            w-3 h-3 bg-green-500
            rounded-full border-2 border-white
          " />
        </div>

        {/* User Info (full variant only) */}
        {variant === 'full' && (
          <div className="flex items-center gap-2">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {getUserRole(user.email)}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="
          absolute right-0 top-full mt-2 w-64
          bg-white rounded-xl shadow-lg border border-gray-200
          py-2 z-50
          animate-in slide-in-from-top-5 duration-200
        ">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-600">Online</span>
              </div>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-600">{getUserRole(user.email)}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Admin Panel (for admin users) */}
            {getUserRole(user.email) === 'Admin' && (
              <Link
                href="/admin"
                className="
                  flex items-center gap-3 px-4 py-2 text-sm
                  text-gray-700 hover:bg-gray-50
                  transition-colors duration-150
                "
                onClick={() => setIsOpen(false)}
              >
                <Shield className="w-4 h-4 text-purple-600" />
                Admin Panel
              </Link>
            )}

            {/* Settings */}
            <button
              className="
                w-full flex items-center gap-3 px-4 py-2 text-sm
                text-gray-700 hover:bg-gray-50
                transition-colors duration-150
                text-left
              "
              onClick={() => {
                setIsOpen(false)
                // TODO: Open settings modal
              }}
            >
              <Settings className="w-4 h-4 text-gray-500" />
              Settings & Preferences
            </button>

            {/* Divider */}
            <div className="h-px bg-gray-100 my-2" />

            {/* Sign Out */}
            <button
              onClick={() => {
                setIsOpen(false)
                handleSignOut()
              }}
              className="
                w-full flex items-center gap-3 px-4 py-2 text-sm
                text-red-600 hover:bg-red-50
                transition-colors duration-150
                text-left
              "
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Version Footer */}
          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Paintbox v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
