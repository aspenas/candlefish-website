'use client'

import { useState, useEffect } from 'react'
import { Card, Button } from '@candlefish-ai/shared'
import { History, Play, Trash2, Star } from 'lucide-react'

interface SavedQuery {
  id: number
  name: string
  query: string
  variables: string
  timestamp: string
  favorite?: boolean
}

export function QueryHistory() {
  const [queries, setQueries] = useState<SavedQuery[]>([])
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null)

  useEffect(() => {
    const savedQueries = JSON.parse(localStorage.getItem('graphql-queries') || '[]')
    setQueries(savedQueries)
  }, [])

  const loadQuery = (query: SavedQuery) => {
    // This would normally load the query into the editor
    setSelectedQuery(query.id)
    console.log('Load query:', query)
  }

  const deleteQuery = (queryId: number) => {
    const updatedQueries = queries.filter(q => q.id !== queryId)
    setQueries(updatedQueries)
    localStorage.setItem('graphql-queries', JSON.stringify(updatedQueries))
  }

  const toggleFavorite = (queryId: number) => {
    const updatedQueries = queries.map(q =>
      q.id === queryId ? { ...q, favorite: !q.favorite } : q
    )
    setQueries(updatedQueries)
    localStorage.setItem('graphql-queries', JSON.stringify(updatedQueries))
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getQueryPreview = (query: string) => {
    const firstLine = query.split('\n')[0].trim()
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine
  }

  return (
    <Card className="h-full bg-[#0f172a]/50 border-[#0f172a]/20">
      {/* Header */}
      <div className="p-4 border-b border-[#0f172a]/20">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#22d3ee]" />
          <h3 className="text-lg font-semibold text-[#e6f9f6]">Query History</h3>
        </div>
        <p className="text-sm text-[#a3b3bf] mt-1">
          {queries.length} saved queries
        </p>
      </div>

      {/* Query List */}
      <div className="flex-1 overflow-auto">
        {queries.length === 0 ? (
          <div className="p-4 text-center">
            <History className="h-8 w-8 text-[#a3b3bf] mx-auto mb-2 opacity-50" />
            <p className="text-sm text-[#a3b3bf]">No saved queries yet</p>
            <p className="text-xs text-[#a3b3bf] mt-1">
              Execute queries to see them here
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {queries
              .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) ||
                             new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((query) => (
                <div
                  key={query.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedQuery === query.id
                      ? 'bg-[#14b8a6]/10 border-[#14b8a6]/30'
                      : 'bg-[#0b0f13]/30 border-[#0f172a]/20 hover:bg-[#0b0f13]/50'
                  }`}
                  onClick={() => loadQuery(query)}
                >
                  {/* Query Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {query.favorite && (
                        <Star className="h-3 w-3 text-[#f59e0b] fill-current" />
                      )}
                      <span className="text-sm font-medium text-[#e6f9f6] truncate">
                        {query.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(query.id)
                        }}
                      >
                        <Star className={`h-3 w-3 ${
                          query.favorite ? 'text-[#f59e0b] fill-current' : 'text-[#a3b3bf]'
                        }`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteQuery(query.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-[#ef4444]" />
                      </Button>
                    </div>
                  </div>

                  {/* Query Preview */}
                  <div className="text-xs text-[#a3b3bf] font-mono mb-2 truncate">
                    {getQueryPreview(query.query)}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-[#a3b3bf]">
                    {formatTime(query.timestamp)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#0f172a]/20">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setQueries([])
            localStorage.removeItem('graphql-queries')
          }}
          disabled={queries.length === 0}
        >
          Clear All
        </Button>
      </div>
    </Card>
  )
}
