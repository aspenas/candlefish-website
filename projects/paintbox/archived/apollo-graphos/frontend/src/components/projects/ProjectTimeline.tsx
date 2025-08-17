import React, { useState, useCallback } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { Calendar, Camera, MapPin, Clock, User, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { GET_PROJECT_TIMELINE, PROJECT_PROGRESS } from '@/graphql/projects';
import { formatDateTime, formatRelativeTime, formatDuration } from '@/utils/formatting';
import type { ProjectTimelineEvent, ProjectStatus } from '@/types/graphql';
import PhotoGallery from './PhotoGallery';

interface ProjectTimelineProps {
  projectId: string;
  className?: string;
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ projectId, className }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showPhotos, setShowPhotos] = useState(false);

  // Query timeline events
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_TIMELINE, {
    variables: { projectId, limit: 100 },
  });

  // Subscribe to new timeline events
  useSubscription(PROJECT_PROGRESS, {
    variables: { projectId },
    onData: ({ data: subscriptionData }) => {
      const newEvent = subscriptionData?.data?.projectProgress;
      if (newEvent) {
        // Refetch to get updated timeline
        refetch();
      }
    },
  });

  const timeline = data?.projectTimeline || [];

  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'photo_uploaded':
      case 'photos_synced':
        return <Camera className="w-5 h-5" />;
      case 'status_changed':
      case 'project_updated':
        return <Clock className="w-5 h-5" />;
      case 'location_updated':
        return <MapPin className="w-5 h-5" />;
      case 'milestone_completed':
        return <Calendar className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'photo_uploaded':
      case 'photos_synced':
        return 'bg-purple-500';
      case 'status_changed':
        return 'bg-blue-500';
      case 'project_updated':
        return 'bg-green-500';
      case 'milestone_completed':
        return 'bg-yellow-500';
      case 'issue_reported':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-error-600 mb-4">Failed to load project timeline</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader
          title="Project Timeline"
          subtitle={`${timeline.length} events`}
          actions={
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPhotos(!showPhotos)}
                leftIcon={<ImageIcon className="w-4 h-4" />}
              >
                {showPhotos ? 'Hide Photos' : 'Show Photos'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                Refresh
              </Button>
            </div>
          }
        />

        <CardContent>
          {/* Photo Gallery */}
          {showPhotos && (
            <div className="mb-8">
              <PhotoGallery projectId={projectId} />
            </div>
          )}

          {/* Timeline */}
          {timeline.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No timeline events yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              {timeline.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={index === timeline.length - 1}
                  isExpanded={expandedEvents.has(event.id)}
                  onToggleExpansion={toggleEventExpansion}
                  getEventIcon={getEventIcon}
                  getEventColor={getEventColor}
                  formatEventType={formatEventType}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Timeline Event Component
interface TimelineEventProps {
  event: ProjectTimelineEvent;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpansion: (eventId: string) => void;
  getEventIcon: (eventType: string) => React.ReactNode;
  getEventColor: (eventType: string) => string;
  formatEventType: (eventType: string) => string;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({
  event,
  isLast,
  isExpanded,
  onToggleExpansion,
  getEventIcon,
  getEventColor,
  formatEventType,
}) => {
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <div className="relative">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
      )}

      <div className="flex items-start space-x-4">
        {/* Event Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white ${getEventColor(event.type)}`}>
          {getEventIcon(event.type)}
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          <Card variant="outlined" padding="md" className="hover:shadow-soft transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {event.title}
                  </h3>
                  <Badge variant="outline" size="sm">
                    {formatEventType(event.type)}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {formatDateTime(event.timestamp)} ({formatRelativeTime(event.timestamp)})
                </p>

                {event.description && (
                  <p className="text-gray-700 mb-3">{event.description}</p>
                )}

                {event.userId && (
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>User: {event.userId}</span>
                  </div>
                )}
              </div>

              {hasMetadata && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpansion(event.id)}
                  rightIcon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                >
                  Details
                </Button>
              )}
            </div>

            {/* Expanded Metadata */}
            {isExpanded && hasMetadata && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <EventMetadata metadata={event.metadata!} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// Event Metadata Component
interface EventMetadataProps {
  metadata: Record<string, unknown>;
}

const EventMetadata: React.FC<EventMetadataProps> = ({ metadata }) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Event Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </dt>
            <dd className="text-sm text-gray-900 mt-1">
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </dd>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTimeline;
