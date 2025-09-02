'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { workshopNotes } from '@/content/workshop-notes'
import { NoteViewer } from '@/components/notes/note-viewer'
import { ShareModal } from '@/components/workshop/ShareModal'
import { BrowserOptimizations, CriticalCSS, AccessibilityEnhancements } from '@/components/workshop/BrowserOptimizations'
import '../../styles/workshop-notes-unified.css'

interface LiveMetrics {
  totalNotes: number
  activeCategories: number
  averageReadTime: string
  lastUpdated: string
  engagementLevel: 'low' | 'moderate' | 'high'
}

export default function WorkshopNotes() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'technical' | 'operational' | 'philosophical'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [noteToShare, setNoteToShare] = useState<string | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    totalNotes: workshopNotes.length,
    activeCategories: 3,
    averageReadTime: '12 min',
    lastUpdated: '2025.09.01',
    engagementLevel: 'high'
  })
  const observerRef = useRef<IntersectionObserver | null>(null)

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

  // Set up intersection observer for lazy loading and workshop nav height
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('workshop-in-view')
          }
        })
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    // Set workshop navigation height CSS custom property
    const updateWorkshopNavHeight = () => {
      const workshopNav = document.querySelector('.workshop-nav') as HTMLElement
      const mainNav = document.querySelector('#navigation') as HTMLElement
      if (workshopNav) {
        const workshopHeight = workshopNav.offsetHeight
        document.documentElement.style.setProperty('--workshop-nav-height', `${workshopHeight}px`)
      }
      if (mainNav) {
        const mainHeight = mainNav.offsetHeight
        document.documentElement.style.setProperty('--main-nav-height', `${mainHeight}px`)
      }
      // Update total height
      const totalHeight = (workshopNav?.offsetHeight || 60) + (mainNav?.offsetHeight || 72)
      document.documentElement.style.setProperty('--total-nav-height', `${totalHeight}px`)
    }
    
    // Update on mount with multiple attempts to ensure nav is rendered
    updateWorkshopNavHeight()
    setTimeout(updateWorkshopNavHeight, 50)
    setTimeout(updateWorkshopNavHeight, 150)
    window.addEventListener('resize', updateWorkshopNavHeight)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      window.removeEventListener('resize', updateWorkshopNavHeight)
    }
  }, [])

  // Simulate live metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        averageReadTime: `${Math.floor(10 + Math.random() * 8)} min`,
        engagementLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'moderate' : 'low'
      }))
    }, 15000)

    return () => clearInterval(interval)
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
    <div className="workshop-background workshop-container workshop-text-optimize">
      {/* Browser Optimizations */}
      <BrowserOptimizations />
      <CriticalCSS />
      <AccessibilityEnhancements />
      
      {/* Operational Navigation */}
      <nav className="workshop-nav">
        <div className="workshop-nav-content">
          <div className="flex items-center gap-6">
            <h1 className="workshop-text-mono">
              WORKSHOP // NOTES-ARCHIVE
            </h1>
            <div className={`workshop-status workshop-status--${liveMetrics.engagementLevel === 'high' ? 'active' : liveMetrics.engagementLevel === 'moderate' ? 'processing' : 'complete'}`}>
              System Operational
            </div>
          </div>
          
          <div className="workshop-metrics">
            <div className="workshop-metric">
              <span className="workshop-metric-label">Total Notes</span>
              <span className="workshop-metric-value">{liveMetrics.totalNotes}</span>
            </div>
            <div className="workshop-metric">
              <span className="workshop-metric-label">Avg Read</span>
              <span className="workshop-metric-value">{liveMetrics.averageReadTime}</span>
            </div>
            <div className="workshop-metric">
              <span className="workshop-metric-label">Last Update</span>
              <span className="workshop-metric-value">{liveMetrics.lastUpdated}</span>
            </div>
            <div className="workshop-metric">
              <span className="workshop-metric-label">Engagement</span>
              <span className="workshop-metric-value">{liveMetrics.engagementLevel}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="workshop-grid">
        {!selectedNote ? (
          <>
            {/* Header Section */}
            <header className="workshop-lazy-content">
              <h1 className="workshop-text-hero mb-4">
                Workshop Notes
              </h1>
              <p className="workshop-text-subtitle max-w-3xl">
                Technical explorations from operational work. Published when we
                find patterns worth documenting, not when the calendar says so.
              </p>
            </header>

            {/* Filter and Search Section */}
            <section className="workshop-card p-6 workshop-lazy-content">
              {/* Active Tag Filter Display */}
              {tagFilter && (
                <div className="flex items-center gap-4 mb-6">
                  <span className="workshop-text-caption">Filtered by tag:</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded border border-cyan-500/30">
                    <span className="workshop-text-mono">#{tagFilter}</span>
                    <button
                      onClick={() => setTagFilter(null)}
                      className="text-cyan-400 hover:text-cyan-300 ml-1 text-lg leading-none"
                      aria-label="Clear tag filter"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Category Filter */}
                <div>
                  <label className="workshop-text-caption mb-3 block">Category Filter</label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'technical', 'operational', 'philosophical'] as const).map(category => (
                      <button
                        key={category}
                        onClick={() => setFilter(category)}
                        className={`workshop-button ${filter === category ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10' : ''}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Input */}
                <div>
                  <label className="workshop-text-caption mb-3 block" htmlFor="search-input">
                    Search Notes
                  </label>
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Search titles, content, tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-600 px-4 py-2 rounded
                             text-gray-100 placeholder-gray-400 focus:border-cyan-400 focus:outline-none
                             transition-colors workshop-text-body"
                  />
                </div>

                {/* Results Count */}
                <div>
                  <span className="workshop-text-caption mb-3 block">Results</span>
                  <div className="workshop-text-mono text-cyan-400 text-xl">
                    {filteredNotes.length} notes
                  </div>
                </div>
              </div>
            </section>

            {/* Notes Grid */}
            <section className="space-y-6">
              {filteredNotes.map((note, index) => (
                <motion.article
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="workshop-card workshop-lazy-content group cursor-pointer p-6 hover:scale-[1.01] transition-transform duration-300"
                  onClick={() => {
                    setSelectedNote(note.id)
                    // Update URL without causing a navigation
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href)
                      url.searchParams.set('note', note.id)
                      window.history.pushState({}, '', url.toString())
                    }
                  }}
                  ref={(el) => {
                    if (el && observerRef.current) {
                      observerRef.current.observe(el)
                    }
                  }}
                >
                  {/* Header with operational metadata */}
                  <header className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <time className="workshop-text-caption text-cyan-400">
                        {note.date}
                      </time>
                      <span className="workshop-text-caption">
                        {note.category}
                      </span>
                      {note.projectContext && (
                        <span className="workshop-text-caption text-amber-400">
                          {note.projectContext}
                        </span>
                      )}
                    </div>
                    <div className={`workshop-status workshop-status--${note.category === 'technical' ? 'active' : note.category === 'operational' ? 'processing' : 'complete'}`}>
                      {note.readTime}
                    </div>
                  </header>

                  {/* Title */}
                  <h2 className="workshop-text-title mb-4 group-hover:text-cyan-400 transition-colors duration-300">
                    {note.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="workshop-text-body mb-6 line-clamp-3 opacity-90">
                    {note.excerpt}
                  </p>

                  {/* Features and Tags Footer */}
                  <footer className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Share Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setNoteToShare(note.id)
                          setShareModalOpen(true)
                        }}
                        className="workshop-button text-xs px-3 py-1"
                        title="Share this note"
                        aria-label={`Share ${note.title}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16,6 12,2 8,6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                        Share
                      </button>

                      {/* Feature badges */}
                      {note.hasCode && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
                          <code className="mr-1">{'</>'}</code>
                          Code
                        </span>
                      )}

                      {note.hasVisualization && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                          </svg>
                          Interactive
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex gap-2 flex-wrap">
                      {note.tags.slice(0, 4).map(tag => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation()
                            setTagFilter(tag)
                          }}
                          className="workshop-text-mono text-xs opacity-60 hover:opacity-100 hover:text-cyan-400 transition-all"
                          title={`Filter by tag: ${tag}`}
                        >
                          #{tag}
                        </button>
                      ))}
                      {note.tags.length > 4 && (
                        <span className="workshop-text-mono text-xs opacity-40">
                          +{note.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  </footer>
                </motion.article>
              ))}
            </section>

            {/* Empty State */}
            {filteredNotes.length === 0 && (
              <div className="workshop-card p-12 text-center workshop-lazy-content">
                <div className="workshop-status workshop-status--processing mb-4 justify-center">
                  No Results Found
                </div>
                <p className="workshop-text-body mb-6">
                  No notes match your current criteria. Try adjusting your filters or search terms.
                </p>
                <button
                  onClick={() => {
                    setFilter('all')
                    setTagFilter(null)
                    setSearchTerm('')
                  }}
                  className="workshop-button"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Operational Footer */}
            <footer className="workshop-card p-8 text-center workshop-lazy-content mt-12">
              <div className="workshop-status workshop-status--active mb-6 justify-center">
                Publishing Philosophy
              </div>
              <p className="workshop-text-body mb-6 max-w-2xl mx-auto">
                We publish when we discover something worth sharing.
                No content calendar. No SEO games. Just operational patterns
                discovered through actual work.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/contact"
                  className="workshop-button border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
                >
                  Subscribe for Updates →
                </a>
                <a
                  href="/atelier"
                  className="workshop-button"
                >
                  Explore Atelier →
                </a>
              </div>
            </footer>
          </>
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
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen && !!noteToShare}
        onClose={() => {
          setShareModalOpen(false)
          setNoteToShare(null)
        }}
        noteId={noteToShare || ''}
        noteTitle={noteToShare ? (workshopNotes.find(n => n.id === noteToShare)?.title || '') : ''}
        noteExcerpt={noteToShare ? workshopNotes.find(n => n.id === noteToShare)?.excerpt : undefined}
      />
    </div>
  )
}
