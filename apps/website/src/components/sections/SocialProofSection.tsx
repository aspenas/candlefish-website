import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

interface Metric {
  value: string
  label: string
  suffix?: string
}

interface Testimonial {
  quote: string
  author: string
  role: string
  company: string
  image?: string
}

const metrics: Metric[] = [
  { value: "99.9", label: "Uptime SLA", suffix: "%" },
  { value: "500", label: "Enterprise Clients", suffix: "+" },
  { value: "10", label: "Processing Speed", suffix: "ms" },
  { value: "4.9", label: "Customer Rating", suffix: "/5" }
]

const testimonials: Testimonial[] = [
  {
    quote: "Candlefish AI transformed our data processing capabilities. We've reduced analysis time by 80% while improving accuracy.",
    author: "Sarah Chen",
    role: "CTO",
    company: "TechCorp Industries"
  },
  {
    quote: "The AI automation tools have revolutionized our workflow. Our team is now 3x more productive with better outcomes.",
    author: "Michael Rodriguez",
    role: "VP of Operations",
    company: "Global Solutions Inc"
  },
  {
    quote: "Best-in-class AI platform with exceptional support. The ROI we've seen in just 6 months has exceeded all expectations.",
    author: "Emily Thompson",
    role: "Director of Innovation",
    company: "Future Dynamics"
  }
]

const SocialProofSection: React.FC = () => {
  const [metricsRef, metricsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const [testimonialsRef, testimonialsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Metrics Section */}
        <div ref={metricsRef} className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={metricsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies achieving extraordinary results
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={metricsInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-block">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={metricsInView ? { opacity: 1 } : {}}
                    transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                    className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2"
                  >
                    {metric.value}
                    <span className="text-3xl md:text-4xl">{metric.suffix}</span>
                  </motion.div>
                  <p className="text-gray-600 font-medium">{metric.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div ref={testimonialsRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Clients Say
            </h3>
            <p className="text-xl text-gray-600">
              Real results from real businesses
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={testimonialsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8"
              >
                {/* Quote Icon */}
                <div className="text-indigo-600 mb-4">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                {/* Quote */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="border-t pt-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex mt-4 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Logo Cloud */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={testimonialsInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20 pt-12 border-t border-gray-200"
        >
          <p className="text-center text-sm font-semibold text-gray-600 mb-8">
            TRUSTED BY FORTUNE 500 COMPANIES
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center opacity-60">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-32 h-12 bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg" />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default SocialProofSection
