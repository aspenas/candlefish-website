import React from 'react'

interface TechItemProps {
  name: string
  description: string
}

const TechItem: React.FC<TechItemProps> = ({ name, description }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 p-6 text-center transition-all duration-400 ease-out hover:border-teal-400 hover:-translate-y-1">
      <div className="font-mono text-sm text-teal-400 mb-2">
        {name}
      </div>
      <div className="text-xs text-gray-400">
        {description}
      </div>
    </div>
  )
}

const TechnicalExcellence: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-black">
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6">Technical Excellence</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We leverage enterprise-grade AI platforms to process entire systems
            at once and deliver production-ready solutions.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <TechItem name="AI Platforms" description="Enterprise-grade" />
          <TechItem name="Machine Learning" description="Advanced reasoning" />
          <TechItem name="Cloud Native" description="AWS infrastructure" />
          <TechItem name="Modern APIs" description="Seamless integration" />
          <TechItem name="Enterprise Data" description="Secure & reliable" />
          <TechItem name="Performance" description="Lightning fast" />
          <TechItem name="Next.js 15" description="Modern frontend" />
          <TechItem name="Monitoring" description="Real-time insights" />
        </div>
      </div>
    </section>
  )
}

export default TechnicalExcellence
