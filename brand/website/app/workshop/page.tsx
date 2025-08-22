'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// Workshop research logs with full history
const workshopLogs = [
  {
    id: 'crown-trophy',
    title: 'Crown Trophy Engraving Automation',
    version: 'v0.2.1',
    startDate: '2025.08.01',
    status: 'active-research',
    problem: {
      initial: 'Manual processing of 276 engraving items taking 45+ minutes',
      constraints: [
        'Multiple file formats (PDF, Excel, handwritten)',
        'Legacy Corel Draw integration required',
        'QuickBooks synchronization needed',
        '150 franchise locations with varying workflows'
      ],
      metrics: {
        'Current Time': '45-60 minutes',
        'Error Rate': '~8%',
        'Daily Volume': '276 items',
        'Manual Steps': '23'
      }
    },
    failures: [
      {
        date: '2025.08.03',
        version: 'v0.1.0',
        attempt: 'OCR-only approach',
        result: 'Failed: 62% accuracy on handwritten forms',
        learning: 'Need multi-modal parsing, not just OCR'
      },
      {
        date: '2025.08.07',
        version: 'v0.1.3',
        attempt: 'Direct Corel Draw API integration',
        result: 'Failed: API incompatible with v2018',
        learning: 'Must use COM automation bridge'
      },
      {
        date: '2025.08.12',
        version: 'v0.1.7',
        attempt: 'Batch processing all items',
        result: 'Failed: Memory overflow at 150+ items',
        learning: 'Implement streaming architecture'
      }
    ],
    currentSolution: {
      approach: 'Multi-stage pipeline with fallback paths',
      components: [
        {
          name: 'Document Ingestion',
          status: 'working',
          accuracy: '94%',
          code: `
# Adaptive document parser
class DocumentParser:
    def __init__(self):
        self.strategies = [
            StructuredPDFParser(),
            HandwritingOCR(),
            ExcelExtractor(),
            FallbackManualQueue()
        ]

    def parse(self, document):
        for strategy in self.strategies:
            if strategy.can_handle(document):
                return strategy.extract(document)
        return self.queue_for_manual(document)
          `
        },
        {
          name: 'Corel Draw Bridge',
          status: 'testing',
          accuracy: 'N/A',
          code: `
# COM automation for legacy Corel
import win32com.client

class CorelBridge:
    def __init__(self):
        self.app = win32com.client.Dispatch("CorelDRAW.Application")

    def engrave_text(self, text, template):
        doc = self.app.OpenDocument(template)
        shape = doc.ActiveLayer.FindShape("ENGRAVE_TEXT")
        shape.Text.Story = text
        return doc.ExportAs(f"output_{timestamp}.cdr")
          `
        }
      ]
    },
    changelog: [
      {
        version: 'v0.2.1',
        date: '2025.08.20',
        changes: [
          'ADD: Confidence scoring for parsed text',
          'FIX: Memory leak in document queue',
          'IMPROVE: Parsing speed 3x faster'
        ]
      },
      {
        version: 'v0.2.0',
        date: '2025.08.15',
        changes: [
          'BREAKTHROUGH: Streaming architecture working',
          'ADD: Real-time progress tracking',
          'ADD: Automatic error recovery'
        ]
      },
      {
        version: 'v0.1.0',
        date: '2025.08.01',
        changes: [
          'INITIAL: Project setup and exploration',
          'ADD: Basic OCR implementation',
          'ADD: Test harness with sample data'
        ]
      }
    ],
    limitations: [
      'Requires Windows for Corel Draw COM',
      'Handwriting accuracy drops below 70% for cursive',
      'Cannot process damaged PDFs',
      'QuickBooks API rate limit: 500/hour'
    ],
    nextSteps: [
      'Implement confidence threshold tuning',
      'Add multi-franchise deployment system',
      'Build fallback manual processing queue',
      'Create training mode for new formats'
    ]
  },
  {
    id: 'paintbox',
    title: 'Paintbox Estimation Engine',
    version: 'v1.3.0',
    startDate: '2025.07.01',
    status: 'production',
    problem: {
      initial: '14,000+ Excel formulas requiring manual maintenance',
      constraints: [
        'Must work offline in the field',
        'Preserve exact Excel calculation logic',
        'Integrate with Salesforce and CompanyCam',
        'Generate PDF proposals on-device'
      ],
      metrics: {
        'Formula Count': '14,382',
        'Calculation Time': '12-15 seconds',
        'Sync Failures': '~5/day',
        'Version Conflicts': '~20/week'
      }
    },
    failures: [
      {
        date: '2025.07.05',
        version: 'v0.1.0',
        attempt: 'Direct Excel-to-JS transpilation',
        result: 'Failed: Circular reference handling broken',
        learning: 'Need dependency graph resolver'
      },
      {
        date: '2025.07.12',
        version: 'v0.3.0',
        attempt: 'Cloud-only calculation',
        result: 'Failed: No connectivity at job sites',
        learning: 'Offline-first is non-negotiable'
      },
      {
        date: '2025.07.18',
        version: 'v0.5.0',
        attempt: 'SQLite formula storage',
        result: 'Failed: 10x slower than Excel',
        learning: 'Must compile formulas to native code'
      },
      {
        date: '2025.07.22',
        version: 'v0.7.0',
        attempt: 'Service worker sync',
        result: 'Failed: iOS Safari limitations',
        learning: 'Need native app wrapper'
      }
    ],
    currentSolution: {
      approach: 'Compiled formula engine with offline-first sync',
      components: [
        {
          name: 'Formula Compiler',
          status: 'production',
          accuracy: '100%',
          code: `
// Excel formula to JavaScript compiler
class FormulaCompiler {
  compile(excelFormula: string): Function {
    const ast = this.parseToAST(excelFormula);
    const optimized = this.optimizeAST(ast);
    const js = this.generateJS(optimized);
    return new Function('cells', js);
  }

  // Handles all Excel functions including:
  // VLOOKUP, SUMIFS, INDEX/MATCH, array formulas
  generateJS(ast: FormulaAST): string {
    return ast.visit(new JSCodeGenerator());
  }
}
          `
        },
        {
          name: 'Offline Sync Engine',
          status: 'production',
          accuracy: '99.9%',
          code: `
// Conflict-free offline sync
class OfflineSync {
  async sync() {
    const localChanges = await this.getLocalChanges();
    const remoteChanges = await this.fetchRemoteChanges();

    // CRDT-based merge
    const merged = this.mergeWithCRDT(
      localChanges,
      remoteChanges
    );

    await this.applyMerged(merged);
    return this.resolveConflicts(merged.conflicts);
  }
}
          `
        }
      ]
    },
    changelog: [
      {
        version: 'v1.3.0',
        date: '2025.08.10',
        changes: [
          'ADD: Automatic formula versioning',
          'FIX: iOS Safari memory management',
          'IMPROVE: Sync speed 5x faster'
        ]
      },
      {
        version: 'v1.2.0',
        date: '2025.08.01',
        changes: [
          'BREAKTHROUGH: 100% formula accuracy achieved',
          'ADD: Offline PDF generation',
          'ADD: CompanyCam photo integration'
        ]
      },
      {
        version: 'v1.0.0',
        date: '2025.07.25',
        changes: [
          'PRODUCTION: Initial production release',
          'ADD: Complete offline support',
          'ADD: Salesforce integration'
        ]
      }
    ],
    limitations: [
      'Initial sync requires 500MB download',
      'Complex array formulas 2x slower than Excel',
      'PDF generation limited to 50 pages',
      'Requires 2GB device storage'
    ],
    nextSteps: [
      'Optimize array formula performance',
      'Add formula debugging tools',
      'Implement incremental sync',
      'Build formula migration system'
    ]
  },
  {
    id: 'promoteros',
    title: 'PromoterOS Concert Intelligence',
    version: 'v0.8.0',
    startDate: '2025.07.15',
    status: 'beta-testing',
    problem: {
      initial: 'Venue booking based on gut feeling rather than data',
      constraints: [
        'Limited historical booking data',
        'Multiple data sources (social, streaming, ticket sales)',
        'Regional variation in demand signals',
        'Artist trajectory prediction needed'
      ],
      metrics: {
        'Booking Accuracy': '~60%',
        'Data Sources': '3',
        'Processing Time': '2-3 hours manual',
        'Confidence Level': 'Low'
      }
    },
    failures: [
      {
        date: '2025.07.20',
        version: 'v0.2.0',
        attempt: 'Spotify-only demand prediction',
        result: 'Failed: Regional bias not captured',
        learning: 'Need multi-platform signal fusion'
      },
      {
        date: '2025.08.02',
        version: 'v0.5.0',
        attempt: 'Historical venue data modeling',
        result: 'Failed: COVID data skewed all models',
        learning: 'Must segment pre/post pandemic'
      }
    ],
    currentSolution: {
      approach: 'Multi-signal demand fusion with velocity tracking',
      components: [
        {
          name: 'Signal Aggregator',
          status: 'testing',
          accuracy: '78%',
          code: `
# Multi-platform demand signals
class DemandSignalAggregator:
    def __init__(self):
        self.sources = {
            'spotify': SpotifyAPI(),
            'instagram': InstagramScraper(),
            'tiktok': TikTokTrends(),
            'bandsintown': BandsInTownAPI(),
            'songkick': SongkickAPI()
        }

    def calculate_velocity(self, artist_id):
        signals = {}
        for name, source in self.sources.items():
            signals[name] = source.get_momentum(artist_id)

        # Weight by platform relevance
        weighted = self.apply_weights(signals)
        return self.calculate_trajectory(weighted)
          `
        }
      ]
    },
    changelog: [
      {
        version: 'v0.8.0',
        date: '2025.08.15',
        changes: [
          'ADD: TikTok viral coefficient',
          'FIX: Instagram API rate limiting',
          'IMPROVE: Prediction accuracy to 78%'
        ]
      }
    ],
    limitations: [
      'Accuracy drops for artists with <10k followers',
      'Cannot predict one-hit-wonder phenomena',
      'Regional data limited to major markets',
      'Social platform API changes break scrapers'
    ],
    nextSteps: [
      'Add demographic clustering',
      'Implement genre-specific models',
      'Build confidence intervals',
      'Create venue capacity optimizer'
    ]
  }
]

export default function WorkshopLogs() {
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [showCode, setShowCode] = useState<{ [key: string]: boolean }>({})

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active-research': return 'text-[#00ff00] border-[#00ff00]'
      case 'production': return 'text-[#00ffff] border-[#00ffff]'
      case 'beta-testing': return 'text-[#ffff00] border-[#ffff00]'
      default: return 'text-[#888] border-[#888]'
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      <header className="border-b border-[#333] px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-xs text-[#888] hover:text-[#fff]">
            ← Back to Codex
          </Link>
          <h1 className="text-lg text-[#fff] mt-2">Workshop Logs</h1>
          <p className="text-xs text-[#666] mt-1">
            Complete build history. Failures included. No sanitization.
          </p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-8">
        {workshopLogs.map((log) => (
          <article key={log.id} className="mb-12 border border-[#333] p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl text-[#fff] mb-2">{log.title}</h2>
                <div className="flex gap-3 text-xs">
                  <span className={`px-2 py-1 border ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                  <span className="px-2 py-1 border border-[#666] text-[#aaa]">
                    {log.version}
                  </span>
                  <span className="text-[#666]">
                    Started: {log.startDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="mb-6">
              <h3 className="text-xs uppercase text-[#888] mb-2">Initial Problem</h3>
              <p className="text-sm text-[#d4d4d4] mb-3">{log.problem.initial}</p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#888]">Constraints:</span>
                  <ul className="mt-1 space-y-1">
                    {log.problem.constraints.map((c, i) => (
                      <li key={i} className="text-[#aaa]">• {c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[#888]">Initial Metrics:</span>
                  <dl className="mt-1 space-y-1">
                    {Object.entries(log.problem.metrics).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt className="text-[#666]">{k}:</dt>
                        <dd className="text-[#aaa]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>

            {/* Failures */}
            <div className="mb-6">
              <h3 className="text-xs uppercase text-[#888] mb-2">
                Failures ({log.failures.length})
              </h3>
              <div className="space-y-2">
                {log.failures.slice(0, 3).map((failure, i) => (
                  <div key={i} className="border-l-2 border-[#ff4444] pl-3 text-xs">
                    <div className="flex gap-4 text-[#888]">
                      <span>{failure.date}</span>
                      <span>{failure.version}</span>
                    </div>
                    <div className="text-[#d4d4d4] mt-1">
                      Attempt: {failure.attempt}
                    </div>
                    <div className="text-[#ff8888] mt-1">
                      {failure.result}
                    </div>
                    <div className="text-[#aaa] mt-1">
                      → {failure.learning}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Solution */}
            <div className="mb-6">
              <h3 className="text-xs uppercase text-[#888] mb-2">Current Approach</h3>
              <p className="text-sm text-[#d4d4d4] mb-3">
                {log.currentSolution.approach}
              </p>

              {log.currentSolution.components.map((comp, i) => (
                <div key={i} className="mb-4 border border-[#333] p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#fff]">{comp.name}</span>
                    <div className="flex gap-3 text-xs">
                      <span className={`px-2 py-1 border ${
                        comp.status === 'production' ? 'border-[#00ff00] text-[#00ff00]' :
                        comp.status === 'working' ? 'border-[#ffff00] text-[#ffff00]' :
                        'border-[#ff9500] text-[#ff9500]'
                      }`}>
                        {comp.status}
                      </span>
                      {comp.accuracy && (
                        <span className="text-[#888]">
                          Accuracy: {comp.accuracy}
                        </span>
                      )}
                    </div>
                  </div>

                  {comp.code && (
                    <div>
                      <button
                        onClick={() => setShowCode({
                          ...showCode,
                          [`${log.id}-${i}`]: !showCode[`${log.id}-${i}`]
                        })}
                        className="text-xs text-[#6666ff] hover:text-[#8888ff]"
                      >
                        {showCode[`${log.id}-${i}`] ? 'Hide' : 'Show'} Code
                      </button>

                      {showCode[`${log.id}-${i}`] && (
                        <pre className="mt-2 p-2 bg-[#1a1a1a] text-xs overflow-x-auto">
                          <code>{comp.code.trim()}</code>
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Changelog */}
            <div className="mb-6" id={`${log.id}-changelog`}>
              <h3 className="text-xs uppercase text-[#888] mb-2">Changelog</h3>
              <div className="space-y-3">
                {log.changelog.slice(0, 2).map((entry, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex gap-4 text-[#888]">
                      <span className="text-[#fff]">{entry.version}</span>
                      <span>{entry.date}</span>
                    </div>
                    <ul className="mt-1 space-y-1">
                      {entry.changes.map((change, j) => (
                        <li key={j} className={`
                          ${change.startsWith('ADD:') ? 'text-[#44ff44]' :
                            change.startsWith('FIX:') ? 'text-[#ff9944]' :
                            change.startsWith('IMPROVE:') ? 'text-[#4444ff]' :
                            change.startsWith('BREAKTHROUGH:') ? 'text-[#ffff00]' :
                            'text-[#aaa]'}
                        `}>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations & Next Steps */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <h3 className="uppercase text-[#888] mb-2">Known Limitations</h3>
                <ul className="space-y-1">
                  {log.limitations.map((limit, i) => (
                    <li key={i} className="text-[#ff9944]">• {limit}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="uppercase text-[#888] mb-2">Next Steps</h3>
                <ul className="space-y-1">
                  {log.nextSteps.map((step, i) => (
                    <li key={i} className="text-[#44ff44]">• {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
