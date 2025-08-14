import React from 'react'
import {
  CalendarIcon,
  UserIcon,
  PhotoIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { ProjectTimelineEntry, TimelineEventType } from '@/types'
import { formatDate, formatRelativeTime } from '@/utils/formatters'

interface ProjectTimelineProps {
  entries: ProjectTimelineEntry[]
  className?: string
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  entries,
  className = ''
}) => {
  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.CREATED:
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case TimelineEventType.STATUS_CHANGE:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
      case TimelineEventType.PHOTO_UPLOADED:
        return <PhotoIcon className="h-5 w-5 text-blue-600" />
      case TimelineEventType.ESTIMATE_GENERATED:
        return <DocumentTextIcon className="h-5 w-5 text-purple-600" />
      case TimelineEventType.NOTE_ADDED:
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />
      case TimelineEventType.SYNC_COMPLETED:
        return <ArrowPathIcon className="h-5 w-5 text-indigo-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getEventColor = (type: TimelineEventType) => {
    switch (type) {
      case TimelineEventType.CREATED:
        return 'bg-green-100 border-green-200'
      case TimelineEventType.STATUS_CHANGE:
        return 'bg-yellow-100 border-yellow-200'
      case TimelineEventType.PHOTO_UPLOADED:
        return 'bg-blue-100 border-blue-200'
      case TimelineEventType.ESTIMATE_GENERATED:
        return 'bg-purple-100 border-purple-200'
      case TimelineEventType.NOTE_ADDED:
        return 'bg-gray-100 border-gray-200'
      case TimelineEventType.SYNC_COMPLETED:
        return 'bg-indigo-100 border-indigo-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const formatEventType = (type: TimelineEventType) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          Project Timeline ({entries.length} events)
        </h3>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mt-4">No timeline events</h4>
          <p className="text-gray-600 mt-2">
            Timeline events will appear here as the project progresses
          </p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {sortedEntries.map((entry, index) => (
              <li key={entry.id}>
                <div className="relative pb-8">
                  {index !== sortedEntries.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center border ${getEventColor(entry.type)}`}>
                        {getEventIcon(entry.type)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {entry.title}
                          </span>
                        </div>

                        <div className="flex items-center mt-1 space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            <span>{formatDate(entry.timestamp)}</span>
                          </div>

                          <span>•</span>

                          <span>{formatRelativeTime(entry.timestamp)}</span>

                          {entry.userId && (
                            <>
                              <span>•</span>
                              <div className="flex items-center">
                                <UserIcon className="h-3 w-3 mr-1" />
                                <span>{entry.userId}</span>
                              </div>
                            </>
                          )}

                          <span>•</span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {formatEventType(entry.type)}
                          </span>
                        </div>
                      </div>

                      {entry.description && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">{entry.description}</p>
                        </div>
                      )}

                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div className="mt-3">
                          <details className="group">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                              View details
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
                              <pre className="whitespace-pre-wrap text-gray-700">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
