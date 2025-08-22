'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { instruments } from '../../data/instruments/instruments-data'
import type { Instrument } from '../../data/instruments/types'

// Memoized sub-components for better performance
const InstrumentsHeader = memo(() => (
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
))
InstrumentsHeader.displayName = 'InstrumentsHeader'

const CategoryFilter = memo(({
  categories,
  selectedCategory,
  onCategoryChange
}: {
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
}) => (
  <section className="max-w-6xl mx-auto px-6 py-6">
    <div className="flex gap-2 flex-wrap text-xs">
      {categories.map(cat => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat)}
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
))
CategoryFilter.displayName = 'CategoryFilter'

const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'production': return 'text-[#00ff00] border-[#00ff00]'
      case 'testing': return 'text-[#ffff00] border-[#ffff00]'
      case 'calibrating': return 'text-[#ff9500] border-[#ff9500]'
      default: return 'text-[#888] border-[#888]'
    }
  }, [])

  return (
    <span className={`px-2 py-0.5 border ${getStatusColor(status)}`}>
      {status}
    </span>
  )
})
StatusBadge.displayName = 'StatusBadge'

const InstrumentCard = memo(({ instrument }: { instrument: Instrument }) => {
  const [showCode, setShowCode] = useState(false)

  const toggleCode = useCallback(() => {
    setShowCode(prev => !prev)
  }, [])

  return (
    <article className="border border-[#333] p-6 hover:border-[#666] transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg text-[#fff]">{instrument.name}</h2>
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-[#666]">{instrument.version}</span>
            <StatusBadge status={instrument.status} />
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
          onClick={toggleCode}
          className="text-xs text-[#6666ff] hover:text-[#8888ff]"
        >
          {showCode ? 'Hide' : 'Show'} Sample
        </button>

        {showCode && (
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
  )
})
InstrumentCard.displayName = 'InstrumentCard'

export default function InstrumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Memoize categories array
  const categories = useMemo(() =>
    ['all', 'parsers', 'extractors', 'ml-models', 'orchestration', 'synchronization', 'analysis'],
    []
  )

  // Memoize filtered instruments
  const filteredInstruments = useMemo(() => {
    return selectedCategory === 'all'
      ? instruments
      : instruments.filter(i => i.category === selectedCategory)
  }, [selectedCategory])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      <InstrumentsHeader />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Instruments Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredInstruments.map(instrument => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </div>
      </section>
    </main>
  )
}
