'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { workshopNotes } from '@/content/workshop-notes'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ShareModal } from '@/components/workshop/ShareModal'

interface NoteViewerProps {
  noteId: string
  onClose: () => void
  onTagClick?: (tag: string) => void
}

export const NoteViewer = ({ noteId, onClose, onTagClick }: NoteViewerProps) => {
  const note = workshopNotes.find(n => n.id === noteId)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = (scrollTop / docHeight) * 100
      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!note) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]"
      >
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 w-full h-1 bg-[#1B263B] z-50">
          <motion.div
            className="h-full bg-[#3FD3C6]"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="fixed z-50 p-3 bg-[#1B263B] text-[#E0E1DD]
                   hover:bg-[#415A77] transition-colors rounded-full"
          style={{ 
            top: 'calc(var(--main-nav-height, 72px) + var(--workshop-nav-height, 60px) + 12px)',
            right: '24px'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Content */}
        <div 
          className="max-w-4xl mx-auto px-6 pb-32"
          style={{ 
            paddingTop: 'calc(var(--main-nav-height, 72px) + var(--workshop-nav-height, 60px) + 24px)' 
          }}
        >
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <time className="text-sm text-[#3FD3C6] uppercase tracking-wider">
                {note.date}
              </time>
              <span className="text-sm text-[#415A77] uppercase tracking-wider">
                {note.category}
              </span>
              {note.projectContext && (
                <span className="text-sm text-[#E84855] uppercase tracking-wider">
                  {note.projectContext}
                </span>
              )}
            </div>

            <h1 className="text-5xl font-light text-[#F8F8F2] mb-6">
              {note.title}
            </h1>

            <p className="text-xl text-[#415A77] leading-relaxed">
              {note.excerpt}
            </p>

            <div className="flex items-center gap-6 mt-6 text-sm text-[#415A77]">
              <span>{note.readTime}</span>
              {note.hasCode && (
                <span className="text-[#3FD3C6] font-mono px-2 py-1 bg-[#3FD3C6]/10 rounded">
                  Contains Code
                </span>
              )}
              {note.hasVisualization && (
                <span className="text-[#E84855] px-2 py-1 bg-[#E84855]/10 rounded">
                  Interactive
                </span>
              )}
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => (
                  <h1 className="text-4xl font-light text-[#F8F8F2] mt-12 mb-6">{children}</h1>
                ),
                h2: ({children}) => (
                  <h2 className="text-3xl font-light text-[#F8F8F2] mt-10 mb-4">{children}</h2>
                ),
                h3: ({children}) => (
                  <h3 className="text-2xl font-light text-[#F8F8F2] mt-8 mb-3">{children}</h3>
                ),
                p: ({children}) => (
                  <p className="text-[#E0E1DD] leading-relaxed mb-6">{children}</p>
                ),
                ul: ({children}) => (
                  <ul className="text-[#E0E1DD] space-y-2 mb-6 ml-6">{children}</ul>
                ),
                ol: ({children}) => (
                  <ol className="text-[#E0E1DD] space-y-2 mb-6 ml-6 list-decimal">{children}</ol>
                ),
                li: ({children}) => (
                  <li className="text-[#E0E1DD]">{children}</li>
                ),
                blockquote: ({children}) => (
                  <blockquote className="border-l-4 border-[#3FD3C6] pl-6 my-8 text-[#415A77] italic">
                    {children}
                  </blockquote>
                ),
                code: ({className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const language = match ? match[1] : ''
                  const inline = !className || !language

                  if (!inline && language) {
                    return (
                      <div className="my-8">
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={language}
                          PreTag="div"
                          customStyle={{
                            background: '#1C1C1C',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.9rem',
                            border: '1px solid #415A77'
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }

                  return (
                    <code className="bg-[#1C1C1C] text-[#3FD3C6] px-2 py-1 rounded font-mono text-sm">
                      {children}
                    </code>
                  )
                },
                strong: ({children}) => (
                  <strong className="text-[#F8F8F2] font-semibold">{children}</strong>
                ),
                em: ({children}) => (
                  <em className="text-[#E0E1DD] italic">{children}</em>
                ),
                hr: () => (
                  <hr className="my-12 border-t border-[#415A77]" />
                )
              }}
            >
              {note.content}
            </ReactMarkdown>
          </div>

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-[#415A77]">
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (onTagClick) {
                      onTagClick(tag)
                      onClose() // Close viewer to show filtered results
                    }
                  }}
                  className="text-sm text-[#415A77] hover:text-[#3FD3C6] px-3 py-1 bg-[#1C1C1C] hover:bg-[#3FD3C6]/10 rounded transition-all cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-12 flex justify-between">
            <button
              onClick={onClose}
              className="text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors"
            >
              ← Back to Notes
            </button>

            <button
              onClick={() => setShareModalOpen(true)}
              className="text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16,6 12,2 8,6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share Note
            </button>
          </nav>

          {/* Subscribe Footer */}
          <footer className="mt-16 p-8 bg-[#1C1C1C] text-center -mx-6">
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
        </div>

        {/* Share Modal */}
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          noteId={note.id}
          noteTitle={note.title}
          noteExcerpt={note.excerpt}
        />
      </motion.article>
    </AnimatePresence>
  )
}
