import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

interface Feature {
  title: string
  description: string
  icon: string
  gradient: string
  delay: number
}

const features: Feature[] = [
  {
    title: "Intelligent Automation",
    description: "Automate complex workflows with AI that learns and adapts to your business processes.",
    icon: "🤖",
    gradient: "from-blue-500 to-cyan-500",
    delay: 0.1
  },
  {
    title: "Predictive Analytics",
    description: "Make data-driven decisions with advanced predictive models and real-time insights.",
    icon: "📊",
    gradient: "from-purple-500 to-pink-500",
    delay: 0.2
  },
  {
    title: "Natural Language Processing",
    description: "Process and understand human language to enhance customer interactions and document analysis.",
    icon: "💬",
    gradient: "from-green-500 to-teal-500",
    delay: 0.3
  },
  {
    title: "Computer Vision",
    description: "Extract valuable insights from images and videos with state-of-the-art vision models.",
    icon: "👁️",
    gradient: "from-orange-500 to-red-500",
    delay: 0.4
  },
  {
    title: "Scalable Infrastructure",
    description: "Built on enterprise-grade infrastructure that scales with your growing needs.",
    icon: "⚡",
    gradient: "from-indigo-500 to-purple-500",
    delay: 0.5
  },
  {
    title: "Security First",
    description: "Enterprise-level security with end-to-end encryption and compliance certifications.",
    icon: "🔒",
    gradient: "from-gray-600 to-gray-800",
    delay: 0.6
  }
]

const ModernFeaturesSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-base font-semibold text-indigo-600 mb-2">FEATURES</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h3>
          <p className="max-w-3xl mx-auto text-xl text-gray-600">
            Our comprehensive suite of AI tools empowers your team to work smarter, move faster, and achieve more.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: feature.delay }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group relative"
            >
              <div className="h-full bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`} />
                
                <div className="relative bg-white rounded-2xl p-8 h-full border border-gray-100 group-hover:border-transparent transition-colors duration-300">
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl">{feature.icon}</span>
                  </div>

                  {/* Content */}
                  <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Learn More Link */}
                  <div className="mt-6 flex items-center text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Learn more</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-6">Want to see all features in action?</p>
          <button className="inline-flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105">
            Request a Demo
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  )
}

export default ModernFeaturesSection