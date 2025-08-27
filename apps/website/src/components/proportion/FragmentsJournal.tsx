import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface Fragment {
  id: string
  type: 'text' | 'image' | 'sketch'
  content: string | Blob
  tags: string[]
  created: string
  encrypted: boolean
  localOnly: boolean
}

interface FragmentsJournalProps {
  onClose?: () => void
  className?: string
}

// Simple AES-256 encryption wrapper (would use WebCrypto API in production)
const encrypt = async (data: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

const decrypt = async (encryptedData: string, key: CryptoKey): Promise<string> => {
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  )

  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

export const FragmentsJournal: React.FC<FragmentsJournalProps> = ({
  onClose,
  className = ''
}) => {
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [activeType, setActiveType] = useState<Fragment['type']>('text')
  const [textContent, setTextContent] = useState('')
  const [tags, setTags] = useState('')
  const [localOnly, setLocalOnly] = useState(true)
  const [encryptionEnabled, setEncryptionEnabled] = useState(true)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null)
  const [filter, setFilter] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sketchingRef = useRef(false)

  // Initialize encryption key
  useEffect(() => {
    const initKey = async () => {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      setEncryptionKey(key)
    }

    if (encryptionEnabled && !encryptionKey) {
      initKey()
    }
  }, [encryptionEnabled])

  // Load fragments from localStorage
  useEffect(() => {
    const loadFragments = async () => {
      const stored = localStorage.getItem('candlefish_fragments')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setFragments(parsed)
        } catch (error) {
          console.error('Failed to load fragments:', error)
        }
      }
    }
    loadFragments()
  }, [])

  // Save fragments to localStorage
  useEffect(() => {
    if (fragments.length > 0) {
      localStorage.setItem('candlefish_fragments', JSON.stringify(fragments))
    }
  }, [fragments])

  // Handle text fragment creation
  const createTextFragment = useCallback(async () => {
    if (!textContent.trim()) return

    let content = textContent
    if (encryptionEnabled && encryptionKey) {
      content = await encrypt(textContent, encryptionKey)
    }

    const fragment: Fragment = {
      id: uuidv4(),
      type: 'text',
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      created: new Date().toISOString(),
      encrypted: encryptionEnabled,
      localOnly
    }

    setFragments(prev => [fragment, ...prev])
    setTextContent('')
    setTags('')
  }, [textContent, tags, localOnly, encryptionEnabled, encryptionKey])

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      let content: string | Blob = file
      if (encryptionEnabled && encryptionKey && reader.result) {
        content = await encrypt(reader.result as string, encryptionKey)
      }

      const fragment: Fragment = {
        id: uuidv4(),
        type: 'image',
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        created: new Date().toISOString(),
        encrypted: encryptionEnabled,
        localOnly
      }

      setFragments(prev => [fragment, ...prev])
      setTags('')
    }
    reader.readAsDataURL(file)
  }, [tags, localOnly, encryptionEnabled, encryptionKey])

  // Sketch handling
  const startSketching = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    sketchingRef.current = true
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }, [])

  const sketch = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sketchingRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }, [])

  const stopSketching = useCallback(() => {
    sketchingRef.current = false
  }, [])

  const saveSketch = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob(async (blob) => {
      if (!blob) return

      let content: string | Blob = blob
      if (encryptionEnabled && encryptionKey) {
        const reader = new FileReader()
        reader.onload = async () => {
          if (reader.result) {
            content = await encrypt(reader.result as string, encryptionKey)

            const fragment: Fragment = {
              id: uuidv4(),
              type: 'sketch',
              content,
              tags: tags.split(',').map(t => t.trim()).filter(Boolean),
              created: new Date().toISOString(),
              encrypted: encryptionEnabled,
              localOnly
            }

            setFragments(prev => [fragment, ...prev])
            setTags('')

            // Clear canvas
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
            }
          }
        }
        reader.readAsDataURL(blob)
      } else {
        const fragment: Fragment = {
          id: uuidv4(),
          type: 'sketch',
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          created: new Date().toISOString(),
          encrypted: false,
          localOnly
        }

        setFragments(prev => [fragment, ...prev])
        setTags('')

        // Clear canvas
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
    })
  }, [tags, localOnly, encryptionEnabled, encryptionKey])

  // Export fragments
  const exportFragments = useCallback(() => {
    const data = JSON.stringify(fragments, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fragments-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [fragments])

  // Delete fragment
  const deleteFragment = useCallback((id: string) => {
    setFragments(prev => prev.filter(f => f.id !== id))
    setSelectedFragment(null)
  }, [])

  // Filter fragments
  const filteredFragments = fragments.filter(f => {
    if (!filter) return true
    return f.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())) ||
           (f.type === 'text' && typeof f.content === 'string' &&
            f.content.toLowerCase().includes(filter.toLowerCase()))
  })

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Fragments</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close fragments journal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Filter by tag or content..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Fragment list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredFragments.map(fragment => (
            <div
              key={fragment.id}
              onClick={() => setSelectedFragment(fragment)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedFragment?.id === fragment.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              } border`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500">
                      {fragment.type}
                    </span>
                    {fragment.encrypted && (
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {fragment.localOnly && (
                      <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-700 truncate">
                    {fragment.type === 'text' && typeof fragment.content === 'string'
                      ? fragment.encrypted ? '[Encrypted]' : fragment.content.substring(0, 50) + '...'
                      : fragment.type === 'image' ? '[Image]'
                      : '[Sketch]'}
                  </div>
                  {fragment.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fragment.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(fragment.created).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFragment(fragment.id)
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600"
                  aria-label="Delete fragment"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={exportFragments}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Export Fragments
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Creation toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveType('text')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeType === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveType('image')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeType === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => setActiveType('sketch')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeType === 'sketch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sketch
            </button>
          </div>
        </div>

        {/* Creation area */}
        <div className="flex-1 p-8">
          {activeType === 'text' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write your fragment..."
                className="w-full h-64 p-4 text-lg border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localOnly}
                    onChange={(e) => setLocalOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Local only</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={encryptionEnabled}
                    onChange={(e) => setEncryptionEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Encrypt</span>
                </label>
              </div>
              <button
                onClick={createTextFragment}
                className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Fragment
              </button>
            </div>
          )}

          {activeType === 'image' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400"
              >
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Click to upload an image</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {activeType === 'sketch' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={400}
                onMouseDown={startSketching}
                onMouseMove={sketch}
                onMouseUp={stopSketching}
                onMouseLeave={stopSketching}
                className="border border-gray-300 rounded-lg cursor-crosshair bg-white"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-3">
                <button
                  onClick={saveSketch}
                  className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Sketch
                </button>
                <button
                  onClick={() => {
                    const canvas = canvasRef.current
                    if (!canvas) return
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height)
                    }
                  }}
                  className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
