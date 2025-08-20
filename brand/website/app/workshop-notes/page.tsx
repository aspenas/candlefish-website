'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { workshopNotes } from '@/content/workshop-notes'
import { NoteViewer } from '@/components/notes/note-viewer'

export default function WorkshopNotes() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'technical' | 'operational' | 'philosophical'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredNotes = workshopNotes
    .filter(note => filter === 'all' || note.category === filter)
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
                onClick={() => setSelectedNote(note.id)}
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
                  <p className="text-[#415A77] leading-relaxed mb-4 line-clamp-3">
                    {note.excerpt}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-[#E0E1DD]">
                      {note.readTime}
                    </span>
                    
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
                        <span key={tag} className="text-xs text-[#415A77]">
                          #{tag}
                        </span>
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
            <button className="text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors">
              Subscribe for Notifications →
            </button>
          </footer>
        </section>
      ) : (
        <NoteViewer 
          noteId={selectedNote} 
          onClose={() => setSelectedNote(null)}
        />
      )}
    </main>
  )
}