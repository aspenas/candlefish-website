'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArchiveEntry } from '../data'
import { shareEntry, downloadEntryPDF } from '@/lib/archive-utils'

export default function ArchiveEntryClient({ entry }: { entry: ArchiveEntry | null }) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleShareEntry = async () => {
    if (!entry) return

    setIsSharing(true)
    try {
      const result = await shareEntry(entry)

      if (result.success) {
        if (result.method === 'native') {
          toast.success('Entry shared successfully')
        } else {
          toast.success('Link copied to clipboard')
        }
      } else {
        toast.error('Failed to share entry')
      }
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share entry')
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!entry) return

    setIsDownloading(true)
    try {
      const success = await downloadEntryPDF(entry, 'archive-content')

      if (success) {
        toast.success('PDF generated successfully')
      } else {
        toast.error('Failed to generate PDF')
      }
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl font-light text-[#F8F8F2] mb-4">Entry Not Found</h1>
          <p className="text-[#415A77] mb-8">This archive entry does not exist or has been removed.</p>
          <button
            onClick={() => router.push('/archive')}
            className="text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors"
          >
            ← Back to Archive
          </button>
        </div>
      </div>
    )
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'study': return 'text-[#DAA520]'
      case 'framework': return 'text-[#3FD3C6]'
      case 'instrument': return 'text-[#F8F8F2]'
      case 'collaboration': return 'text-[#DAA520]'
      default: return 'text-[#415A77]'
    }
  }

  const getAccessIcon = (level: string) => {
    switch (level) {
      case 'public': return '◯'
      case 'collaborator': return '◐'
      case 'restricted': return '●'
      default: return '○'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
      <motion.article
        id="archive-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-6 py-12"
      >
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <span className={`text-sm uppercase tracking-wider font-mono ${getTypeColor(entry.type)}`}>
              {entry.type}
            </span>
            <time className="text-sm text-[#415A77] font-mono">
              {new Date(entry.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span className={`text-sm font-mono ${
              entry.accessLevel === 'public' ? 'text-[#DAA520]' :
              entry.accessLevel === 'collaborator' ? 'text-[#3FD3C6]' : 'text-[#415A77]'
            }`}>
              {getAccessIcon(entry.accessLevel)} {entry.accessLevel}
            </span>
          </div>

          <h1 className="text-5xl font-light text-[#F8F8F2] mb-6">
            {entry.title}
          </h1>

          <p className="text-xl text-[#415A77] leading-relaxed">
            {entry.summary}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-[#DAA520]/10 text-[#DAA520] text-sm font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        {/* Archive ID */}
        <div className="mb-8 p-4 bg-[#1B263B]/50 border border-[#415A77]/30">
          <p className="text-sm font-mono text-[#415A77]">
            Archive ID: {entry.id}
          </p>
        </div>

        {/* Main Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">Overview</h2>
            <p className="text-[#E0E1DD] leading-relaxed mb-6">
              {entry.fullContent?.overview || `This ${entry.type} represents a comprehensive exploration of ${entry.title.toLowerCase()}. The work documented here emerged from direct operational experience and careful observation of patterns in practice.`}
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">Key Findings</h2>
            <ul className="space-y-4 text-[#E0E1DD]">
              {(entry.fullContent?.findings || [
                'Pattern recognition reveals consistent behaviors across diverse operational contexts',
                'Human judgment remains critical at specific decision points',
                'Automation amplifies rather than replaces craft expertise',
                'System boundaries often define operational constraints more than technical limitations'
              ]).map((finding, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-[#3FD3C6] mr-3">▸</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">Methodology</h2>
            <p className="text-[#E0E1DD] leading-relaxed mb-6">
              {entry.fullContent?.methodology || 'Our approach combines direct observation, systematic documentation, and iterative refinement. Each insight emerges from practical application rather than theoretical speculation.'}
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">Applications</h2>
            <p className="text-[#E0E1DD] leading-relaxed mb-6">
              {entry.fullContent?.applications || 'This work applies to organizations seeking operational excellence without sacrificing craft integrity. The patterns identified here translate across industries while respecting domain-specific constraints.'}
            </p>
          </section>

          {entry.accessLevel !== 'public' && (
            <section className="mb-12 p-8 bg-[#1B263B]/50 border border-[#415A77]/30">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">Access Notice</h2>
              <p className="text-[#415A77]">
                Full documentation for this entry is available to {entry.accessLevel} collaborators only.
                Contact us to discuss partnership opportunities and gain deeper access to our operational research.
              </p>
            </section>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-16 flex justify-between items-center border-t border-[#415A77]/30 pt-8">
          <button
            onClick={() => router.push('/archive')}
            className="text-[#3FD3C6] hover:text-[#4FE3D6] transition-colors"
          >
            ← Back to Archive
          </button>

          <div className="flex gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="text-[#415A77] hover:text-[#E0E1DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Download PDF"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={handleShareEntry}
              disabled={isSharing}
              className="text-[#415A77] hover:text-[#E0E1DD] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Share Entry"
            >
              {isSharing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sharing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share Entry
                </>
              )}
            </button>
          </div>
        </nav>
      </motion.article>
    </div>
  )
}
