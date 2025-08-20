'use client'

import React, { useState } from 'react'
import type { Metadata } from 'next'

const currentQueueLength = 47
const maxQueueCapacity = 50
const nextConsiderationDate = 'December 2025'
const expectedConsiderationDate = 'January-February 2026'

export default function ConsiderationRequest() {
  const [stage, setStage] = useState<'initial' | 'assessment' | 'submitted'>('initial')
  const [position, setPosition] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    yearsInOperation: '',
    operationalChallenge: '',
    manualHours: '',
    investmentRange: '',
    name: '',
    role: '',
    email: '',
    company: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would submit to a real queue system
    setPosition(currentQueueLength + 1)
    setStage('submitted')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <main className="min-h-screen bg-[#0D1B2A] pt-24">
      <section className="max-w-3xl mx-auto px-6 pb-32">
        {stage === 'initial' && (
          <>
            <header className="mb-16">
              <h1 className="text-5xl font-light text-[#F8F8F2] mb-6">
                Request Consideration
              </h1>
              <p className="text-xl text-[#415A77] leading-relaxed font-light">
                We accept three collaborations per quarter. Current queue 
                position: {currentQueueLength + 1} of {maxQueueCapacity}.
              </p>
              <p className="text-[#415A77] mt-4 font-light">
                Next consideration window: {nextConsiderationDate}
              </p>
            </header>
            
            <form className="space-y-12" onSubmit={handleSubmit}>
              {/* Company Context */}
              <fieldset>
                <legend className="text-[#3FD3C6] uppercase tracking-wider text-sm mb-6">
                  Operational Context
                </legend>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[#E0E1DD] mb-2 font-light">
                      Years in Operation
                    </label>
                    <input 
                      type="number" 
                      name="yearsInOperation"
                      value={formData.yearsInOperation}
                      onChange={handleChange}
                      min="1"
                      className="w-full bg-[#1B263B] border border-[#415A77] px-4 py-3 
                               text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                               font-light"
                      required
                    />
                    <p className="text-xs text-[#415A77] mt-2 font-light">
                      We work with established operations, typically 5+ years
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-[#E0E1DD] mb-2 font-light">
                      Primary Operational Challenge
                    </label>
                    <textarea 
                      name="operationalChallenge"
                      value={formData.operationalChallenge}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-[#1B263B] border border-[#415A77] px-4 py-3 
                               text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                               font-light"
                      placeholder="Describe the inefficiency that keeps you awake"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[#E0E1DD] mb-2 font-light">
                      Current Manual Hours per Week
                    </label>
                    <input 
                      type="number"
                      name="manualHours"
                      value={formData.manualHours}
                      onChange={handleChange}
                      min="10"
                      className="w-full bg-[#1B263B] border border-[#415A77] px-4 py-3 
                               text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                               font-light"
                      required
                    />
                    <p className="text-xs text-[#415A77] mt-2 font-light">
                      Estimate time spent on repetitive operational tasks
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-[#E0E1DD] mb-2 font-light">
                      Investment Range Comfort
                    </label>
                    <select 
                      name="investmentRange"
                      value={formData.investmentRange}
                      onChange={handleChange}
                      className="w-full bg-[#1B263B] border border-[#415A77] px-4 py-3 
                               text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                               font-light"
                      required
                    >
                      <option value="">Select range</option>
                      <option value="125-200">$125,000 - $200,000</option>
                      <option value="200-300">$200,000 - $300,000</option>
                      <option value="300-400">$300,000 - $400,000</option>
                      <option value="400+">$400,000+</option>
                      <option value="not-sure">Need to understand value first</option>
                    </select>
                  </div>
                </div>
              </fieldset>
              
              {/* Contact Details */}
              <fieldset>
                <legend className="text-[#3FD3C6] uppercase tracking-wider text-sm mb-6">
                  Contact Details
                </legend>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input 
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Name"
                    className="bg-[#1B263B] border border-[#415A77] px-4 py-3 
                             text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                             font-light"
                    required
                  />
                  <input 
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="Role"
                    className="bg-[#1B263B] border border-[#415A77] px-4 py-3 
                             text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                             font-light"
                    required
                  />
                  <input 
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="bg-[#1B263B] border border-[#415A77] px-4 py-3 
                             text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                             font-light"
                    required
                  />
                  <input 
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Company"
                    className="bg-[#1B263B] border border-[#415A77] px-4 py-3 
                             text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                             font-light"
                    required
                  />
                </div>
              </fieldset>
              
              <button 
                type="submit"
                className="w-full py-4 bg-[#1B263B] border border-[#415A77] 
                         text-[#E0E1DD] hover:border-[#3FD3C6] transition-all duration-500
                         font-light tracking-wider"
              >
                Submit for Q1 2026 Consideration
              </button>
            </form>
          </>
        )}
        
        {stage === 'submitted' && (
          <div className="text-center py-32">
            <div className="mb-8">
              <svg className="w-16 h-16 text-[#3FD3C6] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-4">
              Request Received
            </h2>
            <p className="text-xl text-[#415A77] mb-2 font-light">
              Queue Position: {position} of {maxQueueCapacity}
            </p>
            <p className="text-[#415A77] font-light">
              Expected consideration: {expectedConsiderationDate}
            </p>
            <p className="text-sm text-[#415A77] mt-8 font-light">
              We review requests quarterly. You'll receive a response regardless of outcome.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}