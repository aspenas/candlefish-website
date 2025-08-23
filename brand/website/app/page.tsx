'use client'

import React, { useEffect, useState, Suspense, lazy } from 'react'
import Link from 'next/link'
import HeaderText from '../components/HeaderText'
import SystemActivity from '../components/SystemActivity'
import SystemArchitecture from '../components/SystemArchitecture'

// Lazy load visualizations for better initial performance with error boundary
const OperationalCraft = lazy(() =>
  import('../components/visuals/OperationalCraft').catch(() => ({
    default: () => <div className="text-[#415A77] text-xs">Visualization unavailable</div>
  }))
)

export default function OperationalHomepage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="relative">
      {/* System Activity Bar */}
      <SystemActivity />

      {/* Hero Section */}
      <section className="min-h-screen relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32">
          {/* Badge */}
          <div className="mb-20">
            <span className="text-[#3FD3C6] text-sm tracking-[0.3em] uppercase font-light">
              Operational Design Atelier
            </span>
          </div>

          {/* Main Headline with dynamic project rotation */}
          <HeaderText />

          {/* Subtext */}
          <p className="mt-8 text-2xl text-[#415A77] max-w-2xl font-light leading-relaxed">
            We architect operational systems for businesses that refuse to accept inefficiency. Active in retail, manufacturing.
          </p>

          {/* Next Opening */}
          <div className="mt-16">
            <div className="text-[#415A77]">
              <span className="block text-sm uppercase tracking-wider mb-2">Next Opening</span>
              <span className="text-2xl text-[#E0E1DD] font-light">December 2025</span>
            </div>
          </div>
        </div>

        {/* Operational Craft Visualization - Forward-looking design */}
        <div className="absolute bottom-8 right-8 w-[400px] h-[200px] hidden lg:block">
          <div className="bg-[#1B263B]/30 backdrop-blur-sm border border-[#415A77]/20 overflow-hidden">
            {isClient && (
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-[#415A77] text-xs font-mono">INITIALIZING...</div>
                </div>
              }>
                <OperationalCraft />
              </Suspense>
            )}
          </div>
        </div>
      </section>

      {/* Operational Reality Section */}
      <section className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-16">Operational Reality</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-operational">
              <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
                Active Systems
              </div>
              <div className="text-5xl font-light text-[#F8F8F2] mb-2">3</div>
              <div className="text-[#415A77] text-sm">
                Crown Trophy · Paintbox · PromoterOS
              </div>
            </div>
            <div className="card-operational">
              <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
                Queue Length
              </div>
              <div className="text-5xl font-light text-[#F8F8F2] mb-2">7</div>
              <div className="text-[#415A77] text-sm">
                Organizations awaiting consideration
              </div>
            </div>
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

      {/* Philosophy Section */}
      <section className="py-28 bg-[#1B263B]/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-light text-[#F8F8F2] mb-12">
            The workshop operates on principles,<br />not compromises.
          </h2>
          <div className="space-y-6">
            <p className="text-2xl text-[#E0E1DD] leading-relaxed font-light">
              Excellence emerges from constraint. We maintain strict operational limits not as a limitation,
              but as a design principle. Each system we craft receives total focus, undivided attention,
              and relentless refinement.
            </p>
            <p className="text-2xl text-[#E0E1DD] leading-relaxed font-light">
              Our queue exists not to create artificial scarcity, but to ensure each engagement receives
              the depth of thought and precision of execution it demands. We measure success not in volume,
              but in the transformative impact of each operational system we deliver.
            </p>
          </div>
          <blockquote className="mt-16 pl-6 border-l-2 border-[#3FD3C6]">
            <p className="text-3xl font-light text-[#F8F8F2] leading-tight">
              "Excellence is never an accident. It is always the result of high intention,
              sincere effort, and intelligent execution."
            </p>
          </blockquote>
        </div>
      </section>

      {/* System Architecture Section */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-16">System Architecture</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h3 className="text-2xl font-light text-[#F8F8F2] mb-6">
                Current Build: Engraving Automation Platform
              </h3>
              <p className="text-xl text-[#E0E1DD] mb-8 leading-relaxed font-light">
                276 items taking 45+ minutes manually. AI-powered extraction from customer files.
                Building a system that could serve all 150 Crown Trophy franchises nationwide.
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

            {/* NANDA-style System Architecture Visualization */}
            <div className="relative h-[400px] bg-[#1B263B]/20 border border-[#415A77]/20 overflow-hidden">
              {isClient && (
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-[#415A77] text-xs font-mono animate-pulse">LOADING ARCHITECTURE...</div>
                  </div>
                }>
                  <SystemArchitecture />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Engagement Protocol Section */}
      <section className="py-28 bg-[#1B263B]/30">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-12">Engagement Protocol</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">Selection Criteria</h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                We accept three collaborations per quarter. Selection is based on problem complexity,
                operational readiness, and mutual interest in craft excellence. We're particularly
                interested in expanding our work with non-profit organizations alongside our for-profit engagements.
              </p>
            </div>
            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">Process Timeline</h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                Initial diagnostic (2 weeks) → System design (4 weeks) → Implementation (6-8 weeks) → Evolution support (ongoing).
              </p>
            </div>
            <div>
              <h3 className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-3">Investment Range</h3>
              <p className="text-xl text-[#E0E1DD] font-light leading-relaxed">
                $125,000 to $400,000 per system, depending on scope and complexity.
                Payment structured as monthly craft fees, not hourly rates.
              </p>
            </div>
          </div>
          <div className="mt-16">
            <Link
              href="/consideration"
              className="inline-flex items-center px-8 py-4 bg-[#3FD3C6] text-[#0D1B2A] font-light hover:bg-[#3FD3C6]/90 transition-colors"
            >
              Request Consideration for Q1 2026
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
