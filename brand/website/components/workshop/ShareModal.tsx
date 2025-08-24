'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  noteId: string
  noteTitle: string
  noteExcerpt?: string
}

export const ShareModal = ({ isOpen, onClose, noteId, noteTitle, noteExcerpt }: ShareModalProps) => {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      // Generate shareable URL with note ID
      const baseUrl = window.location.origin
      const noteUrl = `${baseUrl}/workshop-notes?note=${noteId}`
      setShareUrl(noteUrl)
    }
  }, [noteId, isOpen])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`${noteTitle}\n\n${noteExcerpt || 'Workshop notes from Candlefish'}`)
    const url = encodeURIComponent(shareUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(shareUrl)
    const title = encodeURIComponent(noteTitle)
    const summary = encodeURIComponent(noteExcerpt || 'Technical explorations from operational work.')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#0D1B2A]/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-[#1B263B] border border-[#415A77] rounded-lg p-8 max-w-md w-full"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#415A77] hover:text-[#E0E1DD] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Header */}
          <h3 className="text-2xl font-light text-[#F8F8F2] mb-2">
            Share Note
          </h3>
          <p className="text-[#415A77] mb-6">
            Share "{noteTitle}" with others
          </p>

          {/* Share URL */}
          <div className="mb-6">
            <label className="block text-sm text-[#E0E1DD] mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-[#0D1B2A] border border-[#415A77] px-3 py-2 text-[#F8F8F2] text-sm rounded focus:border-[#3FD3C6] transition-colors"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                  copied
                    ? 'bg-[#3FD3C6] text-[#0D1B2A]'
                    : 'bg-[#415A77] text-[#F8F8F2] hover:bg-[#3FD3C6] hover:text-[#0D1B2A]'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm text-[#415A77] mb-3">
              Share on social media
            </p>

            <button
              onClick={shareOnTwitter}
              className="w-full flex items-center gap-3 p-3 bg-[#1da1f2]/10 hover:bg-[#1da1f2]/20 border border-[#1da1f2]/20 hover:border-[#1da1f2]/40 rounded transition-all group"
            >
              <svg className="w-5 h-5 text-[#1da1f2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              <span className="text-[#F8F8F2] group-hover:text-[#1da1f2] transition-colors">
                Share on Twitter/X
              </span>
            </button>

            <button
              onClick={shareOnLinkedIn}
              className="w-full flex items-center gap-3 p-3 bg-[#0077b5]/10 hover:bg-[#0077b5]/20 border border-[#0077b5]/20 hover:border-[#0077b5]/40 rounded transition-all group"
            >
              <svg className="w-5 h-5 text-[#0077b5]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-[#F8F8F2] group-hover:text-[#0077b5] transition-colors">
                Share on LinkedIn
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
