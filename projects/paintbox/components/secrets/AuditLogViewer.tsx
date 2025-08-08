'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { AuditEvent } from './types';

interface AuditLogViewerProps {
  className?: string;
  pageSize?: number;
}

interface Filters {
  service: string;
  action: string;
  success: 'all' | 'success' | 'failure';
  dateFrom: string;
  dateTo: string;
  search: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  className,
  pageSize = 50
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filters, setFilters] = useState<Filters>({
    service: 'all',
    action: 'all',
    success: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  const fetchAuditEvents = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.service !== 'all' && { service: filters.service }),
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.success !== 'all' && { success: filters.success }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/v1/audit/events?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch audit events: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      setTotalEvents(data.total || 0);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
      // Mock data for development
      setEvents([
        {
          id: '1',
          timestamp: '2024-01-20T10:30:00Z',
          service: 'salesforce',
          action: 'token_refresh',
          user: 'system',
          ip: '10.0.1.45',
          success: true,
          details: 'OAuth token refreshed successfully'
        },
        {
          id: '2',
          timestamp: '2024-01-20T10:25:00Z',
          service: 'companycam',
          action: 'api_call',
          user: 'john.doe@company.com',
          ip: '192.168.1.100',
          success: false,
          error: 'Rate limit exceeded',
          details: 'Failed to upload photo batch'
        },
        {
          id: '3',
          timestamp: '2024-01-20T09:45:00Z',
          service: 'secrets',
          action: 'secret_access',
          user: 'system',
          ip: '10.0.1.45',
          success: true,
          details: 'Retrieved SALESFORCE_CLIENT_SECRET'
        }
      ]);
      setTotalEvents(3);
    } finally {
      setLoading(false);
    }
  };

  const exportEvents = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(filters.service !== 'all' && { service: filters.service }),
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.success !== 'all' && { success: filters.success }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`/api/v1/audit/events/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      // Mock CSV export
      const csvData = events.map(event =>
        `${event.timestamp},${event.service},${event.action},${event.user || ''},${event.success},${event.details || event.error || ''}`
      ).join('\n');

      const blob = new Blob([`timestamp,service,action,user,success,details\n${csvData}`], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      service: 'all',
      action: 'all',
      success: 'all',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchAuditEvents(currentPage);
  }, [filters, currentPage]);

  const uniqueServices = useMemo(() => {
    const services = [...new Set(events.map(e => e.service))];
    return services.sort();
  }, [events]);

  const uniqueActions = useMemo(() => {
    const actions = [...new Set(events.map(e => e.action))];
    return actions.sort();
  }, [events]);

  const totalPages = Math.ceil(totalEvents / pageSize);

  const getStatusColor = (success: boolean) => {
    return success
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit Log Viewer</h2>
          <p className="text-gray-600">
            Security and access event history ({totalEvents} total events)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportEvents} variant="outline">
            Export CSV
          </Button>
          <Button onClick={() => fetchAuditEvents(currentPage)}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={filters.service}
              onChange={(e) => updateFilter('service', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Services</option>
              {uniqueServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.success}
              onChange={(e) => updateFilter('success', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button onClick={clearFilters} variant="ghost">
            Clear Filters
          </Button>
          <span className="text-sm text-gray-600">
            Showing {Math.min(pageSize, events.length)} of {totalEvents} events
          </span>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">⚠</span>
            <span className="text-yellow-800 font-medium">API Connection Error</span>
          </div>
          <p className="text-yellow-700 mt-1">
            {error} - Showing mock data for development
          </p>
        </Card>
      )}

      {/* Events Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading audit events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No events found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(event.timestamp)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        {event.service}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.action.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {event.user || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.success)}`}>
                        {event.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {event.details || event.error || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Event Details</h3>
                <Button
                  onClick={() => setSelectedEvent(null)}
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Timestamp:</span>
                    <p className="text-sm">{formatTimestamp(selectedEvent.timestamp)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Service:</span>
                    <p className="text-sm">{selectedEvent.service}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Action:</span>
                    <p className="text-sm">{selectedEvent.action}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">User:</span>
                    <p className="text-sm">{selectedEvent.user || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">IP Address:</span>
                    <p className="text-sm font-mono">{selectedEvent.ip || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.success)}`}>
                      {selectedEvent.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </div>

                {(selectedEvent.details || selectedEvent.error) && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">
                      {selectedEvent.success ? 'Details:' : 'Error:'}
                    </span>
                    <p className="text-sm mt-1 p-3 bg-gray-50 rounded border">
                      {selectedEvent.details || selectedEvent.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
