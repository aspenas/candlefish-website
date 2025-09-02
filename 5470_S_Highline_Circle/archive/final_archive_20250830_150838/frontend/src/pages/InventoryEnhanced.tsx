import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { Item, Category, DecisionStatus } from '../types';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import BulkActions from '../components/BulkActions';

const InventoryEnhanced: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedDecisions, setSelectedDecisions] = useState<DecisionStatus[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch items
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  // Fetch rooms for filtering
  const { data: roomsResponse } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
  });

  const rooms = roomsResponse?.rooms || [];

  // Filter items based on search and filters
  const filteredItems = useMemo(() => {
    return items.filter((item: Item) => {
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }

      // Decision filter
      if (selectedDecisions.length > 0 && !selectedDecisions.includes(item.decision)) {
        return false;
      }

      return true;
    }).sort((a: Item, b: Item) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'decision':
          aValue = a.decision;
          bValue = b.decision;
          break;
        case 'price':
          aValue = a.asking_price || a.purchase_price || 0;
          bValue = b.asking_price || b.purchase_price || 0;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [items, searchTerm, selectedCategories, selectedDecisions, sortBy, sortOrder]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const itemIds = selectedItems.length > 0 ? selectedItems : undefined;
    switch (format) {
      case 'excel':
        api.exportExcel(itemIds);
        break;
      case 'pdf':
        api.exportPDF(itemIds);
        break;
      case 'csv':
        api.exportCSV(itemIds);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading inventory...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Error loading inventory</div>
        <div className="text-gray-600">Please try again later</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enhanced Inventory</h1>
          <p className="text-gray-600 mt-1">
            {filteredItems.length} of {items.length} items
            {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium
              ${showFilters
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}
            `}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>

          <div className="relative">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col space-y-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search items by name, category, or room..."
        />

        {showFilters && (
          <FilterPanel
            selectedCategories={selectedCategories}
            selectedDecisions={selectedDecisions}
            onCategoryChange={setSelectedCategories}
            onDecisionChange={setSelectedDecisions}
            rooms={rooms}
            onClear={() => {
              setSelectedCategories([]);
              setSelectedDecisions([]);
            }}
          />
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <BulkActions
          selectedCount={selectedItems.length}
          onExport={handleExport}
          onClearSelection={() => setSelectedItems([])}
        />
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Select All</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border-gray-300 rounded focus:ring-blue-500"
              >
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="decision">Decision</option>
                <option value="price">Price</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-gray-400 hover:text-gray-600"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Decision
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item: Item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.room?.name || 'No room'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${item.decision === 'Keep' ? 'bg-blue-100 text-blue-800' :
                        item.decision === 'Sell' ? 'bg-green-100 text-green-800' :
                        item.decision === 'Sold' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'}
                    `}>
                      {item.decision}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.asking_price
                      ? `$${item.asking_price.toLocaleString()}`
                      : item.purchase_price
                      ? `$${item.purchase_price.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryEnhanced;
