'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  EyeIcon, 
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from './AuthProvider'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password')
      return
    }

    try {
      await login(email, password)
      onSuccess?.()
    } catch (err) {
      setError('Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400">
            Sign in to your Operational Maturity Dashboard
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-white font-medium text-sm mb-2">Demo Credentials</h4>
            <p className="text-gray-400 text-xs mb-2">
              Use any email and password to access the demo:
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-gray-300">demo@example.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Password:</span>
                <span className="text-gray-300">demo123</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-3 text-xs"
              onClick={() => {
                setEmail('demo@example.com')
                setPassword('demo123')
              }}
            >
              Use Demo Credentials
            </Button>
          </div>

          {/* Additional Links */}
          <div className="mt-6 text-center space-y-2">
            <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              Forgot password?
            </button>
            <div className="text-gray-500 text-sm">
              Need access? Contact your administrator
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-xs">
            Powered by Candlefish Operational Maturity Platform
          </p>
        </div>
      </motion.div>
    </div>
  )
}