import React, { useState } from 'react';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { 
  EventFilter, 
  SecurityEventType, 
  SecurityEventStatus, 
  Severity 
} from '../../types/security';
import clsx from 'clsx';

interface EventFiltersProps {
  filters: EventFilter;
  onFiltersChange: (filters: EventFilter) => void;
  onClose: () => void;
}

const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<EventFilter>(filters);

  const handleFilterChange = (key: keyof EventFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleArrayFilterToggle = (key: keyof EventFilter, value: string) => {
    const currentArray = (localFilters[key] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const emptyFilters: EventFilter = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== undefined && value !== null && 
    (!Array.isArray(value) || value.length > 0)
  );

  return (
    <div className="soc-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Filter Events</h3>
        <button
          onClick={onClose}
          className="p-1 text-soc-muted hover:text-white transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Event Types */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Event Types
          </label>
          <div className="space-y-2">
            {Object.values(SecurityEventType).map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(localFilters.type || []).includes(type)}
                  onChange={() => handleArrayFilterToggle('type', type)}
                  className="rounded border-soc-border bg-soc-elevated text-security-600 focus:ring-security-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-soc-muted">
                  {type.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Severity Levels */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Severity
          </label>
          <div className="space-y-2">
            {Object.values(Severity).map((severity) => (
              <label key={severity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(localFilters.severity || []).includes(severity)}
                  onChange={() => handleArrayFilterToggle('severity', severity)}
                  className="rounded border-soc-border bg-soc-elevated text-security-600 focus:ring-security-500 focus:ring-offset-0"
                />
                <span className={clsx(
                  'ml-2 text-sm font-medium',
                  severity === Severity.CRITICAL && 'text-critical-400',
                  severity === Severity.HIGH && 'text-warning-400',
                  severity === Severity.MEDIUM && 'text-info-400',
                  severity === Severity.LOW && 'text-success-400'
                )}>
                  {severity}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Status
          </label>
          <div className="space-y-2">
            {Object.values(SecurityEventStatus).map((status) => (
              <label key={status} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(localFilters.status || []).includes(status)}
                  onChange={() => handleArrayFilterToggle('status', status)}
                  className="rounded border-soc-border bg-soc-elevated text-security-600 focus:ring-security-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-soc-muted">
                  {status.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range & Source */}
        <div className="space-y-4">
          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Source
            </label>
            <input
              type="text"
              value={localFilters.source || ''}
              onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
              placeholder="Filter by source..."
              className="soc-input w-full"
            />
          </div>

          {/* Asset ID */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Asset ID
            </label>
            <input
              type="text"
              value={localFilters.assetId || ''}
              onChange={(e) => handleFilterChange('assetId', e.target.value || undefined)}
              placeholder="Filter by asset..."
              className="soc-input w-full"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-soc-muted" />
                <input
                  type="date"
                  value={localFilters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  className="soc-input pl-10 w-full"
                  placeholder="From date"
                />
              </div>
              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-soc-muted" />
                <input
                  type="date"
                  value={localFilters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  className="soc-input pl-10 w-full"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-soc-border">
        <div className="text-sm text-soc-muted">
          {hasActiveFilters ? 'Filters active' : 'No filters applied'}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="px-4 py-2 text-sm text-soc-muted hover:text-white disabled:opacity-50 transition-colors"
          >
            Reset
          </button>
          
          <button
            onClick={applyFilters}
            className="soc-button-primary px-6 py-2"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventFilters;