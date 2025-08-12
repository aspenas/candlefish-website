import React from 'react'

interface ProjectMetricProps {
  children: React.ReactNode
}

const ProjectMetric: React.FC<ProjectMetricProps> = ({ children }) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{color: 'var(--accent-primary)'}}>▸</span>
      <span style={{color: 'var(--text-secondary)'}}>{children}</span>
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
        return { color: '#10B981', borderColor: '#10B981' } // green-500
      case 'DEVELOPMENT':
        return { color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
      case 'PLANNING':
        return { color: '#F59E0B', borderColor: '#F59E0B' } // orange-400
      default:
        return { color: 'var(--text-tertiary)', borderColor: 'var(--border-medium)' }
    }
  }

  const statusColors = getStatusColor(status)

  return (
    <article className="card card-elevated hover-lift hover-glow relative overflow-hidden group animate-fade-in-up">
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-1 transform scale-x-0 origin-left transition-transform duration-800 ease-out group-hover:scale-x-100"
        style={{backgroundColor: 'var(--accent-primary)'}}
      ></div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-light mb-2 text-reveal" style={{color: 'var(--text-primary)'}}>{title}</h3>
          <p className="text-sm text-caption">{company}</p>
        </div>
        <span
          className="font-mono text-xs px-4 py-1 border uppercase tracking-wider text-label"
          style={{
            color: statusColors.color,
            borderColor: statusColors.borderColor,
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          {status}
        </span>
      </div>

      <p className="text-body mb-8 leading-relaxed" style={{color: 'var(--text-secondary)'}}>
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
    <section className="py-20 lg:py-32" id="pilots" style={{backgroundColor: 'var(--bg-secondary)'}}>
      <div className="container mx-auto px-6 max-w-screen-xl">
        <div className="text-center mb-16">
          <h2 className="mb-6 animate-fade-in-up" style={{color: 'var(--text-primary)'}}>Current Pilot Implementations</h2>
          <p className="text-xl max-w-4xl mx-auto animate-fade-in-up delay-200" style={{color: 'var(--text-secondary)'}}>
            We're validating our modular AI approach through strategic pilot partnerships.
            Each pilot proves specific patterns that become reusable solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="delay-100">
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
          </div>

          <div className="delay-200">
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
          </div>

          <div className="delay-300">
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
          </div>

          <div className="delay-400">
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
      </div>
    </section>
  )
}

export default PilotProjects
