'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { workshopNotes } from '@/content/workshop-notes'
import { NoteViewer } from '@/components/notes/note-viewer'
import { ShareModal } from '@/components/workshop/ShareModal'

export default function WorkshopNotes() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'technical' | 'operational' | 'philosophical'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [noteToShare, setNoteToShare] = useState<string | null>(null)

  // Handle URL-based note selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const noteId = urlParams.get('note')
      if (noteId && workshopNotes.some(note => note.id === noteId)) {
        setSelectedNote(noteId)
      }
    }
  }, [])

  const filteredNotes = workshopNotes
    .filter(note => filter === 'all' || note.category === filter)
    .filter(note => tagFilter === null || note.tags.includes(tagFilter))
    .filter(note =>
      searchTerm === '' ||
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
      {!selectedNote ? (
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-32">
          {/* Header */}
          <header className="mb-16">
            <h1 className="text-6xl font-light text-[#F8F8F2] mb-6">
              Workshop Notes
            </h1>
            <p className="text-xl text-[#415A77] leading-relaxed max-w-3xl">
              Technical explorations from operational work. Published when we
              find patterns worth documenting, not when the calendar says so.
            </p>
          </header>

          {/* Filter Bar */}
          <div className="mb-12 flex flex-wrap gap-4 items-center">
            {/* Active Tag Filter Display */}
            {tagFilter && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-[#415A77]">Filtered by tag:</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#3FD3C6]/10 rounded-full">
                  <span className="text-sm text-[#3FD3C6]">#{tagFilter}</span>
                  <button
                    onClick={() => setTagFilter(null)}
                    className="text-[#3FD3C6] hover:text-[#4FE3D6] ml-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {(['all', 'technical', 'operational', 'philosophical'] as const).map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`
                    px-4 py-2 text-sm uppercase tracking-wider transition-all
                    ${filter === category
                      ? 'text-[#3FD3C6] border-b-2 border-[#3FD3C6]'
                      : 'text-[#415A77] hover:text-[#E0E1DD]'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1B263B] border border-[#415A77] px-4 py-2
                         text-[#F8F8F2] placeholder-[#415A77] focus:border-[#3FD3C6]
                         transition-colors"
              />
            </div>

            <div className="text-sm text-[#415A77]">
              {filteredNotes.length} notes
            </div>
          </div>

          {/* Notes Grid */}
          <div className="space-y-8">
            {filteredNotes.map((note, index) => (
              <motion.article
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group cursor-pointer"
                onClick={() => {
                  setSelectedNote(note.id)
                  // Update URL without causing a navigation
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.set('note', note.id)
                    window.history.pushState({}, '', url.toString())
                  }
                }}
              >
                <div className="border-l-2 border-[#415A77] pl-8 hover:border-[#3FD3C6] transition-all">
                  {/* Date & Category */}
                  <div className="flex items-center gap-4 mb-2">
                    <time className="text-xs text-[#3FD3C6] uppercase tracking-wider">
                      {note.date}
                    </time>
                    <span className="text-xs text-[#415A77] uppercase tracking-wider">
                      {note.category}
                    </span>
                    {note.projectContext && (
                      <span className="text-xs text-[#E84855] uppercase tracking-wider">
                        {note.projectContext}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl font-light text-[#F8F8F2] mb-3
                               group-hover:text-[#3FD3C6] transition-colors">
                    {note.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-xl text-[#415A77] leading-relaxed mb-4 line-clamp-3">
                    {note.excerpt}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-[#E0E1DD]">
                      {note.readTime}
                    </span>

                    {/* Share Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setNoteToShare(note.id)
                        setShareModalOpen(true)
                      }}
                      className="text-[#415A77] hover:text-[#3FD3C6] transition-colors flex items-center gap-1"
                      title="Share this note"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16,6 12,2 8,6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      <span className="text-xs">Share</span>
                    </button>

                    {note.hasCode && (
                      <span className="text-[#3FD3C6] font-mono text-xs px-2 py-1
                                     bg-[#3FD3C6]/10 rounded">
                        Contains Code
                      </span>
                    )}

                    {note.hasVisualization && (
                      <span className="text-[#E84855] text-xs px-2 py-1
                                     bg-[#E84855]/10 rounded">
                        Interactive
                      </span>
                    )}

                    <div className="flex gap-2 ml-auto">
                      {note.tags.map(tag => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation()
                            setTagFilter(tag)
                          }}
                          className="text-xs text-[#415A77] hover:text-[#3FD3C6] transition-colors cursor-pointer"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Empty State */}
          {filteredNotes.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#415A77]">
                No notes match your criteria. Try adjusting filters.
              </p>
            </div>
          )}

          {/* Footer Note */}
          <footer className="mt-32 p-8 bg-[#1C1C1C] text-center">
            <p className="text-sm text-[#415A77] mb-4">
              We publish when we discover something worth sharing.
              No content calendar. No SEO games. Just operational patterns.
            </p>
            <a
              href="/contact"
              className="inline-block text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors"
            >
              Subscribe for Notifications →
            </a>
          </footer>
        </section>
      ) : (
        <NoteViewer
          noteId={selectedNote}
          onClose={() => {
            setSelectedNote(null)
            // Clear the note parameter from URL
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('note')
              window.history.pushState({}, '', url.toString())
            }
          }}
          onTagClick={(tag) => {
            setTagFilter(tag)
            setSelectedNote(null)
            // Clear the note parameter from URL
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.delete('note')
              window.history.pushState({}, '', url.toString())
            }
          }}
        />
      )}

      {/* Share Modal */}
      {noteToShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false)
            setNoteToShare(null)
          }}
          noteId={noteToShare}
          noteTitle={workshopNotes.find(n => n.id === noteToShare)?.title || ''}
          noteExcerpt={workshopNotes.find(n => n.id === noteToShare)?.excerpt}
        />
      )}
    </main>
  )
}
