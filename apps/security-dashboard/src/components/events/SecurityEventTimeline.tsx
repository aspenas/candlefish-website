import React, { useState, useMemo } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarDaysIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { useEvents, useUpdateEventStatus } from '../../hooks/useApi';
import { useDashboardStore } from '../../store/dashboardStore';
import { useNotificationStore } from '../../store/notificationStore';
import { SecurityEvent, SecurityEventType, SecurityEventStatus, Severity } from '../../types/security';
import EventCard from './EventCard';
import EventFilters from './EventFilters';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import clsx from 'clsx';

interface SecurityEventTimelineProps {
  showFilters?: boolean;
  maxEvents?: number;
}

const SecurityEventTimeline: React.FC<SecurityEventTimelineProps> = ({
  showFilters = true,
  maxEvents = 50,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { eventFilter, setEventFilter } = useDashboardStore();
  const { addNotification } = useNotificationStore();

  // Fetch events with filters
  const {
    data: eventsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useEvents(eventFilter, page, limit);

  // Mutation for updating event status
  const updateEventStatusMutation = useUpdateEventStatus({
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Event Updated',
        message: 'Event status updated successfully',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update event status',
      });
    },
  });

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!eventsResponse?.data?.items) return [];
    
    let events = eventsResponse.data.items;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      events = events.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.source.toLowerCase().includes(query) ||
        event.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Limit results if specified
    if (maxEvents && events.length > maxEvents) {
      events = events.slice(0, maxEvents);
    }
    
    return events;
  }, [eventsResponse?.data?.items, searchQuery, maxEvents]);

  // Group events by date for timeline display
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, SecurityEvent[]>();
    
    filteredEvents.forEach(event => {
      const date = format(parseISO(event.timestamp), 'yyyy-MM-dd');
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(event);
    });
    
    // Sort groups by date (newest first)
    return Array.from(groups.entries())
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredEvents]);

  const handleEventStatusUpdate = async (eventId: string, status: SecurityEventStatus) => {
    await updateEventStatusMutation.mutateAsync({
      eventId,
      status,
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (filters: any) => {
    setEventFilter(filters);
    setPage(1); // Reset to first page when filtering
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading security events..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load security events"
        message={error?.message || 'Unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  const totalEvents = eventsResponse?.data?.total || 0;
  const totalPages = eventsResponse?.data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Security Event Timeline</h2>
          <p className="text-soc-muted mt-1">
            {totalEvents} events found
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="soc-input pl-10 w-64"
            />
          </div>
          
          {/* Filters Toggle */}
          {showFilters && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={clsx(
                'soc-button-secondary px-3 py-2',
                showFiltersPanel && 'bg-security-950 border-security-700'
              )}
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <EventFilters
          filters={eventFilter}
          onFiltersChange={handleFilterChange}
          onClose={() => setShowFiltersPanel(false)}
        />
      )}

      {/* Timeline */}
      {groupedEvents.length === 0 ? (
        <div className="soc-card p-12 text-center">
          <ClockIcon className="w-16 h-16 text-soc-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Events Found</h3>
          <p className="text-soc-muted">
            {searchQuery ? 'Try adjusting your search query' : 'No security events match the current filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEvents.map(([date, events]) => (
            <div key={date} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-6">
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="w-5 h-5 text-security-400" />
                  <h3 className="text-lg font-semibold text-white">
                    {format(parseISO(date), 'MMMM dd, yyyy')}
                  </h3>
                </div>
                <div className="flex-1 ml-6 h-px bg-soc-border"></div>
                <span className="ml-6 text-sm text-soc-muted">
                  {events.length} events
                </span>
              </div>

              {/* Events for this date */}
              <div className="space-y-4 pl-8">
                {events.map((event, index) => (
                  <div key={event.id} className="relative">
                    {/* Timeline connector */}
                    <div className="absolute -left-4 top-6 w-2 h-2 bg-security-500 rounded-full border-2 border-soc-background"></div>
                    {index < events.length - 1 && (
                      <div className="absolute -left-3 top-8 w-px h-full bg-soc-border"></div>
                    )}
                    
                    {/* Event Card */}
                    <EventCard
                      event={event}
                      onStatusUpdate={handleEventStatusUpdate}
                      onSelect={setSelectedEvent}
                      isSelected={selectedEvent?.id === event.id}
                      isUpdating={updateEventStatusMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between soc-card p-4">
          <div className="text-sm text-soc-muted">
            Page {page} of {totalPages} ({totalEvents} total events)
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="soc-button-secondary px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages, page - 2 + i));
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={clsx(
                      'px-3 py-1 text-sm rounded',
                      pageNum === page
                        ? 'bg-security-600 text-white'
                        : 'text-soc-muted hover:text-white'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="soc-button-secondary px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityEventTimeline;