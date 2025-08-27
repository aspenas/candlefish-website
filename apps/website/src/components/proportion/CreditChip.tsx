import React, { useState, useCallback } from 'react'

export interface CreditInfo {
  author?: string
  source?: string
  sourceUrl?: string
  prior?: string
  priorUrl?: string
  contributors?: string[]
  timestamp?: string
}

interface CreditChipProps {
  credit?: CreditInfo
  onUpdate?: (credit: CreditInfo) => void
  editable?: boolean
  compact?: boolean
  className?: string
}

export const CreditChip: React.FC<CreditChipProps> = ({
  credit = {},
  onUpdate,
  editable = true,
  compact = false,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingCredit, setEditingCredit] = useState<CreditInfo>(credit)

  // Handle save
  const handleSave = useCallback(() => {
    if (onUpdate) {
      onUpdate(editingCredit)
    }
    setIsEditing(false)
  }, [editingCredit, onUpdate])

  // Handle cancel
  const handleCancel = useCallback(() => {
    setEditingCredit(credit)
    setIsEditing(false)
  }, [credit])

  // Format display text
  const formatCreditText = (): string => {
    const parts: string[] = []

    if (credit.author) {
      parts.push(`Via: ${credit.author}`)
    }
    if (credit.source) {
      parts.push(`Source: ${credit.source}`)
    }
    if (credit.prior) {
      parts.push(`Prior: ${credit.prior}`)
    }
    if (credit.contributors && credit.contributors.length > 0) {
      parts.push(`Contributors: ${credit.contributors.join(', ')}`)
    }

    return parts.join(' | ') || 'Add attribution'
  }

  // Has any credit info
  const hasCredit = credit.author || credit.source || credit.prior ||
                   (credit.contributors && credit.contributors.length > 0)

  // Compact view
  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 text-xs ${className}`}>
        {hasCredit ? (
          <>
            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0118 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
            </svg>
            {credit.author && <span className="text-gray-600">{credit.author}</span>}
            {credit.source && (
              <>
                <span className="text-gray-400">•</span>
                {credit.sourceUrl ? (
                  <a
                    href={credit.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {credit.source}
                  </a>
                ) : (
                  <span className="text-gray-600">{credit.source}</span>
                )}
              </>
            )}
            {editable && (
              <button
                onClick={() => setIsEditing(true)}
                className="ml-1 text-gray-400 hover:text-gray-600"
                aria-label="Edit attribution"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </>
        ) : (
          editable && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Add credit</span>
              </span>
            </button>
          )
        )}
      </div>
    )
  }

  // Full view
  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      {!isEditing ? (
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {hasCredit ? (
              <div className="space-y-1">
                {credit.author && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0118 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">Via: {credit.author}</span>
                  </div>
                )}

                {credit.source && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      Source: {credit.sourceUrl ? (
                        <a
                          href={credit.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {credit.source}
                        </a>
                      ) : credit.source}
                    </span>
                  </div>
                )}

                {credit.prior && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      Prior: {credit.priorUrl ? (
                        <a
                          href={credit.priorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {credit.prior}
                        </a>
                      ) : credit.prior}
                    </span>
                  </div>
                )}

                {credit.contributors && credit.contributors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      Contributors: {credit.contributors.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No attribution added</div>
            )}
          </div>

          {editable && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-3 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Edit attribution"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Edit Attribution</div>

          <div>
            <label htmlFor="author" className="block text-xs font-medium text-gray-600 mb-1">
              Author / Via
            </label>
            <input
              id="author"
              type="text"
              value={editingCredit.author || ''}
              onChange={(e) => setEditingCredit({ ...editingCredit, author: e.target.value })}
              placeholder="@username or Name"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-xs font-medium text-gray-600 mb-1">
              Source
            </label>
            <div className="flex space-x-2">
              <input
                id="source"
                type="text"
                value={editingCredit.source || ''}
                onChange={(e) => setEditingCredit({ ...editingCredit, source: e.target.value })}
                placeholder="Document or reference"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={editingCredit.sourceUrl || ''}
                onChange={(e) => setEditingCredit({ ...editingCredit, sourceUrl: e.target.value })}
                placeholder="URL (optional)"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prior" className="block text-xs font-medium text-gray-600 mb-1">
              Prior Work
            </label>
            <div className="flex space-x-2">
              <input
                id="prior"
                type="text"
                value={editingCredit.prior || ''}
                onChange={(e) => setEditingCredit({ ...editingCredit, prior: e.target.value })}
                placeholder="Previous work or inspiration"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={editingCredit.priorUrl || ''}
                onChange={(e) => setEditingCredit({ ...editingCredit, priorUrl: e.target.value })}
                placeholder="URL (optional)"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contributors" className="block text-xs font-medium text-gray-600 mb-1">
              Contributors
            </label>
            <input
              id="contributors"
              type="text"
              value={editingCredit.contributors?.join(', ') || ''}
              onChange={(e) => setEditingCredit({
                ...editingCredit,
                contributors: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
              })}
              placeholder="Comma-separated list of contributors"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing credit in components
export const useCredit = (initialCredit?: CreditInfo) => {
  const [credit, setCredit] = useState<CreditInfo>(initialCredit || {})

  const updateCredit = useCallback((newCredit: CreditInfo) => {
    setCredit(prev => ({ ...prev, ...newCredit }))
  }, [])

  const clearCredit = useCallback(() => {
    setCredit({})
  }, [])

  const formatForCommit = useCallback((): string => {
    const parts: string[] = []

    if (credit.author) {
      parts.push(`Co-authored-by: ${credit.author}`)
    }
    if (credit.source) {
      parts.push(`[SOURCE: ${credit.source}${credit.sourceUrl ? ` ${credit.sourceUrl}` : ''}]`)
    }
    if (credit.prior) {
      parts.push(`[PRIOR: ${credit.prior}${credit.priorUrl ? ` ${credit.priorUrl}` : ''}]`)
    }
    if (credit.contributors && credit.contributors.length > 0) {
      credit.contributors.forEach(contributor => {
        parts.push(`Co-authored-by: ${contributor}`)
      })
    }

    return parts.join('\n')
  }, [credit])

  return {
    credit,
    updateCredit,
    clearCredit,
    formatForCommit
  }
}
