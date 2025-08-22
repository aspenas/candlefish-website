'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// Philosophy linked to actual implementation
const annotations = [
  {
    id: 'build-in-public',
    principle: 'Why We Build in Public',
    linkedBuilds: ['crown-trophy-v0.2.1', 'paintbox-v1.3.0'],
    annotation: `
Public failure accelerates learning. When Crown Trophy's OCR hit 62% accuracy,
we documented it. Three other builders shared similar failures. One had a solution.
Building in private protects ego. Building in public protects time.

Every failure teaches constraints. Every constraint shapes design. Design emerges
from reality, not theory. Public building makes reality visible.
    `,
    evidence: [
      'Crown Trophy: 3 public failures led to streaming architecture',
      'Paintbox: Open formula compiler attracted 2 contributors',
      'PromoterOS: Public API limits shaped caching strategy'
    ],
    counterpoint: 'Client data stays private. Patterns go public.',
    lastUpdated: '2025.08.22'
  },
  {
    id: 'tools-not-solutions',
    principle: 'We Build Tools, Not Solutions',
    linkedBuilds: ['excel-parser-v2.3.1', 'sync-engine-v2.1.0'],
    annotation: `
A solution solves one problem for one context. A tool solves a class of problems
across contexts. Excel parser handles any Excel. Sync engine handles any conflict.
Tools compose. Solutions don't.

When Paintbox needed Excel parsing, we didn't build a Paintbox parser. We built
an Excel parser Paintbox could use. Now Crown Trophy uses it too.
    `,
    evidence: [
      'Excel parser: Used by 3 different systems',
      'Sync engine: 5 implementations across projects',
      'OCR pipeline: Modular strategies, not monolithic system'
    ],
    counterpoint: 'Sometimes a specific solution is the right tool.',
    lastUpdated: '2025.08.20'
  },
  {
    id: 'failure-first-design',
    principle: 'Design for Failure, Not Success',
    linkedBuilds: ['document-ocr-v1.8.0', 'workflow-orchestrator-v1.2.0'],
    annotation: `
Success is one path. Failure has infinite paths. Design for the infinite case.
Every component assumes failure. Retries, fallbacks, queues, manual overrides.
The happy path is narrow. The failure space is vast.

OCR will fail. Networks will drop. APIs will throttle. Users will input garbage.
Design assumes these truths. Success becomes a pleasant surprise.
    `,
    evidence: [
      'OCR: Fallback queue for unreadable documents',
      'Sync: CRDT merge handles all conflicts automatically',
      'Workflow: Every task has retry and timeout policies'
    ],
    counterpoint: 'Over-engineering for unlikely failures wastes resources.',
    lastUpdated: '2025.08.18'
  },
  {
    id: 'constraints-as-features',
    principle: 'Constraints Are Features',
    linkedBuilds: ['offline-sync', 'api-rate-limiter'],
    annotation: `
Paintbox works offline because job sites lack WiFi. This constraint became the
feature. Now it's faster than cloud competitors because it doesn't wait for networks.
Constraints force innovation.

API rate limits forced caching. Caching made everything faster. Memory limits
forced streaming. Streaming enabled scale. Every constraint, properly embraced,
becomes competitive advantage.
    `,
    evidence: [
      'Offline-first: 10x faster than cloud solutions',
      'Rate limits: Forced predictive caching, improved UX',
      'Memory constraints: Streaming handles unlimited scale'
    ],
    counterpoint: 'Some constraints genuinely limit possibility.',
    lastUpdated: '2025.08.16'
  },
  {
    id: 'evolution-not-revolution',
    principle: 'Evolution Over Revolution',
    linkedBuilds: ['all'],
    annotation: `
Revolutionary systems fail because they fight reality. Evolutionary systems succeed
because they accept reality and improve it incrementally. Excel isn't replaced,
it's augmented. Workflows aren't disrupted, they're streamlined.

Every successful system we've built started by accepting what exists. Understanding
why it exists. Respecting the intelligence embedded in current practice. Then, and
only then, suggesting gentle improvements.
    `,
    evidence: [
      'Excel integration: Preserved 100% of existing workflows',
      'Crown Trophy: Works alongside existing Corel Draw process',
      'Assessment tool: Augments human judgment, doesn\'t replace it'
    ],
    counterpoint: 'Some systems need revolutionary change.',
    lastUpdated: '2025.08.14'
  },
  {
    id: 'complexity-hiding',
    principle: 'The Highest Craft Is Invisible',
    linkedBuilds: ['paintbox-ui', 'crown-trophy-ui'],
    annotation: `
Users should see: a button that works. They should not see: dependency graphs,
compilation steps, retry logic, sync algorithms. Complexity hiding is the craft.
The more complex the system, the simpler the interface must be.

14,000 formulas become one "Calculate" button. Machine learning pipelines become
one "Process" button. Months of engineering become milliseconds of experience.
    `,
    evidence: [
      'Paintbox: 14,382 formulas → single button',
      'Crown Trophy: ML + OCR + parsing → "Process"',
      'Sync engine: CRDT complexity → "Saved" indicator'
    ],
    counterpoint: 'Some users want to see the complexity.',
    lastUpdated: '2025.08.10'
  },
  {
    id: 'versioning-as-time-travel',
    principle: 'Version Everything',
    linkedBuilds: ['all'],
    annotation: `
Code has Git. Data needs versioning too. Every formula change. Every schema migration.
Every configuration. Versioning is time travel. When something breaks, you need to
know not just what changed, but why, when, and by whom.

Version numbers tell stories. v0.1.0 to v0.2.0 signals features. v1.0.0 to v1.0.1
signals fixes. v1.x to v2.0 signals breaking changes. The story matters.
    `,
    evidence: [
      'Formula versions: 47 tracked versions, all reversible',
      'Schema migrations: Every change bidirectional',
      'API versions: Breaking changes = major version bump'
    ],
    counterpoint: 'Over-versioning creates noise.',
    lastUpdated: '2025.08.08'
  },
  {
    id: 'real-problems-only',
    principle: 'Solve Real Problems, Not Theoretical Ones',
    linkedBuilds: ['all'],
    annotation: `
We don't build for problems that might exist. We build for problems that do exist,
that someone is losing sleep over, that cost money every day. Theoretical problems
have theoretical solutions. Real problems have real constraints that shape real solutions.

Every system in our workshop exists because someone, somewhere, was doing something
manually that hurt. Not might hurt. Did hurt. Daily.
    `,
    evidence: [
      'Crown Trophy: 45 minutes of daily pain',
      'Paintbox: Version conflicts costing deals',
      'PromoterOS: Venue bookings based on gut feeling'
    ],
    counterpoint: 'Anticipating future problems prevents crisis.',
    lastUpdated: '2025.08.05'
  }
]

export default function AnnotationsPage() {
  const [expandedAnnotations, setExpandedAnnotations] = useState<{ [key: string]: boolean }>({})

  const toggleExpanded = (id: string) => {
    setExpandedAnnotations(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      <header className="border-b border-[#333] px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-xs text-[#888] hover:text-[#fff]">
            ← Back to Codex
          </Link>
          <h1 className="text-lg text-[#fff] mt-2">Annotations</h1>
          <p className="text-xs text-[#666] mt-1">
            Philosophy linked to builds. Principles with evidence. Marginalia, not manifesto.
          </p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {annotations.map(item => (
            <article key={item.id} className="border border-[#333] p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg text-[#fff]">{item.principle}</h2>
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="text-xs text-[#6666ff] hover:text-[#8888ff]"
                >
                  {expandedAnnotations[item.id] ? 'Collapse' : 'Read'}
                </button>
              </div>

              {/* Linked Builds */}
              <div className="mb-4 text-xs">
                <span className="text-[#888]">Linked builds: </span>
                {item.linkedBuilds.map((build, i) => (
                  <span key={i}>
                    <Link
                      href={`/workshop#${build}`}
                      className="text-[#6666ff] hover:text-[#8888ff]"
                    >
                      {build}
                    </Link>
                    {i < item.linkedBuilds.length - 1 && ', '}
                  </span>
                ))}
              </div>

              {/* Annotation Text */}
              <div className="mb-4">
                <pre className="whitespace-pre-wrap text-sm text-[#d4d4d4] leading-relaxed font-mono">
                  {item.annotation.trim()}
                </pre>
              </div>

              {/* Expanded Content */}
              {expandedAnnotations[item.id] && (
                <>
                  {/* Evidence */}
                  <div className="mb-4">
                    <h3 className="text-xs uppercase text-[#888] mb-2">Evidence</h3>
                    <ul className="space-y-1 text-xs">
                      {item.evidence.map((ev, i) => (
                        <li key={i} className="text-[#44ff44]">✓ {ev}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Counterpoint */}
                  <div className="mb-4">
                    <h3 className="text-xs uppercase text-[#888] mb-2">Counterpoint</h3>
                    <p className="text-xs text-[#ff9944]">{item.counterpoint}</p>
                  </div>

                  {/* Last Updated */}
                  <div className="text-xs text-[#666]">
                    Last updated: {item.lastUpdated}
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Philosophy Note */}
      <footer className="border-t border-[#333] px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs text-[#666]">
            These aren't universal truths. They're patterns we've observed in our specific work.
            Your patterns may differ. That's the point.
          </p>
        </div>
      </footer>
    </main>
  )
}
