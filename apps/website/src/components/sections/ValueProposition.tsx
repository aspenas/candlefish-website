import React from 'react'

interface ValueCardProps {
  metric: string
  label: string
  delay?: number
}

const ValueCard: React.FC<ValueCardProps> = ({ metric, label, delay = 0 }) => {
  return (
    <div
      className="value-card bg-gray-800 border border-gray-700 p-8 text-center transition-all duration-400 ease-out hover:border-teal-400 hover:-translate-y-2 hover:shadow-lg hover:shadow-teal-400/10 opacity-0 transform translate-y-8"
      data-animate
      style={{
        animationDelay: `${delay}ms`
      }}
    >
      <div className="text-5xl lg:text-6xl font-mono text-teal-400 mb-2">
        {metric}
      </div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  )
}

const ValueProposition: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-black">
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
