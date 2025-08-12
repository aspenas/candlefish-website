import React from 'react'

interface TechItemProps {
  name: string
  description: string
  delay?: number
}

const TechItem: React.FC<TechItemProps> = ({ name, description, delay = 0 }) => {
  return (
    <div 
      className={`card text-center hover-lift hover-glow animate-fade-in-scale delay-${delay}`}
      style={{animationDelay: `${delay}ms`}}
    >
      <div className="font-mono text-sm mb-2 text-label" style={{color: 'var(--accent-primary)'}}>
        {name}
      </div>
      <div className="text-caption">
        {description}
      </div>
    </div>
  )
}

const TechnicalExcellence: React.FC = () => {
  return (
    <section className="py-20 lg:py-32" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6 animate-fade-in-up" style={{color: 'var(--text-primary)'}}>Technical Excellence</h2>
          <p className="text-xl max-w-3xl mx-auto animate-fade-in-up delay-200" style={{color: 'var(--text-secondary)'}}>
            We leverage enterprise-grade AI platforms to process entire systems
            at once and deliver production-ready solutions.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <TechItem name="AI Platforms" description="Enterprise-grade" delay={100} />
          <TechItem name="Machine Learning" description="Advanced reasoning" delay={150} />
          <TechItem name="Cloud Native" description="AWS infrastructure" delay={200} />
          <TechItem name="Modern APIs" description="Seamless integration" delay={250} />
          <TechItem name="Enterprise Data" description="Secure & reliable" delay={300} />
          <TechItem name="Performance" description="Lightning fast" delay={350} />
          <TechItem name="Next.js 15" description="Modern frontend" delay={400} />
          <TechItem name="Monitoring" description="Real-time insights" delay={450} />
        </div>
      </div>
    </section>
  )
}

export default TechnicalExcellence
