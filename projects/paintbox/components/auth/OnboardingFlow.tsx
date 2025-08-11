'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, ArrowRight, ArrowLeft, Calculator, Camera, FileText, Users } from 'lucide-react'
import PaintboxLogo from '@/components/ui/PaintboxLogo'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  content: React.ReactNode
}

export function OnboardingFlow() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [userPreferences, setUserPreferences] = useState({
    role: '',
    company: '',
    notifications: true,
    defaultPricingTier: 'good',
  })

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to KindHome Paint!',
      description: 'Let\'s get you set up with everything you need to create professional painting estimates.',
      icon: Users,
      content: (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <PaintboxLogo size="large" showText className="flex flex-col items-center gap-4" />
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              You're now part of the KindHome Paint family!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Our professional estimation system helps you create accurate quotes,
              manage projects, and grow your painting business.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calculator className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Professional Estimates</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Photo Documentation</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">CRM Integration</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Tell us about yourself',
      description: 'Help us personalize your experience based on your role and company.',
      icon: Users,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="paintbox-label">
                What's your role?
              </label>
              <select
                value={userPreferences.role}
                onChange={(e) => setUserPreferences(prev => ({ ...prev, role: e.target.value }))}
                className="paintbox-input"
                required
              >
                <option value="">Select your role</option>
                <option value="owner">Business Owner</option>
                <option value="estimator">Estimator</option>
                <option value="project_manager">Project Manager</option>
                <option value="sales">Sales Representative</option>
                <option value="contractor">Contractor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="paintbox-label">
                Company Name (Optional)
              </label>
              <input
                type="text"
                value={userPreferences.company}
                onChange={(e) => setUserPreferences(prev => ({ ...prev, company: e.target.value }))}
                className="paintbox-input"
                placeholder="Your painting company name"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Why we ask:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Customize the interface for your workflow</li>
              <li>• Show relevant features and tips</li>
              <li>• Pre-fill company information in estimates</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'preferences',
      title: 'Set your preferences',
      description: 'Configure default settings to streamline your estimation process.',
      icon: Calculator,
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="paintbox-label">
                Default Pricing Tier
              </label>
              <select
                value={userPreferences.defaultPricingTier}
                onChange={(e) => setUserPreferences(prev => ({ ...prev, defaultPricingTier: e.target.value }))}
                className="paintbox-input"
              >
                <option value="good">Good - Basic quality</option>
                <option value="better">Better - Premium quality</option>
                <option value="best">Best - Luxury quality</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                This will be pre-selected when creating new estimates
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">
                  Receive updates about new features and tips
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userPreferences.notifications}
                  onChange={(e) => setUserPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tip:</h4>
            <p className="text-sm text-blue-800">
              You can always change these preferences later in your account settings.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Welcome aboard! Let\'s create your first professional painting estimate.',
      icon: CheckCircle,
      content: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Welcome to KindHome Paint, {session?.user?.name?.split(' ')[0]}! 🎉
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              You're now ready to create professional painting estimates with our powerful estimation system.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Next steps:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Create your first estimate</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Connect with Salesforce CRM (optional)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Set up Company Cam for photos</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const completeOnboarding = async () => {
    try {
      // Update user profile with preferences
      await fetch('/api/auth/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPreferences)
      })

      // Update session to mark onboarding as complete
      await update({ isFirstLogin: false })

      // Redirect to main app
      router.push('/estimate/new')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      // Still proceed to main app even if preferences fail to save
      router.push('/estimate/new')
    }
  }

  // Don't show onboarding if not first login
  if (session && !session.user.isFirstLogin) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="paintbox-card p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <currentStepData.icon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Content */}
          <div className="min-h-[300px] flex items-center justify-center">
            {currentStepData.content}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                transition-all duration-200
                ${isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === 1 && !userPreferences.role}
              className="paintbox-btn paintbox-btn-primary"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/estimate/new')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip onboarding for now
          </button>
        </div>
      </div>
    </div>
  )
}
