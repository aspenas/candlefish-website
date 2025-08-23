import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { Item, Category, Room } from '../types';
import PremiumItemTable from '../components/PremiumItemTable';
import FilterPanel from '../components/FilterPanel';
import SearchBar from '../components/SearchBar';
import BulkActions from '../components/BulkActions';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import ProgressRing from '../components/ProgressRing';
import { ToastProvider, useToast } from '../components/ToastProvider';
import { ViewDensityProvider, ViewDensitySelector, useViewDensity } from '../contexts/ViewDensityContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

type SortOrder = 'asc' | 'desc' | null;

// Wrapper component to provide contexts
export default function InventoryEnhanced() {
  return (
    <ToastProvider>
      <ViewDensityProvider>
        <InventoryContent />
      </ViewDensityProvider>
    </ToastProvider>
  );
}

function InventoryContent() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [filters, setFilters] = useState({
    categories: [] as Category[],
    decisions: [] as string[],
    rooms: [] as string[],
    minValue: undefined as number | undefined,
    maxValue: undefined as number | undefined,
    minDate: undefined as string | undefined,
    maxDate: undefined as string | undefined,
    isFixture: undefined as boolean | undefined,
    hasImages: undefined as boolean | undefined,
    sources: [] as string[],
  });

  // Fetch rooms and categories for filters
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
  });

  const rooms = useMemo(() => {
    if (!roomsData?.rooms) return [];
    return roomsData.rooms.map((room: any) => ({
      id: room.id,
      name: room.name,
      floor: room.floor || 'Unknown',
    })) as Room[];
  }, [roomsData]);

  const categories: Category[] = [
    'Furniture',
    'Art / Decor',
    'Electronics',
    'Lighting',
    'Rug / Carpet',
    'Plant (Indoor)',
    'Planter (Indoor)',
    'Outdoor Planter/Plant',
    'Planter Accessory',
    'Other'
  ];

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['items', filters, searchQuery, sortBy, sortOrder],
    queryFn: () => {
      if (searchQuery) {
        const searchParams = new URLSearchParams({ q: searchQuery });

        // Add sort params to search
        if (sortBy && sortOrder) {
          searchParams.set('sort_by', sortBy);
          searchParams.set('sort_order', sortOrder);
        }

        return api.searchItems(Object.fromEntries(searchParams));
      }

      // Build filter params for API
      const params = new URLSearchParams();

      if (filters.categories?.length) {
        params.set('categories', filters.categories.join(','));
      }
      if (filters.decisions?.length) {
        params.set('decisions', filters.decisions.join(','));
      }
      if (filters.rooms?.length) {
        params.set('rooms', filters.rooms.join(','));
      }
      if (filters.minValue !== undefined) {
        params.set('minValue', filters.minValue.toString());
      }
      if (filters.maxValue !== undefined) {
        params.set('maxValue', filters.maxValue.toString());
      }
      if (filters.minDate !== undefined) {
        params.set('date_from', filters.minDate);
      }
      if (filters.maxDate !== undefined) {
        params.set('date_to', filters.maxDate);
      }
      if (filters.isFixture !== undefined) {
        params.set('isFixture', filters.isFixture.toString());
      }
      if (filters.hasImages !== undefined) {
        params.set('has_images', filters.hasImages.toString());
      }
      if (filters.sources?.length) {
        params.set('sources', filters.sources.join(','));
      }

      // Add sort params to filter
      if (sortBy && sortOrder) {
        params.set('sort_by', sortBy);
        params.set('sort_order', sortOrder);
      }

      return api.filterItems(params);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (item: Partial<Item> & { id: string }) => api.updateItem(item.id, item),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      if (variables.decision) {
        toast.success(
          'Decision saved!',
          `${data?.name || 'Item'} marked as ${variables.decision}`,
          {
            label: 'Undo',
            onClick: () => {
              updateItemMutation.mutate({ id: variables.id, decision: 'Unsure' });
            }
          }
        );
      } else {
        toast.success('Item updated successfully');
      }
    },
    onError: (error, variables) => {
      toast.error(
        'Update failed',
        `Could not update ${variables.decision ? 'decision for' : ''} item`,
        {
          label: 'Retry',
          onClick: () => updateItemMutation.mutate(variables)
        }
      );
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: api.bulkUpdateItems,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      const count = variables.itemIds.length;
      toast.success(
        `Updated ${count} items`,
        variables.decision ? `All marked as ${variables.decision}` : 'Changes applied successfully'
      );
      setSelectedItems([]);
    },
    onError: (error, variables) => {
      toast.error(
        'Bulk update failed',
        `Could not update ${variables.itemIds.length} items`,
        {
          label: 'Retry',
          onClick: () => bulkUpdateMutation.mutate(variables)
        }
      );
    },
  });

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      // Cycle through: asc -> desc -> null
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortBy(null);
        setSortOrder(null);
      }
    } else {
      // New field, start with asc
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Keyboard navigation integration
  const keyboardNav = useKeyboardNavigation({
    items: data?.items || [],
    selectedItems,
    onSelectItem: (id) => {
      setSelectedItems(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    },
    onSelectAll: setSelectedItems,
    onUpdateItem: updateItemMutation.mutate,
    onEdit: (id) => {
      window.location.href = `/item/${id}`;
    },
    enabled: !showKeyboardHelp,
  });

  const clearAllFilters = useCallback(() => {
    setFilters({
      categories: [],
      decisions: [],
      rooms: [],
      minValue: undefined,
      maxValue: undefined,
      minDate: undefined,
      maxDate: undefined,
      isFixture: undefined,
      hasImages: undefined,
      sources: [],
    });
    setSortBy(null);
    setSortOrder(null);
    setSearchQuery('');
  }, []);

  // Global keyboard shortcuts
  const globalShortcuts = [
    {
      key: '/',
      description: 'Focus search',
      action: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: 'f',
      description: 'Toggle filter panel',
      action: () => {
        setFilterPanelOpen(prev => !prev);
      },
    },
    {
      key: 'c',
      description: 'Clear all filters',
      action: clearAllFilters,
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => {
        setShowKeyboardHelp(true);
      },
    },
  ];

  useKeyboardShortcuts(globalShortcuts, !showKeyboardHelp);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.categories?.length > 0 ||
      filters.decisions?.length > 0 ||
      filters.rooms?.length > 0 ||
      filters.minValue !== undefined ||
      filters.maxValue !== undefined ||
      filters.minDate !== undefined ||
      filters.maxDate !== undefined ||
      filters.isFixture !== undefined ||
      filters.hasImages !== undefined ||
      filters.sources?.length > 0
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories?.length) count++;
    if (filters.decisions?.length) count++;
    if (filters.rooms?.length) count++;
    if (filters.minValue || filters.maxValue) count++;
    if (filters.minDate || filters.maxDate) count++;
    if (filters.isFixture !== undefined) count++;
    if (filters.hasImages !== undefined) count++;
    if (filters.sources?.length) count++;
    if (sortBy) count++;
    if (searchQuery) count++;
    return count;
  }, [filters, sortBy, searchQuery]);

  const removeFilter = useCallback((key: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [key]: Array.isArray(prev[key]) ? [] : undefined,
    }));
  }, []);

  // Enhanced Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="card-solid overflow-hidden">
      <div className="loading-shimmer">
        <div className="px-6 py-4 border-b border-neutral-200">
          <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-neutral-100">
            <div className="flex space-x-4">
              <div className="h-4 bg-neutral-200 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/5 animate-pulse"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/6 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Enhanced Empty state component
  const EmptyState = () => (
    <div className="card-solid">
      <div className="px-6 py-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
          <Squares2X2Icon className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-neutral-900">No items found</h3>
        <p className="mt-2 text-neutral-600">
          {searchQuery ? (
            <>
              No items match your search for "{searchQuery}".
              <button
                onClick={() => setSearchQuery('')}
                className="block mx-auto mt-4 btn-ghost"
              >
                Clear search
              </button>
            </>
          ) : hasActiveFilters ? (
            <>
              No items match your current filters.
              <button
                onClick={clearAllFilters}
                className="block mx-auto mt-4 btn-ghost"
              >
                Clear all filters
              </button>
            </>
          ) : (
            'Start by adding items to your inventory.'
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Header */}
        <div className="card-solid p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">Inventory Management</h1>
                <p className="text-neutral-600">
                  {data?.total || 0} items total • {selectedItems.length} selected
                </p>

                {/* Progress indicator */}
                {data?.items && data.items.length > 0 && (
                  <div className="mt-4 flex items-center space-x-4">
                    <div className="text-sm text-neutral-600">
                      {keyboardNav.decisionProgress.decided} of {keyboardNav.decisionProgress.total} decided
                    </div>
                    <div className="w-32 bg-neutral-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${keyboardNav.decisionProgress.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-700">
                      {keyboardNav.decisionProgress.percentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Ring */}
              {data?.items && data.items.length > 0 && (
                <ProgressRing
                  progress={keyboardNav.decisionProgress.percentage}
                  size={80}
                  className="flex-shrink-0"
                />
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* View Density Selector */}
              <ViewDensitySelector />

              {/* Help Button */}
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="btn-ghost p-2 rounded-xl"
                title="Keyboard shortcuts (Press ?)"
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>

              {/* Export Buttons */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-neutral-600">Export:</span>
                <button
                  onClick={() => api.exportExcel()}
                  className="btn-secondary text-sm py-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                  Excel
                </button>
                <button
                  onClick={() => api.exportPDF()}
                  className="btn-secondary text-sm py-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                  PDF
                </button>
                <button
                  onClick={() => api.exportCSV()}
                  className="btn-secondary text-sm py-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <SearchBar
          ref={searchInputRef}
          onSearch={setSearchQuery}
          placeholder="Search items by name, category, room, or description... (Press / to focus)"
          initialValue={searchQuery}
          items={data?.items || []}
          showAdvanced={true}
        />

        {/* Active Filters Pills with premium styling */}
        {(hasActiveFilters || sortBy || searchQuery) && (
          <div className="card-solid p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-700">Active Filters</h3>
              <button
                onClick={clearAllFilters}
                className="btn-ghost text-sm flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear all (C)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Filter pills with enhanced styling */}
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 h-4 w-4 rounded-full hover:bg-primary-200 flex items-center justify-center transition-colors"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}

              {/* Additional filter pills would go here with similar premium styling */}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex gap-6">
          {/* Filter Panel */}
          {filterPanelOpen && (
            <div className="w-80 flex-shrink-0">
              <FilterPanel
                filters={filters}
                onFilterChange={setFilters}
                rooms={rooms}
                categories={categories}
                items={data?.items || []}
                showAdvanced={true}
              />
            </div>
          )}

          <div className="flex-1">
            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mb-6">
                <BulkActions
                  selectedItems={selectedItems}
                  onBulkUpdate={(itemIds, updates) => {
                    bulkUpdateMutation.mutate({
                      itemIds,
                      ...updates,
                    });
                  }}
                  onClearSelection={() => setSelectedItems([])}
                  totalItems={data?.total || 0}
                />
              </div>
            )}

            {/* Items Table with premium styling */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : !data?.items || data.items.length === 0 ? (
              <EmptyState />
            ) : (
              <div>
                <PremiumItemTable
                  items={data.items}
                  selectedItems={selectedItems}
                  onSelectItem={(id) => {
                    setSelectedItems((prev) =>
                      prev.includes(id)
                        ? prev.filter((i) => i !== id)
                        : [...prev, id]
                    );
                  }}
                  onSelectAll={(ids) => setSelectedItems(ids)}
                  onUpdateItem={updateItemMutation.mutate}
                  onSort={handleSort}
                  sortBy={sortBy || ''}
                  sortOrder={sortOrder || 'asc'}
                  getRowProps={keyboardNav.getRowProps}
                />

                {/* Enhanced Results Summary */}
                <div className="mt-4 px-6 py-4 bg-neutral-50/50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-neutral-600">
                      {searchQuery && (
                        <span>Search results for "{searchQuery}" • </span>
                      )}
                      {hasActiveFilters && (
                        <span>Filtered results • </span>
                      )}
                      Showing <span className="font-semibold">{data.items.length}</span> of <span className="font-semibold">{data.total || data.items.length}</span> items
                      {activeFilterCount > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                        </span>
                      )}
                    </div>
                    {isFetching && (
                      <div className="flex items-center text-sm text-primary-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-2"></div>
                        Updating...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showKeyboardHelp}
          onClose={() => setShowKeyboardHelp(false)}
          shortcuts={[...keyboardNav.shortcuts, ...globalShortcuts]}
        />
      </div>
    </div>
  );
}
