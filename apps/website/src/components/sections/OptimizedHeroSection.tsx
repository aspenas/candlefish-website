import React, { useCallback } from 'react'
import { useSpring, animated, config } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const OptimizedHeroSection: React.FC = React.memo(() => {
  const prefersReducedMotion = useReducedMotion()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  // Badge animation
  const badgeSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(20px)'
    },
    delay: prefersReducedMotion ? 0 : 200,
    config: config.gentle
  })

  // Title animation
  const titleSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(30px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(30px)'
    },
    delay: prefersReducedMotion ? 0 : 400,
    config: config.gentle
  })

  // Subtitle animation
  const subtitleSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(30px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(30px)'
    },
    delay: prefersReducedMotion ? 0 : 600,
    config: config.gentle
  })

  // CTA animation
  const ctaSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: {
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0px)' : 'translateY(20px)'
    },
    delay: prefersReducedMotion ? 0 : 800,
    config: config.gentle
  })

  // Button hover animation
  const [buttonHover, setButtonHover] = useSpring(() => ({
    scale: 1,
    x: 0,
    config: config.wobbly
  }))

  const handleMouseEnter = useCallback(() => {
    if (!prefersReducedMotion) {
      setButtonHover({ scale: 1.05, x: 5 })
    }
  }, [setButtonHover, prefersReducedMotion])

  const handleMouseLeave = useCallback(() => {
    setButtonHover({ scale: 1, x: 0 })
  }, [setButtonHover])

  // Parallax effect for background
  const [parallax, setParallax] = useSpring(() => ({
    y: 0,
    config: { mass: 10, tension: 200, friction: 50 }
  }))

  React.useEffect(() => {
    if (prefersReducedMotion) return

    const handleScroll = () => {
      const scrolled = window.pageYOffset
      setParallax({ y: scrolled * 0.5 })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [setParallax, prefersReducedMotion])

  return (
    <section
      ref={ref}
      className="hero-section relative min-h-screen flex items-center overflow-hidden"
      aria-label="Hero Section"
    >
      {/* Optimized Grid Background */}
      <animated.div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: parallax.y.to(y => `translateY(${y * 0.1}px)`),
          willChange: 'transform'
        }}
        aria-hidden="true"
      >
        <svg
          width="100%"
          height="100%"
          className="opacity-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </animated.div>

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        <div className="text-center">
          {/* Validation Badge */}
          <animated.div
            style={badgeSpring}
            className="inline-block"
          >
            <span className="inline-block border border-teal-400 text-teal-400 px-6 py-2 text-xs font-mono tracking-wider uppercase">
              VALIDATION PHASE
            </span>
          </animated.div>

          {/* Main Title */}
          <animated.h1
            style={titleSpring}
            className="text-5xl md:text-6xl lg:text-7xl font-light leading-tight mt-8 mb-6"
          >
            Illuminating the path to{' '}
            <span className="text-teal-400">AI transformation</span>
          </animated.h1>

          {/* Subtitle */}
          <animated.p
            style={subtitleSpring}
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          >
            We turn your slowest business processes into your fastest competitive advantages
            through discrete, composable AI modules.
          </animated.p>

          {/* CTA Button */}
          <animated.div style={ctaSpring}>
            <animated.a
              href="#contact"
              className="inline-flex items-center gap-3 px-8 py-4 bg-teal-400 text-black font-medium transition-colors duration-200 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black"
              style={{
                transform: buttonHover.scale.to(s => `scale(${s})`),
                willChange: 'transform'
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onFocus={handleMouseEnter}
              onBlur={handleMouseLeave}
            >
              <span>Explore Partnership</span>
              <animated.svg
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{
                  transform: buttonHover.x.to(x => `translateX(${x}px)`)
                }}
              >
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </animated.svg>
            </animated.a>
          </animated.div>
        </div>
      </div>
    </section>
  )
})

OptimizedHeroSection.displayName = 'OptimizedHeroSection'

export default OptimizedHeroSection
