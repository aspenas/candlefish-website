import React from 'react'

interface ProcessStepProps {
  title: string
  subtitle: string
  isActive?: boolean
}

const ProcessStep: React.FC<ProcessStepProps> = ({ title, subtitle, isActive = false }) => {
  return (
    <div className={`card flex-shrink-0 px-8 py-6 font-mono text-sm text-center min-w-[150px] hover-lift relative ${
      isActive
        ? 'card-highlight animate-glow'
        : ''
    }`} style={{
      backgroundColor: isActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
      borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-medium)',
      color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)'
    }}>
      <div>{title}</div>
      <div className="text-xs mt-1 text-caption">
        {subtitle}
      </div>
    </div>
  )
}

const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 lg:py-32" id="how-it-works" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6 animate-fade-in-up" style={{color: 'var(--text-primary)'}}>The Candlefish Method</h2>
          <p className="text-xl max-w-3xl mx-auto animate-fade-in-up delay-200" style={{color: 'var(--text-secondary)'}}>
            We deliver working software in weeks, not months. Every solution includes
            the "why" along with the "how."
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 py-12 px-6 card card-elevated overflow-x-auto animate-fade-in-scale delay-400">
          <ProcessStep
            title="Identify"
            subtitle="Biggest Pain Point"
            isActive={true}
          />

          <div className="text-xl flex-shrink-0 animate-slide-in-right delay-500" style={{color: 'var(--text-tertiary)'}}>→</div>

          <ProcessStep
            title="Build"
            subtitle="Working Prototype"
          />

          <div className="text-xl flex-shrink-0 animate-slide-in-right delay-600" style={{color: 'var(--text-tertiary)'}}>→</div>

          <ProcessStep
            title="Deploy"
            subtitle="To Production"
          />

          <div className="text-xl flex-shrink-0 animate-slide-in-right delay-700" style={{color: 'var(--text-tertiary)'}}>→</div>

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
