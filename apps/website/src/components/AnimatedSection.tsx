import React, { ReactNode } from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

interface AnimatedSectionProps {
  children: ReactNode
  id?: string
  className?: string
  animationType?: 'fade-up' | 'fade-scale' | 'fade-left' | 'fade-right'
  delay?: string
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  id,
  className = '',
  animationType = 'fade-up',
  delay = '0s'
}) => {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true
  })

  const animationClass = `scroll-animate${animationType.includes('scale') ? '-scale' : ''}`

  return (
    <section
      ref={elementRef as React.RefObject<HTMLElement>}
      id={id}
      className={`${animationClass} ${isVisible ? 'visible' : ''} ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </section>
  )
}

export default AnimatedSection