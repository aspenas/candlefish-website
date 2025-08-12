import { Award, Globe, Layers, Target } from 'lucide-react'

const values = [
  {
    icon: Target,
    title: 'Results-Driven',
    description: 'We measure success by your ROI, not billable hours.'
  },
  {
    icon: Layers,
    title: 'Modular Approach',
    description: 'Start small, scale fast with composable AI modules.'
  },
  {
    icon: Globe,
    title: 'Global Expertise',
    description: 'Team of experts from leading tech companies worldwide.'
  },
  {
    icon: Award,
    title: 'Industry Leaders',
    description: 'Recognized for innovation in enterprise AI solutions.'
  }
]

export default function AboutSection() {
  return (
    <section id="about" className="section" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="animate-slide-in-right">
            <div className="text-label text-accent mb-4">ABOUT US</div>
            <h2 className="mb-6">
              Why <span className="gradient-text">Candlefish AI</span>
            </h2>
            <p className="text-body-large text-secondary mb-6">
              We're a team of AI engineers, data scientists, and business strategists who believe 
              that artificial intelligence should be accessible, practical, and immediately valuable.
            </p>
            <p className="text-body text-tertiary mb-8">
              Founded in 2023, we've helped dozens of enterprises transform their slowest, most 
              expensive processes into competitive advantages. Our modular approach means you can 
              start seeing results in weeks, not years.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-accent animate-fade-in-scale delay-200">50+</div>
                <div className="text-caption">AI Modules Deployed</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-accent animate-fade-in-scale delay-300">95%</div>
                <div className="text-caption">Client Retention</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-accent animate-fade-in-scale delay-400">3-5x</div>
                <div className="text-caption">Average ROI</div>
              </div>
            </div>

            <a href="#contact" className="btn btn-primary btn-lg hover-lift">
              Let's Talk
            </a>
          </div>

          {/* Values Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <div 
                key={value.title}
                className={`card card-elevated hover-lift animate-fade-in-up delay-${(index + 2) * 100}`}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 animate-glow" 
                     style={{ background: 'var(--accent-subtle)' }}>
                  <value.icon className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="font-semibold mb-2 text-primary">{value.title}</h3>
                <p className="text-body-small text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}