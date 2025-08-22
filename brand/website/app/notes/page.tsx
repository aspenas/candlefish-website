'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// Field journal entries - raw observations from builds
const fieldNotes = [
  {
    id: 'excel-truth-source',
    date: '2025.08.20',
    version: 'v1.2',
    title: 'Excel as Truth Source',
    category: 'patterns',
    context: 'Paintbox estimation engine',
    fragment: 'Excel files contain more operational intelligence than databases. Cell colors encode warnings. Hidden columns hide history. Formula evolution tells the story of business logic emerging over time.',
    observations: [
      'Teams trust Excel because they control it',
      'Fighting Excel creates resistance',
      'Building around Excel creates adoption',
      'Formula = business rule that evolved'
    ],
    codeSnippet: `
# Don't replace Excel, shadow it
df = pd.read_excel(path, sheet_name=None)
for sheet_name, data in df.items():
    # Preserve everything, even formatting
    data.to_sql(f'excel_{sheet_name}',
                if_exists='replace',
                index=True)  # Row numbers matter`,
    citations: [
      'Paintbox: 14,382 formulas preserved',
      'Crown Trophy: Excel as master inventory',
      'Kind Home: Color-coded workflow states'
    ],
    revisions: [
      { version: 'v1.2', date: '2025.08.20', change: 'Added code example' },
      { version: 'v1.1', date: '2025.08.18', change: 'Expanded observations' },
      { version: 'v1.0', date: '2025.08.15', change: 'Initial observation' }
    ]
  },
  {
    id: 'failure-as-data',
    date: '2025.08.18',
    version: 'v1.0',
    title: 'Failures Are Data Points',
    category: 'methodology',
    context: 'Crown Trophy OCR attempts',
    fragment: 'Every failed approach teaches constraints. OCR at 62% accuracy on handwriting taught us to build fallback queues. Memory overflow at 150 items taught streaming architecture. Failures map the problem space.',
    observations: [
      'Document every failure with metrics',
      'Failure patterns reveal true constraints',
      'Quick failures > slow successes',
      'Failed code becomes test cases'
    ],
    codeSnippet: null,
    citations: [
      'Crown Trophy: 3 failures → streaming solution',
      'Paintbox: 7 failures → offline-first design',
      'PromoterOS: 2 failures → multi-signal fusion'
    ],
    revisions: [
      { version: 'v1.0', date: '2025.08.18', change: 'Initial observation' }
    ]
  },
  {
    id: 'offline-first-reality',
    date: '2025.08.16',
    version: 'v2.0',
    title: 'Offline-First Is Non-Negotiable',
    category: 'architecture',
    context: 'Paintbox field deployment',
    fragment: 'Job sites have no WiFi. Basements have no signal. The moment you require connectivity, you lose. Build everything to work offline, sync when possible. This constraint shapes everything.',
    observations: [
      'Service workers insufficient for iOS',
      'Local-first requires 10x more engineering',
      'Sync conflicts are inevitable',
      'Users prefer local speed over cloud features'
    ],
    codeSnippet: `
// CRDT-based conflict resolution
const merged = {
  sets: mergeORSets(local, remote),
  counters: mergePNCounters(local, remote),
  text: mergeRGA(local, remote)
}`,
    citations: [
      'Paintbox: 100% offline calculation',
      'Construction sites: Zero connectivity norm',
      'iOS Safari: Service worker limitations'
    ],
    revisions: [
      { version: 'v2.0', date: '2025.08.16', change: 'Added CRDT approach' },
      { version: 'v1.0', date: '2025.08.10', change: 'Initial observation' }
    ]
  },
  {
    id: 'hidden-queues',
    date: '2025.08.14',
    version: 'v1.1',
    title: 'Hidden Queue Patterns',
    category: 'patterns',
    context: 'Multiple client observations',
    fragment: 'Every business has queues they don\'t acknowledge. "We handle everything immediately" means a hidden pile. Find the pile. That\'s where the system breaks. That\'s where automation helps most.',
    observations: [
      'The phrase "we don\'t have queues" = red flag',
      'Hidden queues cause most stress',
      'Making queues visible reduces anxiety',
      'Queue metrics drive improvement'
    ],
    codeSnippet: null,
    citations: [
      'Crown Trophy: "Quick jobs" pile = 45min backlog',
      'Paintbox: "Urgent estimates" folder',
      'Kind Home: Unnamed Monday morning rush'
    ],
    revisions: [
      { version: 'v1.1', date: '2025.08.14', change: 'Added specific examples' },
      { version: 'v1.0', date: '2025.08.12', change: 'Pattern identified' }
    ]
  },
  {
    id: 'api-rate-limits',
    date: '2025.08.12',
    version: 'v1.3',
    title: 'API Rate Limits Shape Architecture',
    category: 'constraints',
    context: 'PromoterOS social data aggregation',
    fragment: 'Instagram: 200/hour. Spotify: 180/min. TikTok: Scraping only. These limits define your architecture more than your requirements do. Build for the limits, not the ideal.',
    observations: [
      'Cache everything aggressively',
      'Batch requests when possible',
      'Build scrapers as fallbacks',
      'Rate limits change without warning'
    ],
    codeSnippet: `
class RateLimitedAPI:
    def __init__(self, limit_per_hour):
        self.limit = limit_per_hour
        self.window = deque(maxlen=limit_per_hour)

    async def request(self, endpoint):
        await self.wait_if_needed()
        return await self.execute(endpoint)`,
    citations: [
      'Instagram API: Changed 3x in 2 months',
      'TikTok: No official API for metrics',
      'Spotify: Only stable API in stack'
    ],
    revisions: [
      { version: 'v1.3', date: '2025.08.12', change: 'Added rate limiter code' },
      { version: 'v1.2', date: '2025.08.10', change: 'Updated limits' },
      { version: 'v1.1', date: '2025.08.08', change: 'Added TikTok note' },
      { version: 'v1.0', date: '2025.08.05', change: 'Initial limits documented' }
    ]
  },
  {
    id: 'complexity-hiding',
    date: '2025.08.10',
    version: 'v1.0',
    title: 'Complexity Hiding Is Design',
    category: 'philosophy',
    context: 'All projects',
    fragment: 'Users should never see: dependency graphs, compilation steps, sync algorithms, retry logic. They should see: it works. The highest craft is invisible. Complexity hiding is the design.',
    observations: [
      'Exposed complexity = failed abstraction',
      'Users trust simple interfaces',
      'Hide the magic, show the result',
      'Progress bars lie productively'
    ],
    codeSnippet: null,
    citations: [
      'Paintbox: 14k formulas → "Calculate" button',
      'Crown Trophy: ML pipeline → "Process" button',
      'Offline sync → "Saved" indicator'
    ],
    revisions: [
      { version: 'v1.0', date: '2025.08.10', change: 'Core principle documented' }
    ]
  },
  {
    id: 'versioning-everything',
    date: '2025.08.08',
    version: 'v1.2',
    title: 'Version Everything',
    category: 'methodology',
    context: 'System design principles',
    fragment: 'Version your code. Version your data. Version your formulas. Version your schemas. Version your configs. Versioning is time travel. Debugging without history is archaeology.',
    observations: [
      'Git for code is not enough',
      'Data needs version control too',
      'Schema migrations must be reversible',
      'Version numbers tell stories'
    ],
    codeSnippet: `
# Every data change is versioned
{
  "data": {...},
  "version": "2.3.1",
  "previous": "2.3.0",
  "timestamp": "2025-08-08T10:30:00Z",
  "change": "Fixed rounding in tax calculation"
}`,
    citations: [
      'Paintbox formulas: 47 versions tracked',
      'Database migrations: All reversible',
      'Config files: Git history essential'
    ],
    revisions: [
      { version: 'v1.2', date: '2025.08.08', change: 'Added JSON example' },
      { version: 'v1.1', date: '2025.08.06', change: 'Expanded observations' },
      { version: 'v1.0', date: '2025.08.04', change: 'Initial principle' }
    ]
  }
]

export default function FieldJournal() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({})
  const [showCode, setShowCode] = useState<{ [key: string]: boolean }>({})

  const categories = ['all', 'patterns', 'methodology', 'architecture', 'constraints', 'philosophy']

  const filteredNotes = selectedCategory === 'all'
    ? fieldNotes
    : fieldNotes.filter(note => note.category === selectedCategory)

  const toggleExpanded = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleCode = (id: string) => {
    setShowCode(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      <header className="border-b border-[#333] px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/" className="text-xs text-[#888] hover:text-[#fff]">
                ← Back to Codex
              </Link>
              <h1 className="text-lg text-[#fff] mt-2">Field Journal</h1>
              <p className="text-xs text-[#666] mt-1">
                Raw observations. Unfiltered learnings. Version controlled thoughts.
              </p>
            </div>
            <Link
              href="/rss"
              className="text-xs text-[#ff9500] hover:text-[#ffb143] border border-[#ff9500] px-3 py-1"
            >
              RSS Feed
            </Link>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 flex-wrap text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 border transition-colors ${
                selectedCategory === cat
                  ? 'border-[#fff] text-[#fff]'
                  : 'border-[#333] text-[#888] hover:border-[#666]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Notes List */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="space-y-8">
          {filteredNotes.map(note => (
            <article key={note.id} className="border border-[#333] p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg text-[#fff] mb-1">{note.title}</h2>
                  <div className="flex gap-3 text-xs">
                    <span className="text-[#666]">{note.date}</span>
                    <span className="px-2 py-0.5 bg-[#1a1a1a] border border-[#333]">
                      {note.version}
                    </span>
                    <span className="text-[#888]">{note.category}</span>
                    {note.context && (
                      <span className="text-[#ff9500]">Context: {note.context}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleExpanded(note.id)}
                  className="text-xs text-[#6666ff] hover:text-[#8888ff]"
                >
                  {expandedNotes[note.id] ? 'Collapse' : 'Expand'}
                </button>
              </div>

              {/* Fragment */}
              <div className="mb-4">
                <p className="text-sm text-[#d4d4d4] leading-relaxed">
                  {note.fragment}
                </p>
              </div>

              {/* Expanded Content */}
              {expandedNotes[note.id] && (
                <>
                  {/* Observations */}
                  <div className="mb-4">
                    <h3 className="text-xs uppercase text-[#888] mb-2">Observations</h3>
                    <ul className="space-y-1 text-xs">
                      {note.observations.map((obs, i) => (
                        <li key={i} className="text-[#aaa]">• {obs}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Code Snippet */}
                  {note.codeSnippet && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleCode(note.id)}
                        className="text-xs text-[#6666ff] hover:text-[#8888ff] mb-2"
                      >
                        {showCode[note.id] ? 'Hide' : 'Show'} Code
                      </button>
                      {showCode[note.id] && (
                        <pre className="p-2 bg-[#1a1a1a] text-xs overflow-x-auto">
                          <code>{note.codeSnippet.trim()}</code>
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Citations */}
                  <div className="mb-4">
                    <h3 className="text-xs uppercase text-[#888] mb-2">Citations</h3>
                    <ul className="space-y-1 text-xs">
                      {note.citations.map((cite, i) => (
                        <li key={i} className="text-[#6666ff]">→ {cite}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Revision History */}
                  <div>
                    <h3 className="text-xs uppercase text-[#888] mb-2">Revisions</h3>
                    <div className="space-y-1 text-xs">
                      {note.revisions.map((rev, i) => (
                        <div key={i} className="flex gap-4 text-[#666]">
                          <span className="text-[#aaa]">{rev.version}</span>
                          <span>{rev.date}</span>
                          <span className="text-[#888]">{rev.change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* RSS Info */}
      <footer className="border-t border-[#333] px-6 py-6">
        <div className="max-w-6xl mx-auto text-xs text-[#666]">
          <p>
            Subscribe via RSS for updates when new observations are documented.
            No schedule. Published when learned.
          </p>
        </div>
      </footer>
    </main>
  )
}
