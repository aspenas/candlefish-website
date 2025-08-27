'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { CreateClientInput } from '@/lib/graphql/types'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateClientInput) => Promise<void>
  operatorId: string
  isLoading: boolean
}

const INDUSTRIES = [
  'MANUFACTURING',
  'HEALTHCARE', 
  'RETAIL',
  'TECHNOLOGY',
  'CONSTRUCTION',
  'AUTOMOTIVE',
  'ENERGY',
  'AGRICULTURE',
  'LOGISTICS',
  'HOSPITALITY',
  'EDUCATION',
  'GOVERNMENT',
  'CONSULTING',
  'OTHER'
]

export function CreateClientModal({
  isOpen,
  onClose,
  onSubmit,
  operatorId,
  isLoading
}: CreateClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    industry: 'TECHNOLOGY',
    email: '',
    phone: '',
    address: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim()) {
      return
    }

    const input: CreateClientInput = {
      operatorId,
      name: formData.name.trim(),
      industry: formData.industry as any,
      contactInfo: {
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined
      }
    }

    try {
      await onSubmit(input)
      setFormData({
        name: '',
        industry: 'TECHNOLOGY',
        email: '',
        phone: '',
        address: ''
      })
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Add New Client
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="p-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Company Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    industry: e.target.value
                  }))}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>
                      {industry.replace('_', ' ').toLowerCase()
                        .replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  placeholder="contact@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Address
                </label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: e.target.value
                  }))}
                  placeholder="Enter business address"
                  rows={2}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !formData.name.trim() || !formData.email.trim()}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Client'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}