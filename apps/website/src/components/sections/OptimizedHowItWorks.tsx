import React, { useState, useEffect } from 'react'
import { useSpring, animated, config, useTrail } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface ProcessStepProps {
  title: string
  subtitle: string
  isActive: boolean
  index: number
  inView: boolean
  prefersReducedMotion: boolean
}

const ProcessStep: React.FC<ProcessStepProps> = React.memo(({
  title,
  subtitle,
  isActive,
  index,
  inView,
  prefersReducedMotion
}) => {
  const spring = useSpring({
    from: {
      opacity: 0,
      transform: 'translateX(-20px) scale(0.9)',
      borderColor: 'rgba(55, 65, 81, 1)'
    },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateX(0px) scale(1)' : 'translateX(-20px) scale(0.9)',
      borderColor: isActive ? 'rgba(0, 206, 209, 1)' : 'rgba(55, 65, 81, 1)'
    },
    delay: prefersReducedMotion ? 0 : 200 + (index * 150),
    config: config.gentle
  })

  const activeSpring = useSpring({
    scale: isActive ? 1.05 : 1,
    shadowOpacity: isActive ? 0.3 : 0,
    config: config.wobbly
  })

  return (
    <animated.div
      className={`flex-shrink-0 px-8 py-6 bg-black border-2 font-mono text-sm text-center min-w-[150px] relative ${
        isActive ? 'text-teal-400' : 'text-white'
      }`}
      style={{
        opacity: spring.opacity,
        transform: spring.transform.to(
          t => `${t} scale(${activeSpring.scale.get()})`
        ),
        borderColor: spring.borderColor,
        boxShadow: activeSpring.shadowOpacity.to(
          o => `0 10px 30px rgba(0, 206, 209, ${o})`
        ),
        willChange: 'transform, opacity, border-color, box-shadow'
      }}
    >
      <div>{title}</div>
      <div className="text-xs text-gray-400 mt-1">
        {subtitle}
      </div>
    </animated.div>
  )
})

ProcessStep.displayName = 'ProcessStep'

const Arrow: React.FC<{ index: number; inView: boolean; prefersReducedMotion: boolean }> = React.memo(({
  index,
  inView,
  prefersReducedMotion
}) => {
  const spring = useSpring({
    from: { opacity: 0, transform: 'scale(0)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'scale(1)' : 'scale(0)'
    },
    delay: prefersReducedMotion ? 0 : 350 + (index * 150),
    config: config.gentle
  })

  return (
    <animated.div
      className="text-gray-400 text-xl flex-shrink-0"
      style={spring}
      aria-hidden="true"
    >
      →
    </animated.div>
  )
})

Arrow.displayName = 'Arrow'

const OptimizedHowItWorks: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  })

  const [activeStep, setActiveStep] = useState(0)

  // Auto-advance active step
  useEffect(() => {
    if (!inView || prefersReducedMotion) return

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4)
    }, 3000)

    return () => clearInterval(interval)
  }, [inView, prefersReducedMotion])

  const titleSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(30px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(30px)'
    },
    config: config.gentle
  })

  const steps = [
    { title: "Identify", subtitle: "Biggest Pain Point" },
    { title: "Build", subtitle: "Working Prototype" },
    { title: "Deploy", subtitle: "To Production" },
    { title: "Measure", subtitle: "Real Results" }
  ]

  return (
    <section
      ref={ref}
      className="py-20 lg:py-32 bg-black"
      id="how-it-works"
      aria-label="How It Works"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <animated.div
          className="text-center mb-16"
          style={titleSpring}
        >
          <h2 className="text-4xl md:text-5xl font-light mb-6">The Candlefish Method</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We deliver working software in weeks, not months. Every solution includes
            the "why" along with the "how."
          </p>
        </animated.div>

        <div
          className="flex items-center justify-center gap-8 py-12 px-6 bg-gray-900 border border-gray-700 overflow-x-auto"
          role="list"
          aria-label="Process steps"
        >
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <ProcessStep
                title={step.title}
                subtitle={step.subtitle}
                isActive={activeStep === index}
                index={index}
                inView={inView}
                prefersReducedMotion={prefersReducedMotion}
              />
              {index < steps.length - 1 && (
                <Arrow
                  index={index}
                  inView={inView}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
})

OptimizedHowItWorks.displayName = 'OptimizedHowItWorks'

export default OptimizedHowItWorks
