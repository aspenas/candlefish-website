'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { fieldNotes } from '@/data/notes/field-notes'
import type { FieldNote } from '@/data/notes/types'
import { ArtifactsStrip } from '@/components/ArtifactsStrip'

// Memoized sub-components for better performance
const NotesHeader = memo(() => (
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
))
NotesHeader.displayName = 'NotesHeader'

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

const NoteCard = memo(({ note }: { note: FieldNote }) => {
  const [expanded, setExpanded] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  const toggleCode = useCallback(() => {
    setShowCode(prev => !prev)
  }, [])

  return (
    <article className="border border-[#333] p-6">
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
          onClick={toggleExpanded}
          className="text-xs text-[#6666ff] hover:text-[#8888ff]"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Fragment */}
      <div className="mb-4">
        <p className="text-sm text-[#d4d4d4] leading-relaxed">
          {note.fragment}
        </p>
      </div>

      {/* Expanded Content */}
      {expanded && (
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
                onClick={toggleCode}
                className="text-xs text-[#6666ff] hover:text-[#8888ff] mb-2"
              >
                {showCode ? 'Hide' : 'Show'} Code
              </button>
              {showCode && (
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
  )
})
NoteCard.displayName = 'NoteCard'

const NotesFooter = memo(() => (
  <footer className="border-t border-[#333] px-6 py-6">
    <div className="max-w-6xl mx-auto text-xs text-[#666]">
      <p>
        Subscribe via RSS for updates when new observations are documented.
        No schedule. Published when learned.
      </p>
    </div>
  </footer>
))
NotesFooter.displayName = 'NotesFooter'

export default function FieldJournal() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Memoize categories array
  const categories = useMemo(() =>
    ['all', 'patterns', 'methodology', 'architecture', 'constraints', 'philosophy'],
    []
  )

  // Memoize filtered notes
  const filteredNotes = useMemo(() => {
    return selectedCategory === 'all'
      ? fieldNotes
      : fieldNotes.filter(note => note.category === selectedCategory)
  }, [selectedCategory])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono">
      <NotesHeader />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Notes List */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="space-y-8">
          {filteredNotes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      </section>

      {/* Artifacts Strip */}
      <ArtifactsStrip />

      <NotesFooter />
    </main>
  )
}
