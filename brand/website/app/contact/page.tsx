'use client'

import React, { useState } from 'react'
import { EnvelopeIcon, PhoneIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    type: 'consultation',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsSuccess(true)
        setFormData({
          name: '',
          email: '',
          company: '',
          type: 'consultation',
          message: ''
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-[#1B263B]/50 border border-[#3FD3C6] rounded-lg p-12 text-center">
            <CheckCircleIcon className="h-16 w-16 text-[#3FD3C6] mx-auto mb-4" />
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-4">
              Message Received
            </h2>
            <p className="text-[#E0E1DD] mb-8">
              Thank you for reaching out. We'll review your inquiry and respond within 24 hours.
            </p>
            <button
              onClick={() => setIsSuccess(false)}
              className="px-8 py-3 bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6] transition-colors"
            >
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-[#F8F8F2] mb-4">
            Start the Conversation
          </h1>
          <p className="text-xl text-[#E0E1DD] max-w-3xl mx-auto">
            Whether you're ready to transform your operations or just exploring possibilities,
            we're here to help chart your path.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-8">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[#E0E1DD] mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded focus:border-[#3FD3C6] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[#E0E1DD] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded focus:border-[#3FD3C6] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-[#E0E1DD] mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded focus:border-[#3FD3C6] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[#E0E1DD] mb-2">
                    Inquiry Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded focus:border-[#3FD3C6] focus:outline-none transition-colors"
                  >
                    <option value="consultation">Request Consultation</option>
                    <option value="demo">Schedule Demo</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="general">General Question</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[#E0E1DD] mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-[#0D1B2A] border border-[#415A77]/30 text-[#F8F8F2] rounded focus:border-[#3FD3C6] focus:outline-none transition-colors resize-none"
                  placeholder="Tell us about your operational challenges..."
                />
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-3 bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Email */}
            <div className="bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <EnvelopeIcon className="h-6 w-6 text-[#3FD3C6] mr-3" />
                <h3 className="text-lg font-light text-[#F8F8F2]">Email</h3>
              </div>
              <p className="text-[#E0E1DD]">hello@candlefish.ai</p>
              <p className="text-[#415A77] text-sm mt-2">
                Response within 24 hours
              </p>
            </div>

            {/* Response Time */}
            <div className="bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-6">
              <h3 className="text-lg font-light text-[#F8F8F2] mb-3">
                Typical Response Times
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#415A77]">Consultation Requests</span>
                  <span className="text-[#E0E1DD]">24 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#415A77]">Demo Scheduling</span>
                  <span className="text-[#E0E1DD]">48 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#415A77]">Technical Support</span>
                  <span className="text-[#E0E1DD]">4 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#415A77]">General Inquiries</span>
                  <span className="text-[#E0E1DD]">2-3 days</span>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-6">
              <h3 className="text-lg font-light text-[#F8F8F2] mb-3">
                Current Availability
              </h3>
              <p className="text-[#E0E1DD] mb-3">
                We're currently at capacity but accepting inquiries for Q1 2026.
              </p>
              <div className="space-y-2">
                <div className="flex items-center text-[#E0E1DD]">
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full mr-2" />
                  Queue position: 8-10
                </div>
                <div className="flex items-center text-[#E0E1DD]">
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full mr-2" />
                  Next opening: December 2025
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
