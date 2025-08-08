import React, { useCallback } from 'react'
import { useSpring, animated, config } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface FeatureProps {
  icon: React.ReactNode
  title: string
  description: string
  index: number
  inView: boolean
  prefersReducedMotion: boolean
}

const Feature: React.FC<FeatureProps> = React.memo(({
  icon,
  title,
  description,
  index,
  inView,
  prefersReducedMotion
}) => {
  const spring = useSpring({
    from: {
      opacity: 0,
      transform: 'translateY(50px)',
    },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(50px)',
    },
    delay: prefersReducedMotion ? 0 : 100 + (index * 100),
    config: config.gentle
  })

  const [iconSpring, setIconSpring] = useSpring(() => ({
    rotate: 0,
    scale: 1,
    y: 0,
    config: config.wobbly
  }))

  const handleMouseEnter = useCallback(() => {
    if (!prefersReducedMotion) {
      setIconSpring({
        rotate: 360,
        scale: 1.1,
        y: -8
      })
    }
  }, [setIconSpring, prefersReducedMotion])

  const handleMouseLeave = useCallback(() => {
    setIconSpring({
      rotate: 0,
      scale: 1,
      y: 0
    })
  }, [setIconSpring])

  return (
    <animated.div
      className="text-center group cursor-pointer"
      style={{
        opacity: spring.opacity,
        transform: spring.transform,
        willChange: 'transform, opacity'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
      role="article"
      aria-label={`${title}: ${description}`}
    >
      <animated.div
        className="w-20 h-20 mb-6 mx-auto flex items-center justify-center bg-gray-800 border border-gray-700 relative overflow-hidden"
        style={{
          transform: iconSpring.y.to(y => `translateY(${y}px)`),
          boxShadow: iconSpring.y.to(
            y => `0 ${Math.abs(y) * 2}px ${Math.abs(y) * 4}px rgba(0, 206, 209, ${Math.abs(y) * 0.02})`
          ),
          willChange: 'transform, box-shadow'
        }}
      >
        {/* Rotating border effect */}
        <animated.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          style={{
            background: 'conic-gradient(from 0deg, transparent, #00CED1, transparent)',
            transform: iconSpring.rotate.to(r => `rotate(${r}deg)`),
          }}
        />
        <animated.div
          className="relative z-10 text-teal-400"
          style={{
            transform: iconSpring.scale.to(s => `scale(${s})`),
          }}
        >
          {icon}
        </animated.div>
      </animated.div>

      <h3 className="text-2xl mb-4 font-light">
        {title}
      </h3>

      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </animated.div>
  )
})

Feature.displayName = 'Feature'

const OptimizedWhatWeDo: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const titleSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(30px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(30px)'
    },
    config: config.gentle
  })

  const features = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
          <path d="M20 5L5 15v10l15 10 15-10V15L20 5z" stroke="currentColor" fill="none" strokeWidth="2"/>
        </svg>
      ),
      title: "Excel Automation",
      description: "Transform manual spreadsheet workflows that take hours into automated AI systems that complete in minutes with zero errors."
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
          <circle cx="20" cy="20" r="15" stroke="currentColor" fill="none" strokeWidth="2"/>
          <path d="M20 10v10l7 7" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "System Integration",
      description: "Connect your disconnected systems with intelligent AI bridges. No rip-and-replace, just smart connections that make everything work together."
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
          <rect x="10" y="10" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"/>
          <path d="M15 20l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      ),
      title: "AI Implementation",
      description: "Production-ready AI solutions built with enterprise-grade AI platforms. We analyze years of data in seconds for truly intelligent implementations."
    }
  ]

  return (
    <section
      ref={ref}
      className="py-20 lg:py-32 bg-gray-900"
      id="what-we-do"
      aria-label="What We Do"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <animated.div
          className="text-center mb-16"
          style={titleSpring}
        >
          <h2 className="text-4xl md:text-5xl font-light mb-8">What is Candlefish AI?</h2>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
            We make your business systems smarter and faster using AI. Think of us as translators
            between cutting-edge AI technology and your daily operations.
          </p>
        </animated.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {features.map((feature, index) => (
            <Feature
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
              inView={inView}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  )
})

OptimizedWhatWeDo.displayName = 'OptimizedWhatWeDo'

export default OptimizedWhatWeDo
