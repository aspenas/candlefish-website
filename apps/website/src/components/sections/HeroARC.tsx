import React, { useEffect, useState } from 'react'

const HeroARC: React.FC = () => {
  const [activeModule, setActiveModule] = useState(0)
  
  const modules = [
    { icon: '🔍', label: 'Analysis' },
    { icon: '🧠', label: 'Intelligence' },
    { icon: '⚡', label: 'Automation' },
    { icon: '📊', label: 'Insights' },
    { icon: '🔄', label: 'Integration' },
    { icon: '🚀', label: 'Deployment' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % modules.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [modules.length])

  return (
    <section className="relative min-h-screen section-gradient overflow-hidden">
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px'
        }}
      />

      <div className="relative z-10 container mx-auto px-6 pt-40 pb-20">
        {/* Hero Content */}
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 card rounded-full mb-8 animate-fade-in-scale">
            <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2 animate-pulse-slow"></span>
            <span className="text-sm text-gray-600 font-medium">Enterprise AI Consulting</span>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up text-shadow-soft">
            Turn your slowest<br />
            processes into your<br />
            <span className="text-gradient">fastest advantages</span>
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 mb-12 max-w-3xl animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            We deliver enterprise AI transformation through discrete, composable modules. 
            Each implementation is production-ready, measurable, and designed to integrate 
            seamlessly with your existing systems.
          </p>

          {/* Interactive Module Display */}
          <div className="card p-8 mb-12 animate-fade-in-scale" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold">
                Modular AI Capabilities
              </h3>
              <span className="text-xs text-gray-400">Live Demo</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {modules.map((module, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-xl text-center transition-all duration-300 cursor-pointer
                    ${activeModule === index 
                      ? 'bg-white shadow-lg transform scale-105 border-2 border-cyan-500' 
                      : 'bg-gray-50 hover:bg-white hover:shadow-md border-2 border-transparent'
                    }
                  `}
                  onClick={() => setActiveModule(index)}
                >
                  <div className="text-3xl mb-2">{module.icon}</div>
                  <div className={`text-sm font-medium ${
                    activeModule === index ? 'text-cyan-600' : 'text-gray-600'
                  }`}>
                    {module.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{modules[activeModule].icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {modules[activeModule].label} Module
                  </h4>
                  <p className="text-sm text-gray-600">
                    {activeModule === 0 && 'Deep analysis of your current processes to identify optimization opportunities'}
                    {activeModule === 1 && 'Custom AI models trained on your specific business requirements'}
                    {activeModule === 2 && 'Automated workflows that eliminate repetitive tasks and reduce errors'}
                    {activeModule === 3 && 'Real-time insights and predictive analytics for better decision making'}
                    {activeModule === 4 && 'Seamless integration with your existing tools and systems'}
                    {activeModule === 5 && 'Production-ready deployment with monitoring and support'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <a
              href="#contact"
              className="button-premium inline-flex items-center justify-center px-8 py-4 font-semibold rounded-lg"
            >
              Start Your Transformation
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="#case-studies"
              className="inline-flex items-center justify-center px-8 py-4 card border-2 border-gray-200 hover:border-cyan-300 text-gray-700 font-semibold rounded-lg transition-all interactive-hover"
            >
              View Case Studies
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-gray-200 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
            <div className="stat-card">
              <div className="stat-number">70%</div>
              <div className="text-sm text-gray-600 mt-1">Average efficiency gain</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">2-4 weeks</div>
              <div className="text-sm text-gray-600 mt-1">Typical implementation</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="text-sm text-gray-600 mt-1">Production-ready code</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroARC