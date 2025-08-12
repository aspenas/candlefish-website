import React from 'react'

interface ValueCardProps {
  metric: string
  label: string
  delay?: number
}

const ValueCard: React.FC<ValueCardProps> = ({ metric, label, delay = 0 }) => {
  return (
    <div
      className={`card card-elevated hover-lift hover-glow text-center animate-fade-in-up delay-${delay}`}
      style={{
        animationDelay: `${delay}ms`
      }}
    >
      <div className="text-5xl lg:text-6xl font-mono text-accent-primary mb-2 animate-float" style={{color: 'var(--accent-primary)'}}>
        {metric}
      </div>
      <div className="text-label" style={{color: 'var(--text-tertiary)'}}>
        {label}
      </div>
    </div>
  )
}

const ValueProposition: React.FC = () => {
  return (
    <section className="py-20 lg:py-32" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <ValueCard
            metric="Instant"
            label="System Analysis"
            delay={100}
          />
          <ValueCard
            metric="90%"
            label="Time Reduction"
            delay={200}
          />
          <ValueCard
            metric="Fast"
            label="Delivery"
            delay={300}
          />
          <ValueCard
            metric="Zero"
            label="Systems Replaced"
            delay={400}
          />
        </div>
      </div>
    </section>
  )
}

export default ValueProposition
