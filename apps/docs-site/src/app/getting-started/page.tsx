import { Metadata } from 'next'
import { QuickStart } from '@/components/sections/QuickStart'
import { InstallationGuide } from '@/components/sections/InstallationGuide'
import { FirstApiCall } from '@/components/sections/FirstApiCall'

export const metadata: Metadata = {
  title: 'Getting Started - Candlefish AI Documentation',
  description: 'Quick start guide to get up and running with Candlefish AI in minutes.',
}

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-[#0b0f13]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold text-[#e6f9f6] mb-6">
              Getting Started
            </h1>
            <p className="text-xl text-[#a3b3bf] leading-relaxed">
              Get up and running with Candlefish AI in just a few minutes. From installation to your first API call.
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-16">
            <QuickStart />
            <InstallationGuide />
            <FirstApiCall />
          </div>
        </div>
      </div>
    </div>
  )
}
