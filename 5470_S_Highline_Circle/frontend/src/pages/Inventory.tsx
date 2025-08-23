import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { Item, Category, Room } from '../types';
import ItemTable from '../components/ItemTable';
import FilterPanel from '../components/FilterPanel';
import SearchBar from '../components/SearchBar';
import BulkActions from '../components/BulkActions';

type SortOrder = 'asc' | 'desc' | null;

export default function Inventory() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item updated successfully');
    },
    onError: () => {
      toast.error('Failed to update item');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: api.bulkUpdateItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Items updated successfully');
      setSelectedItems([]);
    },
    onError: () => {
      toast.error('Failed to update items');
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

  const removeFilter = useCallback((key: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [key]: Array.isArray(prev[key]) ? [] : undefined,
    }));
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No items found</h3>
        <p className="mt-2 text-sm text-gray-500">
          {searchQuery ? (
            <>
              No items match your search for "{searchQuery}".
              <button
                onClick={() => setSearchQuery('')}
                className="block mx-auto mt-4 text-indigo-600 hover:text-indigo-500"
              >
                Clear search
              </button>
            </>
          ) : hasActiveFilters ? (
            <>
              No items match your current filters.
              <button
                onClick={clearAllFilters}
                className="block mx-auto mt-4 text-indigo-600 hover:text-indigo-500"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-1 text-gray-600">
              {data?.total || 0} items total • {selectedItems.length} selected
            </p>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Export All:</span>
              <button
                onClick={() => api.exportExcel()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                Excel
              </button>
              <button
                onClick={() => api.exportPDF()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                PDF
              </button>
              <button
                onClick={() => api.exportCSV()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        onSearch={setSearchQuery}
        placeholder="Search items by name, category, room, or description..."
        initialValue={searchQuery}
        items={data?.items || []}
        showAdvanced={true}
      />

      {/* Active Filters Pills */}
      {(hasActiveFilters || sortBy || searchQuery) && (
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Active Filters</h3>
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-blue-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {sortBy && sortOrder && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                Sort: {sortBy} ({sortOrder})
                <button
                  onClick={() => { setSortBy(null); setSortOrder(null); }}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-purple-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.categories?.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                Categories: {filters.categories.length} selected
                <button
                  onClick={() => removeFilter('categories')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-green-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.decisions?.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                Decisions: {filters.decisions.length} selected
                <button
                  onClick={() => removeFilter('decisions')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-yellow-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.rooms?.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800">
                Rooms: {filters.rooms.length} selected
                <button
                  onClick={() => removeFilter('rooms')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-indigo-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {(filters.minValue !== undefined || filters.maxValue !== undefined) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800">
                Price: ${filters.minValue || 0} - ${filters.maxValue || '∞'}
                <button
                  onClick={() => { removeFilter('minValue'); removeFilter('maxValue'); }}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-emerald-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {(filters.minDate !== undefined || filters.maxDate !== undefined) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                Date Range
                <button
                  onClick={() => { removeFilter('minDate'); removeFilter('maxDate'); }}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-orange-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.isFixture !== undefined && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-pink-100 text-pink-800">
                {filters.isFixture ? 'Fixtures only' : 'Non-fixtures only'}
                <button
                  onClick={() => removeFilter('isFixture')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-pink-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.hasImages !== undefined && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-cyan-100 text-cyan-800">
                {filters.hasImages ? 'With images' : 'Without images'}
                <button
                  onClick={() => removeFilter('hasImages')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-cyan-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}

            {filters.sources?.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-800">
                Sources: {filters.sources.length} selected
                <button
                  onClick={() => removeFilter('sources')}
                  className="ml-2 h-4 w-4 rounded-full hover:bg-slate-200 flex items-center justify-center"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="flex gap-6">
        <div className="w-80">
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            rooms={rooms}
            categories={categories}
            items={data?.items || []}
            showAdvanced={true}
          />
        </div>

        <div className="flex-1">
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
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
          )}

          {/* Items Table */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : !data?.items || data.items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <ItemTable
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
              />

              {/* Results Summary */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    {searchQuery && (
                      <span>Search results for "{searchQuery}" • </span>
                    )}
                    {hasActiveFilters && (
                      <span>Filtered results • </span>
                    )}
                    Showing {data.items.length} of {data.total || data.items.length} items
                    {activeFilterCount > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                      </span>
                    )}
                  </div>
                  {isFetching && (
                    <div className="flex items-center text-sm text-indigo-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-2"></div>
                      Updating...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
