'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// Technical instrument specifications
const instruments = [
  {
    id: 'excel-parser-v2',
    name: 'Excel Formula Parser',
    version: 'v2.3.1',
    category: 'parsers',
    status: 'production',
    lastUpdated: '2025.08.20',
    inputs: [
      'Excel files (.xlsx, .xls)',
      'Formula strings',
      'Cell references'
    ],
    methods: [
      'AST generation',
      'Dependency graph resolution',
      'Circular reference detection',
      'Formula compilation to JS'
    ],
    outputs: [
      'JavaScript functions',
      'Dependency map',
      'Calculation order',
      'Error diagnostics'
    ],
    limitations: [
      'Array formulas limited to 10k cells',
      'No support for Excel 365 dynamic arrays',
      'VBA macros not processed',
      'External references not resolved'
    ],
    sampleCode: `
// Input: Excel formula
const formula = "=IF(A1>100,VLOOKUP(B1,Sheet2!A:C,3,FALSE),SUM(C1:C10))"

// Output: Compiled JavaScript
function calculate(cells) {
  if (cells.A1 > 100) {
    return vlookup(cells.B1, cells.Sheet2.range('A:C'), 3, false);
  } else {
    return sum(cells.range('C1:C10'));
  }
}`,
    performance: {
      'Parse Speed': '~1000 formulas/second',
      'Compile Time': '< 50ms per formula',
      'Memory Usage': '~100KB per 1000 formulas',
      'Accuracy': '99.97%'
    }
  },
  {
    id: 'document-ocr-v1',
    name: 'Multi-modal Document OCR',
    version: 'v1.8.0',
    category: 'extractors',
    status: 'testing',
    lastUpdated: '2025.08.18',
    inputs: [
      'PDF documents',
      'Scanned images',
      'Handwritten forms',
      'Mixed media files'
    ],
    methods: [
      'Tesseract OCR',
      'Azure Form Recognizer',
      'Custom CNN for handwriting',
      'Layout analysis'
    ],
    outputs: [
      'Structured text',
      'Confidence scores',
      'Bounding boxes',
      'Field mappings'
    ],
    limitations: [
      'Cursive handwriting < 70% accuracy',
      'Requires 300 DPI minimum',
      'Damaged documents fail',
      'Non-Latin scripts unsupported'
    ],
    sampleCode: `
# Multi-strategy OCR pipeline
def extract_text(document):
    strategies = [
        ('structured_pdf', extract_pdf_text),
        ('ocr_printed', tesseract_ocr),
        ('handwriting', azure_form_recognizer),
        ('fallback', manual_queue)
    ]

    for name, strategy in strategies:
        if strategy.can_handle(document):
            result = strategy.extract(document)
            return {
                'text': result.text,
                'confidence': result.confidence,
                'method': name
            }`,
    performance: {
      'Processing Speed': '~2 pages/second',
      'Printed Accuracy': '98%',
      'Handwriting Accuracy': '84%',
      'Memory Usage': '500MB peak'
    }
  },
  {
    id: 'demand-predictor-v0',
    name: 'Concert Demand Predictor',
    version: 'v0.9.2',
    category: 'ml-models',
    status: 'calibrating',
    lastUpdated: '2025.08.15',
    inputs: [
      'Spotify streaming data',
      'Instagram engagement',
      'TikTok viral metrics',
      'Historical ticket sales'
    ],
    methods: [
      'Time series analysis',
      'Social velocity tracking',
      'Geographic clustering',
      'Ensemble prediction'
    ],
    outputs: [
      'Demand score (0-100)',
      'Confidence interval',
      'Regional heat map',
      'Optimal venue size'
    ],
    limitations: [
      'New artists < 50% accuracy',
      'Genre-specific biases',
      'API rate limits',
      'Historical data required'
    ],
    sampleCode: `
class DemandPredictor:
    def predict(self, artist_id):
        signals = {
            'spotify': self.get_spotify_velocity(artist_id),
            'instagram': self.get_instagram_growth(artist_id),
            'tiktok': self.get_tiktok_viral_score(artist_id)
        }

        # Weighted ensemble
        weights = self.get_platform_weights(artist_id)
        score = sum(s * w for s, w in zip(signals.values(), weights))

        return {
            'demand_score': score,
            'confidence': self.calculate_confidence(signals),
            'recommended_capacity': self.map_to_venue_size(score)
        }`,
    performance: {
      'Prediction Time': '< 200ms',
      'Accuracy (established)': '78%',
      'Accuracy (emerging)': '52%',
      'Data Sources': '5 APIs'
    }
  },
  {
    id: 'workflow-orchestrator-v1',
    name: 'Async Workflow Orchestrator',
    version: 'v1.2.0',
    category: 'orchestration',
    status: 'production',
    lastUpdated: '2025.08.10',
    inputs: [
      'Task definitions',
      'Dependency graphs',
      'Resource constraints',
      'Priority weights'
    ],
    methods: [
      'Topological sorting',
      'Resource allocation',
      'Deadlock detection',
      'Failure recovery'
    ],
    outputs: [
      'Execution plan',
      'Task schedule',
      'Resource utilization',
      'Performance metrics'
    ],
    limitations: [
      'Max 1000 concurrent tasks',
      'No distributed execution',
      'Memory-bound scheduling',
      'Static priority only'
    ],
    sampleCode: `
// Workflow execution engine
class WorkflowOrchestrator {
  async execute(workflow) {
    const graph = this.buildDependencyGraph(workflow);
    const schedule = this.topologicalSort(graph);

    const executor = new TaskExecutor({
      maxConcurrency: 10,
      retryPolicy: exponentialBackoff(),
      timeout: 30000
    });

    for (const batch of schedule) {
      await Promise.all(
        batch.map(task => executor.run(task))
      );
    }
  }
}`,
    performance: {
      'Scheduling Time': 'O(V + E)',
      'Max Throughput': '1000 tasks/min',
      'Recovery Time': '< 5 seconds',
      'Memory per Task': '~10KB'
    }
  },
  {
    id: 'sync-engine-v2',
    name: 'Conflict-free Sync Engine',
    version: 'v2.1.0',
    category: 'synchronization',
    status: 'production',
    lastUpdated: '2025.08.12',
    inputs: [
      'Local state changes',
      'Remote state changes',
      'Conflict resolution rules',
      'Version vectors'
    ],
    methods: [
      'CRDT merging',
      'Vector clock comparison',
      'Three-way merge',
      'Operational transformation'
    ],
    outputs: [
      'Merged state',
      'Conflict report',
      'Sync status',
      'Version history'
    ],
    limitations: [
      'Max 100MB sync payload',
      'Text-only CRDT support',
      'No binary merge',
      'Requires stable IDs'
    ],
    sampleCode: `
// CRDT-based sync
class ConflictFreeSync {
  merge(local, remote) {
    const clock = VectorClock.max(local.clock, remote.clock);

    // Apply CRDTs
    const merged = {
      sets: this.mergeORSets(local.sets, remote.sets),
      counters: this.mergePNCounters(local.counters, remote.counters),
      text: this.mergeRGA(local.text, remote.text),
      clock: clock.increment(this.nodeId)
    };

    return this.resolveCustomRules(merged);
  }
}`,
    performance: {
      'Merge Time': 'O(n log n)',
      'Conflict Resolution': '100% automatic',
      'Bandwidth': '~10KB per sync',
      'Sync Frequency': 'Every 30s'
    }
  },
  {
    id: 'pattern-analyzer-v1',
    name: 'Operational Pattern Analyzer',
    version: 'v1.5.3',
    category: 'analysis',
    status: 'production',
    lastUpdated: '2025.08.22',
    inputs: [
      'Process logs',
      'Time series data',
      'User interactions',
      'System metrics'
    ],
    methods: [
      'Sequence mining',
      'Anomaly detection',
      'Clustering',
      'Correlation analysis'
    ],
    outputs: [
      'Pattern catalog',
      'Bottleneck report',
      'Optimization hints',
      'Anomaly alerts'
    ],
    limitations: [
      'Requires 30 days history',
      'Sensitive to outliers',
      'No real-time analysis',
      'Limited to numeric data'
    ],
    sampleCode: `
# Pattern discovery pipeline
def analyze_patterns(logs):
    # Extract sequences
    sequences = extract_sequences(logs)

    # Mine frequent patterns
    patterns = PrefixSpan(min_support=0.05).fit(sequences)

    # Identify bottlenecks
    bottlenecks = find_bottlenecks(patterns, threshold=0.8)

    # Generate optimization hints
    return {
        'patterns': patterns.frequent_patterns(),
        'bottlenecks': bottlenecks,
        'optimizations': suggest_optimizations(bottlenecks)
    }`,
    performance: {
      'Analysis Time': '~5 min/GB',
      'Pattern Accuracy': '92%',
      'False Positive Rate': '< 5%',
      'Memory Usage': '2GB max'
    }
  }
]

export default function InstrumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null)
  const [showCode, setShowCode] = useState<{ [key: string]: boolean }>({})

  const categories = ['all', 'parsers', 'extractors', 'ml-models', 'orchestration', 'synchronization', 'analysis']

  const filteredInstruments = selectedCategory === 'all'
    ? instruments
    : instruments.filter(i => i.category === selectedCategory)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'text-[#00ff00] border-[#00ff00]'
      case 'testing': return 'text-[#ffff00] border-[#ffff00]'
      case 'calibrating': return 'text-[#ff9500] border-[#ff9500]'
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
          <h1 className="text-lg text-[#fff] mt-2">Technical Instruments</h1>
          <p className="text-xs text-[#666] mt-1">
            Inputs → Methods → Outputs. No magic. Just tools.
          </p>
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

      {/* Instruments Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredInstruments.map(instrument => (
            <article
              key={instrument.id}
              className="border border-[#333] p-6 hover:border-[#666] transition-colors"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg text-[#fff]">{instrument.name}</h2>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-[#666]">{instrument.version}</span>
                    <span className={`px-2 py-0.5 border ${getStatusColor(instrument.status)}`}>
                      {instrument.status}
                    </span>
                    <span className="text-[#666]">Updated: {instrument.lastUpdated}</span>
                  </div>
                </div>
              </div>

              {/* I/O Specification */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
                <div>
                  <h3 className="text-[#888] uppercase mb-2">Inputs</h3>
                  <ul className="space-y-1">
                    {instrument.inputs.map((input, i) => (
                      <li key={i} className="text-[#aaa]">• {input}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[#888] uppercase mb-2">Methods</h3>
                  <ul className="space-y-1">
                    {instrument.methods.map((method, i) => (
                      <li key={i} className="text-[#aaa]">• {method}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[#888] uppercase mb-2">Outputs</h3>
                  <ul className="space-y-1">
                    {instrument.outputs.map((output, i) => (
                      <li key={i} className="text-[#aaa]">• {output}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Sample Code */}
              <div className="mb-4">
                <button
                  onClick={() => setShowCode({
                    ...showCode,
                    [instrument.id]: !showCode[instrument.id]
                  })}
                  className="text-xs text-[#6666ff] hover:text-[#8888ff]"
                >
                  {showCode[instrument.id] ? 'Hide' : 'Show'} Sample
                </button>

                {showCode[instrument.id] && (
                  <pre className="mt-2 p-2 bg-[#1a1a1a] text-xs overflow-x-auto">
                    <code>{instrument.sampleCode.trim()}</code>
                  </pre>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="mb-4">
                <h3 className="text-xs text-[#888] uppercase mb-2">Performance</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(instrument.performance).map(([metric, value]) => (
                    <div key={metric} className="flex justify-between">
                      <span className="text-[#666]">{metric}:</span>
                      <span className="text-[#aaa]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div>
                <h3 className="text-xs text-[#888] uppercase mb-2">Known Limitations</h3>
                <ul className="text-xs space-y-1">
                  {instrument.limitations.map((limit, i) => (
                    <li key={i} className="text-[#ff9944]">• {limit}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
