'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavRoute {
  path: string
  label: string
  index: string
}

const routes: NavRoute[] = [
  { path: '/', label: 'Atelier', index: '001' },
  { path: '/manifesto', label: 'Manifesto', index: '002' },
  { path: '/workshop', label: 'Workshop', index: '003' },
  { path: '/instruments', label: 'Instruments', index: '004' },
  { path: '/queue', label: 'Queue', index: '005' },
  { path: '/archive', label: 'Archive', index: '006' },
]

const NavigationRail: React.FC = () => {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {/* Desktop Navigation Rail */}
      <nav className="hidden lg:block fixed left-0 top-0 h-screen w-[72px] bg-atelier-structure/50 border-r border-ink-primary/10 z-40">
        <div className="flex flex-col h-full">
          {/* Logo Mark */}
          <div className="h-[72px] flex items-center justify-center border-b border-ink-primary/10">
            <Link href="/" className="group">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="transition-transform duration-200 group-hover:scale-110"
              >
                {/* Minimalist Candlefish Mark */}
                <rect
                  x="8"
                  y="8"
                  width="16"
                  height="16"
                  stroke="rgb(var(--ink-primary))"
                  strokeWidth="1.5"
                  className="transition-all duration-200 group-hover:stroke-[rgb(var(--operation-active))]"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="3"
                  fill="rgb(var(--ink-primary))"
                  className="transition-all duration-200 group-hover:fill-[rgb(var(--operation-active))]"
                />
              </svg>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-8">
            {routes.map((route, i) => {
              const isActive = pathname === route.path
              const isHovered = hoveredIndex === i

              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className="block relative group"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    animationDelay: mounted ? `${i * 50}ms` : '0ms'
                  }}
                >
                  <div
                    className={`
                      h-[56px] flex items-center justify-center relative
                      transition-all duration-200
                      ${mounted ? 'animate-fade-up' : 'opacity-0'}
                    `}
                  >
                    {/* Active/Hover Indicator */}
                    <div
                      className={`
                        absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px]
                        bg-operation-active transition-all duration-200
                        ${isActive ? 'opacity-100' : 'opacity-0'}
                        ${isHovered && !isActive ? 'opacity-50' : ''}
                      `}
                    />

                    {/* Index Number */}
                    <span
                      className={`
                        type-xs font-mono transition-all duration-200
                        ${isActive ? 'text-ink-primary' : 'text-ink-tertiary'}
                        ${isHovered && !isActive ? 'text-ink-secondary' : ''}
                      `}
                    >
                      {route.index}
                    </span>

                    {/* Label Tooltip */}
                    <div
                      className={`
                        absolute left-[72px] top-1/2 -translate-y-1/2
                        px-3 py-1 bg-ink-primary text-atelier-canvas
                        type-sm whitespace-nowrap pointer-events-none
                        transition-all duration-200
                        ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                      `}
                    >
                      {route.label}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* System Pulse */}
          <div className="h-[144px] border-t border-ink-primary/10 p-4">
            <SystemPulse />
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Horizontal Bar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-[56px] bg-atelier-structure/90 backdrop-blur-sm border-b border-ink-primary/10 z-40">
        <div className="h-full flex items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="8" y="8" width="16" height="16" stroke="rgb(var(--ink-primary))" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="3" fill="rgb(var(--ink-primary))" />
            </svg>
            <span className="type-sm font-display text-ink-primary">CANDLEFISH</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="p-2"
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="rgb(var(--ink-primary))" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  )
}

// System Pulse Component - Shows live activity
const SystemPulse: React.FC = () => {
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col justify-center items-center">
      {/* Pulse Visualization */}
      <div className="relative w-full h-[40px]">
        {Array.from({ length: 8 }).map((_, i) => {
          const height = Math.sin((pulse / 10) + (i * 0.5)) * 20 + 20
          return (
            <div
              key={i}
              className="absolute bottom-0 bg-operation-active/30 transition-all duration-100"
              style={{
                left: `${i * 12.5}%`,
                width: '10%',
                height: `${height}px`,
              }}
            />
          )
        })}
      </div>

      {/* Status Text */}
      <div className="mt-4">
        <span className="type-xs font-mono text-ink-tertiary">
          ACTIVE
        </span>
      </div>
    </div>
  )
}

export default NavigationRail
