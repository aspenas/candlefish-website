import { ArrowUpRight, Clock, Zap } from 'lucide-react'

const projects = [
  {
    title: 'Global Logistics Optimization',
    client: 'Fortune 500 Retailer',
    description: 'Reduced shipping times by 40% using predictive routing AI modules.',
    impact: '40% faster delivery',
    time: '3 weeks',
    tags: ['Machine Learning', 'Route Optimization', 'Real-time Analytics']
  },
  {
    title: 'Customer Service Automation',
    client: 'Leading Insurance Provider',
    description: 'Automated 70% of customer inquiries with conversational AI.',
    impact: '70% automation rate',
    time: '4 weeks',
    tags: ['NLP', 'Chatbot', 'Sentiment Analysis']
  },
  {
    title: 'Fraud Detection System',
    client: 'Digital Banking Platform',
    description: 'Real-time fraud detection reducing false positives by 60%.',
    impact: '60% fewer false positives',
    time: '6 weeks',
    tags: ['Anomaly Detection', 'Real-time Processing', 'Risk Scoring']
  }
]

export default function ProjectsSection() {
  return (
    <section id="projects" className="section">
      <div className="container">
        <div className="text-center mb-16">
          <div className="text-label text-accent mb-4 animate-fade-in-up">
            CASE STUDIES
          </div>
          <h2 className="mb-4 animate-fade-in-up delay-100">
            Recent <span className="gradient-text">Projects</span>
          </h2>
          <p className="text-body-large text-secondary max-w-2xl mx-auto animate-fade-in-up delay-200">
            Real results from real implementations
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={project.title}
              className={`animate-fade-in-up delay-${(index + 3) * 100}`}
            >
              <div className="card card-highlight hover-lift h-full flex flex-col">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                  <p className="text-caption">{project.client}</p>
                </div>

                {/* Description */}
                <p className="text-body text-secondary mb-6 flex-1">{project.description}</p>

                {/* Metrics */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center gap-2 hover-scale">
                    <Zap className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm font-medium text-accent">{project.impact}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-tertiary" />
                    <span className="text-caption">{project.time}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium rounded-full hover-glow"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Case Study CTA */}
        <div className="text-center mt-12 animate-fade-in-up delay-600">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-accent hover-lift text-reveal"
          >
            View More Case Studies
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
