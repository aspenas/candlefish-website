'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

// System version tracking
const CODEX_VERSION = 'v0.3.2'
const LAST_UPDATED = '2025.08.22'

// Active research logs
const activeResearch = [
  {
    id: 'crown-trophy-automation',
    title: 'Engraving Automation System',
    version: 'v0.2.1',
    status: 'active-research',
    problemStatement: 'Manual engraving order processing taking 45+ minutes per batch',
    currentApproach: 'AI document parsing → Corel Draw pipeline',
    lastUpdate: '2025.08.20',
    failures: 3,
    breakthroughs: 1,
    changelogUrl: '/workshop/crown-trophy#changelog'
  },
  {
    id: 'paintbox-estimation',
    title: 'Paint Estimation Engine',
    version: 'v1.3.0',
    status: 'field-testing',
    problemStatement: '14,000+ Excel formulas requiring manual maintenance',
    currentApproach: 'Formula transpilation with offline-first architecture',
    lastUpdate: '2025.08.19',
    failures: 7,
    breakthroughs: 4,
    changelogUrl: '/workshop/paintbox#changelog'
  },
  {
    id: 'promoteros-intelligence',
    title: 'Concert Demand Prediction',
    version: 'v0.8.0',
    status: 'calibrating',
    problemStatement: 'Venue booking based on intuition rather than data',
    currentApproach: 'Multi-signal demand mapping with social velocity tracking',
    lastUpdate: '2025.08.15',
    failures: 2,
    breakthroughs: 2,
    changelogUrl: '/workshop/promoteros#changelog'
  }
]

export default function CodexLedger() {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      {/* Header: Codex identification */}
      <header className="border-b border-[#333] px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-baseline">
          <div>
            <h1 className="text-sm uppercase tracking-wider text-[#888]">
              Candlefish.ai Research Codex
            </h1>
            <div className="text-xs text-[#666] mt-1">
              Version {CODEX_VERSION} · Updated {LAST_UPDATED}
            </div>
          </div>
          <nav className="text-xs space-x-6">
            <Link href="/workshop" className="hover:text-[#fff] transition-colors">
              Workshop Logs
            </Link>
            <Link href="/instruments" className="hover:text-[#fff] transition-colors">
              Instruments
            </Link>
            <Link href="/assessment" className="hover:text-[#fff] transition-colors">
              Assessment v{CODEX_VERSION}
            </Link>
            <Link href="/notes" className="hover:text-[#fff] transition-colors">
              Field Notes
            </Link>
            <Link href="/annotations" className="hover:text-[#fff] transition-colors">
              Annotations
            </Link>
            <Link href="/rss" className="text-[#ff9500] hover:text-[#ffb143] transition-colors">
              RSS
            </Link>
          </nav>
        </div>
      </header>

      {/* NOW BUILDING: Active research index */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs uppercase tracking-wider text-[#888] mb-8">
            NOW BUILDING · {mounted && currentTime.toISOString().split('T')[0]}
          </h2>

          <div className="space-y-8">
            {activeResearch.map((project) => (
              <article key={project.id} className="border border-[#333] p-6 hover:border-[#666] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg text-[#fff] mb-1">
                      {project.title}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs bg-[#1a1a1a] border border-[#333]">
                      {project.version}
                    </span>
                    <span className={`inline-block ml-2 px-2 py-1 text-xs border ${
                      project.status === 'active-research'
                        ? 'border-[#00ff00] text-[#00ff00]'
                        : project.status === 'field-testing'
                        ? 'border-[#ffff00] text-[#ffff00]'
                        : 'border-[#ff9500] text-[#ff9500]'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#666]">
                    Last: {project.lastUpdate}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-[#888]">Problem:</span>
                    <p className="text-[#d4d4d4] mt-1">{project.problemStatement}</p>
                  </div>

                  <div>
                    <span className="text-[#888]">Current Approach:</span>
                    <p className="text-[#d4d4d4] mt-1">{project.currentApproach}</p>
                  </div>

                  <div className="flex gap-6 pt-2">
                    <span className="text-[#ff4444]">
                      Failures: {project.failures}
                    </span>
                    <span className="text-[#44ff44]">
                      Breakthroughs: {project.breakthroughs}
                    </span>
                    <Link
                      href={project.changelogUrl}
                      className="text-[#6666ff] hover:text-[#8888ff] transition-colors"
                    >
                      View Changelog →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* System Stats */}
      <section className="px-6 py-12 border-t border-[#333]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs uppercase tracking-wider text-[#888] mb-6">
            Codex Statistics
          </h2>

          <div className="grid grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-[#666]">Total Instruments</div>
              <div className="text-2xl text-[#fff]">23</div>
            </div>
            <div>
              <div className="text-[#666]">Workshop Logs</div>
              <div className="text-2xl text-[#fff]">147</div>
            </div>
            <div>
              <div className="text-[#666]">Field Notes</div>
              <div className="text-2xl text-[#fff]">89</div>
            </div>
            <div>
              <div className="text-[#666]">Open Problems</div>
              <div className="text-2xl text-[#fff]">12</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="px-6 py-12 border-t border-[#333]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xs uppercase tracking-wider text-[#888] mb-6">
            Recent Activity
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex gap-4">
              <span className="text-[#666]">2025.08.22 14:32</span>
              <span className="text-[#44ff44]">UPDATE</span>
              <span>Crown Trophy: Document parser achieving 94% accuracy</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[#666]">2025.08.22 09:15</span>
              <span className="text-[#ff4444]">FAILURE</span>
              <span>PromoterOS: Social velocity calculation overflow on Taylor Swift dataset</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[#666]">2025.08.21 16:44</span>
              <span className="text-[#ffff00]">NOTE</span>
              <span>Published: "Excel as Truth Source" field observation</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[#666]">2025.08.21 11:28</span>
              <span className="text-[#44ff44]">BREAKTHROUGH</span>
              <span>Paintbox: Offline sync maintaining 100% formula accuracy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-[#333] text-xs text-[#666]">
        <div className="max-w-6xl mx-auto flex justify-between">
          <div>
            Public research archive. No client data. Tool patterns only.
          </div>
          <div>
            <Link href="/annotations/philosophy" className="hover:text-[#888] transition-colors">
              Why we build in public →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
