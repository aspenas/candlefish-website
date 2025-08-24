import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Search, Hash, FileText, Users, Code } from 'lucide-react'
import { cn, debounce } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  description?: string
  url: string
  type: 'documentation' | 'partner' | 'api' | 'guide' | 'example'
  breadcrumbs?: string[]
}

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string) => Promise<SearchResult[]>
  placeholder?: string
}

const resultIcons = {
  documentation: FileText,
  partner: Users,
  api: Code,
  guide: FileText,
  example: Hash,
}

const resultTypeLabels = {
  documentation: 'Docs',
  partner: 'Partner',
  api: 'API',
  guide: 'Guide',
  example: 'Example',
}

export function SearchDialog({ 
  isOpen, 
  onClose, 
  onSearch, 
  placeholder = "Search documentation..." 
}: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const searchResults = await onSearch(searchQuery)
        setResults(searchResults)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [onSearch]
  )

  // Handle query changes
  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            window.location.href = results[selectedIndex].url
            onClose()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-slate-200 px-4">
            <Search className="w-5 h-5 text-slate-400 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 py-4 text-lg bg-transparent outline-none placeholder-slate-400"
              autoFocus
            />
            {isLoading && (
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = resultIcons[result.type]
                  const isSelected = index === selectedIndex
                  
                  return (
                    <a
                      key={result.id}
                      href={result.url}
                      onClick={onClose}
                      className={cn(
                        'block px-4 py-3 hover:bg-slate-50 transition-colors',
                        isSelected && 'bg-amber-50 border-r-2 border-amber-500'
                      )}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className={cn(
                          'w-5 h-5 mt-0.5 flex-shrink-0',
                          isSelected ? 'text-amber-600' : 'text-slate-400'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={cn(
                              'font-medium truncate',
                              isSelected ? 'text-amber-900' : 'text-slate-900'
                            )}>
                              {result.title}
                            </h3>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                              isSelected 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-slate-100 text-slate-600'
                            )}>
                              {resultTypeLabels[result.type]}
                            </span>
                          </div>
                          {result.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 mb-1">
                              {result.description}
                            </p>
                          )}
                          {result.breadcrumbs && (
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              {result.breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <span>›</span>}
                                  <span>{crumb}</span>
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            ) : query.trim() && !isLoading ? (
              <div className="py-8 text-center text-slate-500">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">
                <Search className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>Start typing to search</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">↓</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">↵</kbd>
                  <span>select</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">esc</kbd>
                  <span>close</span>
                </div>
              </div>
              <div className="text-slate-400">
                Powered by Candlefish AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}