import React, { useState, useCallback, useEffect } from 'react'

export interface ProportionTriad {
  source: string[]
  tether: string[]
  service: {
    benefits: string[]
    risks: string[]
  }
}

interface ProportionNudgeProps {
  onSubmit: (triad: ProportionTriad) => void
  onSkip?: () => void
  context?: 'commit' | 'publish' | 'deploy' | 'merge'
  required?: boolean
  className?: string
}

export const ProportionNudge: React.FC<ProportionNudgeProps> = ({
  onSubmit,
  onSkip,
  context = 'publish',
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState('')
  const [tether, setTether] = useState('')
  const [benefits, setBenefits] = useState('')
  const [risks, setRisks] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && e.shiftKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Auto-open based on context
  useEffect(() => {
    if (required) {
      setIsOpen(true)
    }
  }, [required])

  // Validate and submit
  const handleSubmit = useCallback(() => {
    const validationErrors: string[] = []

    if (!source.trim()) {
      validationErrors.push('Source is required')
    }
    if (!tether.trim()) {
      validationErrors.push('Tether (constraints) is required')
    }
    if (!benefits.trim()) {
      validationErrors.push('Benefits are required')
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    const triad: ProportionTriad = {
      source: source.split(',').map(s => s.trim()).filter(Boolean),
      tether: tether.split(',').map(t => t.trim()).filter(Boolean),
      service: {
        benefits: benefits.split(',').map(b => b.trim()).filter(Boolean),
        risks: risks.split(',').map(r => r.trim()).filter(Boolean)
      }
    }

    onSubmit(triad)
    setIsOpen(false)
    resetForm()
  }, [source, tether, benefits, risks, onSubmit])

  // Reset form
  const resetForm = () => {
    setSource('')
    setTether('')
    setBenefits('')
    setRisks('')
    setErrors([])
  }

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!required && onSkip) {
      onSkip()
      setIsOpen(false)
      resetForm()
    }
  }, [required, onSkip])

  // Get context-specific prompts
  const getPrompts = () => {
    switch (context) {
      case 'commit':
        return {
          title: 'Proportion Check: Commit',
          sourcePrompt: 'What informed this change? (docs, issues, analysis)',
          tetherPrompt: 'What constraints apply? (performance, compatibility, security)',
          benefitsPrompt: 'Who benefits from this change?',
          risksPrompt: 'What could go wrong? Who owns the risk?'
        }
      case 'deploy':
        return {
          title: 'Proportion Check: Deploy',
          sourcePrompt: 'What validates this deployment? (tests, reviews, metrics)',
          tetherPrompt: 'What limits apply? (cost, latency, availability)',
          benefitsPrompt: 'Which users benefit?',
          risksPrompt: 'What are the rollback triggers? Who monitors?'
        }
      case 'merge':
        return {
          title: 'Proportion Check: Merge',
          sourcePrompt: 'What supports this merge? (PR reviews, CI results)',
          tetherPrompt: 'What dependencies exist? (breaking changes, migrations)',
          benefitsPrompt: 'Which teams benefit?',
          risksPrompt: 'What conflicts might arise? Who resolves?'
        }
      case 'publish':
      default:
        return {
          title: 'Proportion Check: Publish',
          sourcePrompt: 'What sources support this? (research, data, citations)',
          tetherPrompt: 'What constraints exist? (accuracy, privacy, legal)',
          benefitsPrompt: 'Who does this serve?',
          risksPrompt: 'Who might be harmed? How to mitigate?'
        }
    }
  }

  const prompts = getPrompts()

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${className}`}
        aria-label="Open proportion nudge"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Proportion Check
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{prompts.title}</h2>
          {!required && (
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close proportion nudge"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Explanation */}
        <div className="mb-6 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            This quick check ensures your work is grounded, constrained, and service-oriented.
            It takes 30 seconds and improves decision quality.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Source */}
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                SOURCE
              </span>
            </label>
            <input
              id="source"
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={prompts.sourcePrompt}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="source-help"
            />
            <p id="source-help" className="mt-1 text-xs text-gray-500">
              Comma-separated list of sources, references, or evidence
            </p>
          </div>

          {/* Tether */}
          <div>
            <label htmlFor="tether" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                TETHER
              </span>
            </label>
            <input
              id="tether"
              type="text"
              value={tether}
              onChange={(e) => setTether(e.target.value)}
              placeholder={prompts.tetherPrompt}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="tether-help"
            />
            <p id="tether-help" className="mt-1 text-xs text-gray-500">
              Constraints, limits, trade-offs, or dependencies
            </p>
          </div>

          {/* Service */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                SERVICE
              </span>
            </div>

            <div>
              <label htmlFor="benefits" className="block text-xs font-medium text-gray-600 mb-1">
                Benefits / Who gains
              </label>
              <input
                id="benefits"
                type="text"
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder={prompts.benefitsPrompt}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="risks" className="block text-xs font-medium text-gray-600 mb-1">
                Risks / Who owns (optional)
              </label>
              <input
                id="risks"
                type="text"
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                placeholder={prompts.risksPrompt}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-md">
              <ul className="text-sm text-red-800 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            {!required && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Skip
              </button>
            )}
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit & Continue
            </button>
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Tip: Use <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 rounded">Cmd+Shift+P</kbd> to open anytime
        </div>
      </div>
    </div>
  )
}
