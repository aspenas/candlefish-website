import React from 'react'

interface ValueCardProps {
  metric: string
  label: string
  delay?: number
}

const ValueCard: React.FC<ValueCardProps> = ({ metric, label }) => {
  return (
    <div className="value-card bg-gray-800 border border-gray-700 p-6 sm:p-8 text-center transition-all duration-400 ease-out hover:border-teal-400 hover:-translate-y-2 hover:shadow-lg hover:shadow-teal-400/10">
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
    <section className="py-20 lg:py-32 bg-black border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <ValueCard
            metric="Instant"
            label="System Analysis"
          />
          <ValueCard
            metric="90%"
            label="Time Reduction"
          />
          <ValueCard
            metric="Fast"
            label="Delivery"
          />
          <ValueCard
            metric="Zero"
            label="Systems Replaced"
          />
        </div>
      </div>

    </section>
  )
}

export default ValueProposition
