import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { Item, Category, Room } from '../types';
import ItemTable from '../components/ItemTable';
import FilterPanel from '../components/FilterPanel';
import SearchBar from '../components/SearchBar';
import BulkActions from '../components/BulkActions';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['items', filters, searchQuery],
    queryFn: () => {
      if (searchQuery) {
        return api.searchItems({ q: searchQuery });
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
      if (filters.isFixture !== undefined) {
        params.set('isFixture', filters.isFixture.toString());
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

  const handleSort = (field: string) => {
    // Handle sorting locally for now
    console.log('Sort by:', field);
  };

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
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <>
                <ItemTable
                  items={data?.items || []}
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
                  sortBy="name"
                  sortOrder="asc"
                />

                {/* Results Summary */}
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="text-sm text-gray-700">
                    {searchQuery && (
                      <span>Search results for "{searchQuery}" • </span>
                    )}
                    {hasActiveFilters && (
                      <span>Filtered results • </span>
                    )}
                    Showing {data?.items?.length || 0} of {data?.total || 0} items
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
