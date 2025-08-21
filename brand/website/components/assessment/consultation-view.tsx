import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AssessmentScore } from '@/types/assessment'

interface ConsultationViewProps {
  score: AssessmentScore
  sessionId: string
}

export const ConsultationView = ({ score, sessionId }: ConsultationViewProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    preferredTime: '',
    message: ''
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/assessment/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sessionId,
          score: {
            level: score.level,
            percentage: score.percentage,
            percentile: score.percentile
          }
        })
      })

      if (response.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto px-6 pt-32 text-center"
      >
        <div className="bg-[#1B263B] p-12 border border-[#3FD3C6]">
          <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">
            Consultation Request Received
          </h2>

          <p className="text-[#E0E1DD] mb-8">
            We'll review your assessment results and reach out within 24 hours
            to discuss how we can help transform your operations.
          </p>

          <div className="bg-[#0D1B2A] p-6 rounded">
            <p className="text-sm text-[#415A77] mb-2">Your reference number:</p>
            <p className="text-[#3FD3C6] font-mono text-lg">{sessionId}</p>
          </div>

          <p className="text-sm text-[#415A77] mt-8">
            You'll receive a confirmation email shortly with your assessment results
            and next steps.
          </p>
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-6 pt-32 pb-16"
    >
      <header className="mb-12">
        <h1 className="text-5xl font-light text-[#F8F8F2] mb-4">
          Request Consultation
        </h1>
        <p className="text-xl text-[#E0E1DD]">
          Let's discuss how to transform your {score.level.split(':')[1].toLowerCase()} operations
          into systematic excellence.
        </p>
      </header>

      <div className="bg-[#1B263B] p-8 mb-8">
        <h3 className="text-[#3FD3C6] mb-4">What happens next:</h3>
        <ul className="space-y-2 text-[#E0E1DD] text-sm">
          <li>• We'll review your assessment in detail</li>
          <li>• Schedule a 45-minute consultation call</li>
          <li>• Discuss specific intervention strategies</li>
          <li>• Provide a customized transformation roadmap</li>
          <li>• No sales pressure - just operational truth</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Company *
            </label>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Role *
            </label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#E0E1DD] mb-2">
              Preferred Time
            </label>
            <select
              value={formData.preferredTime}
              onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none"
            >
              <option value="">Select preferred time</option>
              <option value="morning">Morning (9am-12pm)</option>
              <option value="afternoon">Afternoon (12pm-5pm)</option>
              <option value="evening">Evening (5pm-7pm)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[#E0E1DD] mb-2">
            Specific areas you'd like to discuss
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
            className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3
                     text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                     focus:outline-none resize-none"
            placeholder="What operational challenges are you facing? What would success look like?"
          />
        </div>

        <div className="flex justify-between items-center">
          <p className="text-xs text-[#415A77]">
            * Required fields
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-4 bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6]
                     transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Request Consultation'}
          </button>
        </div>
      </form>
    </motion.section>
  )
}
