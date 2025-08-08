import React from 'react'

interface ProjectMetricProps {
  children: React.ReactNode
}

const ProjectMetric: React.FC<ProjectMetricProps> = ({ children }) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-teal-400">▸</span>
      <span>{children}</span>
    </div>
  )
}

interface ProjectCardProps {
  title: string
  company: string
  status: 'ACTIVE' | 'DEVELOPMENT' | 'PLANNING'
  description: string
  metrics: string[]
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, company, status, description, metrics }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-500 border-green-500'
      case 'DEVELOPMENT':
        return 'text-teal-400 border-teal-400'
      case 'PLANNING':
        return 'text-orange-400 border-orange-400'
      default:
        return 'text-gray-400 border-gray-400'
    }
  }

  return (
    <article className="project-card bg-gray-800 border-2 border-gray-700 p-8 relative overflow-hidden transition-all duration-400 ease-out hover:border-teal-400 hover:-translate-y-2 hover:shadow-lg hover:shadow-teal-400/15 group">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 transform scale-x-0 origin-left transition-transform duration-800 ease-out group-hover:scale-x-100"></div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-light mb-2">{title}</h3>
          <p className="text-sm text-gray-400">{company}</p>
        </div>
        <span className={`font-mono text-xs px-4 py-1 bg-gray-200 border uppercase tracking-wider ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>

      <p className="text-gray-400 mb-8 leading-relaxed">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <ProjectMetric key={index}>
            {metric}
          </ProjectMetric>
        ))}
      </div>
    </article>
  )
}

const PilotProjects: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-100" id="pilots">
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6">Current Pilot Implementations</h2>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto">
            We're validating our modular AI approach through strategic pilot partnerships.
            Each pilot proves specific patterns that become reusable solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <ProjectCard
            title="Enterprise Data Platform"
            company="Mid-Size Colorado Company"
            status="ACTIVE"
            description="Excel-based workflows processing 100K+ rows transformed into a cloud-native calculation engine with AI optimization. Real-time processing with intelligent data validation."
            metrics={[
              "90% faster processing",
              "99.8% accuracy",
              "Scales to 1000+ users",
              "Zero replacements"
            ]}
          />

          <ProjectCard
            title="Family Office Digital"
            company="National QSR Chain"
            status="DEVELOPMENT"
            description="AI-powered operational intelligence platform connecting disconnected systems across multiple business units. Real-time data integration with predictive analytics."
            metrics={[
              "Unified dashboard",
              "Demand forecasting",
              "Automated compliance",
              "Real-time insights"
            ]}
          />

          <ProjectCard
            title="PromoterOS"
            company="Music Venue Partner"
            status="ACTIVE"
            description="AI platform for automated artist booking workflows. Integrates with Spotify/TikTok for demand analysis and data-driven pricing optimization."
            metrics={[
              "Automated offers",
              "Smart pricing",
              "Conflict prevention",
              "Digital contracts"
            ]}
          />

          <ProjectCard
            title="Crown Trophy Digital"
            company="Manufacturing Retailer"
            status="PLANNING"
            description="Unified platform design connecting 100+ franchise locations. AI-powered production optimization with real-time inventory synchronization."
            metrics={[
              "Multi-location sync",
              "Production queue AI",
              "Franchise analytics",
              "B2B portal"
            ]}
          />
        </div>
      </div>
    </section>
  )
}

export default PilotProjects
