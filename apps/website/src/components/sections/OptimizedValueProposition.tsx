import React from 'react'
import { useSpring, animated, config, useTrail } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface ValueCardProps {
  metric: string
  label: string
  index: number
  inView: boolean
  prefersReducedMotion: boolean
}

const ValueCard: React.FC<ValueCardProps> = React.memo(({
  metric,
  label,
  index,
  inView,
  prefersReducedMotion
}) => {
  const spring = useSpring({
    from: {
      opacity: 0,
      transform: 'translateY(40px) scale(0.9)',
      borderColor: 'rgba(107, 114, 128, 1)'
    },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px) scale(1)' : 'translateY(40px) scale(0.9)',
      borderColor: 'rgba(107, 114, 128, 1)'
    },
    delay: prefersReducedMotion ? 0 : 100 + (index * 100),
    config: config.gentle
  })

  const [hoverSpring, setHoverSpring] = useSpring(() => ({
    y: 0,
    borderColor: 'rgba(107, 114, 128, 1)',
    shadowOpacity: 0,
    config: config.wobbly
  }))

  const handleMouseEnter = () => {
    if (!prefersReducedMotion) {
      setHoverSpring({
        y: -8,
        borderColor: 'rgba(0, 206, 209, 1)',
        shadowOpacity: 0.1
      })
    }
  }

  const handleMouseLeave = () => {
    setHoverSpring({
      y: 0,
      borderColor: 'rgba(107, 114, 128, 1)',
      shadowOpacity: 0
    })
  }

  return (
    <animated.div
      className="bg-gray-800 border p-8 text-center cursor-pointer"
      style={{
        opacity: spring.opacity,
        transform: spring.transform.to(t => `${t} translateY(${hoverSpring.y.get()}px)`),
        borderColor: hoverSpring.borderColor,
        boxShadow: hoverSpring.shadowOpacity.to(
          o => `0 20px 40px rgba(0, 206, 209, ${o})`
        ),
        willChange: 'transform, opacity, border-color, box-shadow'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
      role="article"
      aria-label={`${metric} ${label}`}
    >
      <animated.div
        className="text-5xl lg:text-6xl font-mono text-teal-400 mb-2"
        style={{
          transform: hoverSpring.y.to(y => `translateY(${y * 0.5}px)`)
        }}
      >
        {metric}
      </animated.div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </animated.div>
  )
})

ValueCard.displayName = 'ValueCard'

const OptimizedValueProposition: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.2
  })

  const values = [
    { metric: "Instant", label: "System Analysis" },
    { metric: "90%", label: "Time Reduction" },
    { metric: "Fast", label: "Delivery" },
    { metric: "Zero", label: "Systems Replaced" }
  ]

  return (
    <section
      ref={ref}
      className="py-20 lg:py-32 bg-black"
      aria-label="Value Proposition"
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {values.map((value, index) => (
            <ValueCard
              key={value.label}
              metric={value.metric}
              label={value.label}
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

OptimizedValueProposition.displayName = 'OptimizedValueProposition'

export default OptimizedValueProposition
