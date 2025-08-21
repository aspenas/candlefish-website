'use client'

import React, { useEffect, useState } from 'react'

// Real-time project status
const getCurrentFocus = () => {
  const projects = [
    {
      active: true,
      verb: 'engineering',
      description: 'engraving automation for a trophy franchise network',
      sectors: ['retail', 'manufacturing'],
      acceptingInquiries: false,
      nextWindow: 'December 2025'
    }
  ]
  return projects[0]
}

export default function OperationalHome() {
  const [mounted, setMounted] = useState(false)
  const [currentFocus, setCurrentFocus] = useState(getCurrentFocus())
  const [systemPulse, setSystemPulse] = useState(0)
  const queueLength = 7
  const maxQueueSize = 50

  useEffect(() => {
    setMounted(true)

    // System pulse animation
    const pulseInterval = setInterval(() => {
      setSystemPulse(prev => (prev + 1) % 100)
    }, 50)

    return () => clearInterval(pulseInterval)
  }, [])

  return (
    <>
      {/* HERO: Operational Statement */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03]"
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
               }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
          {/* Wordmark */}
          <div className="mb-20">
            <span className="text-[#3FD3C6] text-sm tracking-[0.3em] uppercase font-light">
              Operational Design Atelier
            </span>
          </div>

          {/* Dynamic statement */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
            {currentFocus.active ? (
              <>
                Currently {currentFocus.verb}
                <br />
                <span className="text-[#415A77]">{currentFocus.description}</span>
              </>
            ) : (
              <>Systems at capacity through {currentFocus.nextWindow}</>
            )}
          </h1>

          {/* Supporting context */}
          <p className="mt-8 text-2xl text-[#415A77] max-w-2xl font-light leading-relaxed">
            We architect operational systems for businesses that refuse to accept inefficiency.
            {currentFocus.active && ` Active in ${currentFocus.sectors.join(', ')}.`}
          </p>

          {/* Status-driven action */}
          <div className="mt-16">
            {currentFocus.acceptingInquiries ? (
              <button className="group relative inline-block">
                <span className="text-[#E0E1DD] border border-[#415A77] px-8 py-4 inline-block
                               hover:border-[#3FD3C6] transition-all duration-500">
                  Request Consideration
                  <span className="ml-3 opacity-50 text-sm">
                    Position {queueLength + 1} of {maxQueueSize}
                  </span>
                </span>
              </button>
            ) : (
              <div className="text-[#415A77]">
                <span className="block text-sm uppercase tracking-wider mb-2">Next Opening</span>
                <span className="text-2xl text-[#E0E1DD] font-light">{currentFocus.nextWindow}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Operations Display */}
        <div className="absolute bottom-8 right-8 w-96 hidden lg:block">
          <LiveSystemPulse pulse={systemPulse} />
        </div>
      </section>

      {/* CURRENT OPERATIONS */}
      <section className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-16">
            Operational Reality
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Active Systems */}
            <div className="card-operational">
              <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
                Active Systems
              </div>
              <div className="text-5xl font-light text-[#F8F8F2] mb-2">3</div>
              <div className="text-[#415A77] text-sm">
                Crown Trophy · Paintbox · PromoterOS
              </div>
            </div>

            {/* Queue Position */}
            <div className="card-operational">
              <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
                Queue Length
              </div>
              <div className="text-5xl font-light text-[#F8F8F2] mb-2">{queueLength}</div>
              <div className="text-[#415A77] text-sm">
                Organizations awaiting consideration
              </div>
            </div>

            {/* Next Window */}
            <div className="card-operational">
              <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
                Next Window
              </div>
              <div className="text-5xl font-light text-[#F8F8F2] mb-2">Q4</div>
              <div className="text-[#415A77] text-sm">
                2025 · December consideration
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-28 bg-[#1B263B]/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-light text-[#F8F8F2] mb-12">
            The workshop operates on principles,
            <br />
            not compromises.
          </h2>

          <div className="space-y-6">
            <p className="text-2xl text-[#E0E1DD] leading-relaxed font-light">
              Excellence emerges from constraint. We maintain strict operational
              limits not as a limitation, but as a design principle. Each system
              we craft receives total focus, undivided attention, and relentless
              refinement.
            </p>
            <p className="text-2xl text-[#E0E1DD] leading-relaxed font-light">
              Our queue exists not to create artificial scarcity, but to ensure
              each engagement receives the depth of thought and precision of
              execution it demands. We measure success not in volume, but in the
              transformative impact of each operational system we deliver.
            </p>
          </div>

          <blockquote className="mt-16 pl-6 border-l-2 border-[#3FD3C6]">
            <p className="text-3xl font-light text-[#F8F8F2] leading-tight">
              "Excellence is never an accident. It is always the result of high
              intention, sincere effort, and intelligent execution."
            </p>
          </blockquote>
        </div>
      </section>

      {/* SYSTEM ARCHITECTURE */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-16">
            System Architecture
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h3 className="text-2xl font-light text-[#F8F8F2] mb-6">
                Current Build: Engraving Automation Platform
              </h3>
              <p className="text-xl text-[#E0E1DD] mb-8 leading-relaxed font-light">
                276 items taking 45+ minutes manually. AI-powered extraction
                from customer files. Building a system that could serve all
                150 Crown Trophy franchises nationwide.
              </p>

              <dl className="space-y-4">
                <div className="flex justify-between py-2 border-b border-[#415A77]/30">
                  <dt className="text-[#415A77] text-sm uppercase tracking-wider">Duration</dt>
                  <dd className="text-[#E0E1DD]">12-16 weeks</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#415A77]/30">
                  <dt className="text-[#415A77] text-sm uppercase tracking-wider">Components</dt>
                  <dd className="text-[#E0E1DD]">AI document parsing</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#415A77]/30">
                  <dt className="text-[#415A77] text-sm uppercase tracking-wider">Time Recovery</dt>
                  <dd className="text-[#E0E1DD]">45 min → under 1 min</dd>
                </div>
              </dl>
            </div>

            <div className="relative">
              <SystemVisualization />
            </div>
          </div>
        </div>
      </section>

      {/* ENGAGEMENT */}
      <section className="py-28 bg-[#1B263B]/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-12">
            Engagement Protocol
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">
                Selection Criteria
              </h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                We accept three collaborations per quarter. Selection is based on problem
                complexity, operational readiness, and mutual interest in craft excellence.
                We're particularly interested in expanding our work with non-profit organizations
                alongside our for-profit engagements.
              </p>
            </div>

            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">
                Process Timeline
              </h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                Initial diagnostic (2 weeks) → System design (4 weeks) →
                Implementation (6-8 weeks) → Evolution support (ongoing).
              </p>
            </div>

            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">
                Investment Range
              </h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                $125,000 to $400,000 per system, depending on scope
                and complexity. Payment structured as monthly craft fees, not hourly rates.
              </p>
            </div>
          </div>

          <div className="mt-16">
            <button className="btn-primary">
              Request Consideration for Q1 2026
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

// Live System Pulse Component
const LiveSystemPulse: React.FC<{ pulse: number }> = ({ pulse }) => {
  return (
    <div className="bg-[#1B263B]/50 backdrop-blur-sm border border-[#415A77]/30 p-6">
      <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
        System Activity
      </div>

      {/* Pulse visualization */}
      <div className="h-20 flex items-end gap-1">
        {Array.from({ length: 20 }).map((_, i) => {
          const height = Math.sin((pulse / 10) + (i * 0.3)) * 40 + 40
          return (
            <div
              key={i}
              className="flex-1 bg-[#3FD3C6]/30 transition-all duration-100"
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>

      <div className="mt-4 flex justify-between text-xs">
        <span className="text-[#415A77]">Operational</span>
        <span className="text-[#3FD3C6]">94% Capacity</span>
      </div>
    </div>
  )
}

// System Visualization Component
const SystemVisualization: React.FC = () => {
  return (
    <div className="bg-[#1B263B]/30 border border-[#415A77]/30 p-8 h-96">
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Workflow nodes */}
        {[
          { x: 50, y: 50, label: 'Intake' },
          { x: 150, y: 50, label: 'Validation' },
          { x: 250, y: 50, label: 'Processing' },
          { x: 350, y: 50, label: 'Delivery' },
          { x: 100, y: 150, label: 'Inventory' },
          { x: 200, y: 150, label: 'Engraving' },
          { x: 300, y: 150, label: 'Assembly' },
          { x: 150, y: 250, label: 'QA' },
          { x: 250, y: 250, label: 'Shipping' }
        ].map((node, i) => (
          <g key={i}>
            <circle
              cx={node.x}
              cy={node.y}
              r="20"
              fill="none"
              stroke="#3FD3C6"
              strokeWidth="1"
              opacity="0.5"
            />
            <text
              x={node.x}
              y={node.y + 35}
              textAnchor="middle"
              className="fill-[#415A77] text-[10px]"
            >
              {node.label}
            </text>
          </g>
        ))}

        {/* Connections */}
        <path
          d="M 70 50 L 130 50 M 170 50 L 230 50 M 270 50 L 330 50"
          stroke="#415A77"
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M 150 70 L 100 130 M 200 70 L 200 130 M 250 70 L 300 130"
          stroke="#415A77"
          strokeWidth="1"
          opacity="0.3"
        />
        <path
          d="M 100 170 L 150 230 M 300 170 L 250 230"
          stroke="#415A77"
          strokeWidth="1"
          opacity="0.3"
        />
      </svg>
    </div>
  )
}
