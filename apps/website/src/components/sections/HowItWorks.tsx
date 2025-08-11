import React from 'react'

interface ProcessStepProps {
  title: string
  subtitle: string
  isActive?: boolean
}

const ProcessStep: React.FC<ProcessStepProps> = ({ title, subtitle, isActive = false }) => {
  return (
    <div className={`process-step flex-shrink-0 px-8 py-6 bg-black border-2 font-mono text-sm text-center min-w-[150px] transition-all duration-400 ease-out relative ${
      isActive
        ? 'border-teal-400 text-teal-400 shadow-lg shadow-teal-400/30'
        : 'border-gray-700 text-white'
    }`}>
      <div>{title}</div>
      <div className="text-xs text-gray-400 mt-1">
        {subtitle}
      </div>
    </div>
  )
}

const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-900 border-t border-gray-800" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6">The Candlefish Method</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We deliver working software in weeks, not months. Every solution includes
            the "why" along with the "how."
          </p>
        </div>

        <div className="flex items-center justify-start lg:justify-center gap-4 lg:gap-8 py-8 lg:py-12 px-4 lg:px-6 bg-gray-800 border border-gray-700 overflow-x-auto">
          <ProcessStep
            title="Identify"
            subtitle="Biggest Pain Point"
            isActive={true}
          />

          <div className="text-gray-400 text-xl flex-shrink-0">→</div>

          <ProcessStep
            title="Build"
            subtitle="Working Prototype"
          />

          <div className="text-gray-400 text-xl flex-shrink-0">→</div>

          <ProcessStep
            title="Deploy"
            subtitle="To Production"
          />

          <div className="text-gray-400 text-xl flex-shrink-0">→</div>

          <ProcessStep
            title="Measure"
            subtitle="Real Results"
          />
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
