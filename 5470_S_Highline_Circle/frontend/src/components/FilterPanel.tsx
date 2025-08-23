import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  TagIcon,
  CheckCircleIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import type { Item, Category, DecisionStatus, Room } from '../types';
import { format, parseISO, isValid } from 'date-fns';

interface FilterPanelProps {
  filters: {
    categories?: Category[];
    decisions?: DecisionStatus[];
    rooms?: string[];
    minValue?: number;
    maxValue?: number;
    minDate?: string;
    maxDate?: string;
    isFixture?: boolean;
    hasImages?: boolean;
    sources?: string[];
  };
  onFilterChange: (filters: any) => void;
  rooms: Room[];
  categories: Category[];
  items?: Item[];
  showAdvanced?: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: any;
  icon: React.ComponentType<any>;
  color: string;
}

const decisionOptions = [
  { value: 'Keep', label: 'Keep', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'Sell', label: 'Sell', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'Unsure', label: 'Unsure', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'Sold', label: 'Sold', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Donated', label: 'Donated', color: 'bg-purple-100 text-purple-800 border-purple-200' },
] as const;

const getFilterPresets = (items: Item[]): FilterPreset[] => {
  if (!items.length) return [];

  const totalValue = items.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  const avgValue = totalValue / items.length;

  return [
    {
      id: 'high-value',
      name: 'High Value Items',
      filters: { minValue: Math.round(avgValue * 2) },
      icon: CurrencyDollarIcon,
      color: 'text-green-600'
    },
    {
      id: 'for-sale',
      name: 'Items for Sale',
      filters: { decisions: ['Sell'] },
      icon: TagIcon,
      color: 'text-yellow-600'
    },
    {
      id: 'unsure-items',
      name: 'Need Decision',
      filters: { decisions: ['Unsure'] },
      icon: CheckCircleIcon,
      color: 'text-gray-600'
    },
    {
      id: 'furniture-only',
      name: 'Furniture Only',
      filters: { categories: ['Furniture'] },
      icon: HomeIcon,
      color: 'text-indigo-600'
    },
  ];
};

export default function FilterPanel({
  filters,
  onFilterChange,
  rooms,
  categories,
  items = [],
  showAdvanced = true
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    decisions: true,
    rooms: false,
    price: false,
    date: false,
    advanced: false,
  });

  const [priceRange, setPriceRange] = useState({
    min: filters.minValue?.toString() || '',
    max: filters.maxValue?.toString() || ''
  });

  const [dateRange, setDateRange] = useState({
    min: filters.minDate || '',
    max: filters.maxDate || ''
  });

  // Sync local state with filter props
  useEffect(() => {
    setPriceRange({
      min: filters.minValue?.toString() || '',
      max: filters.maxValue?.toString() || ''
    });
  }, [filters.minValue, filters.maxValue]);

  useEffect(() => {
    setDateRange({
      min: filters.minDate || '',
      max: filters.maxDate || ''
    });
  }, [filters.minDate, filters.maxDate]);

  const filterPresets = useMemo(() => getFilterPresets(items), [items]);

  // Get unique sources from items
  const availableSources = useMemo(() => {
    const sources = items
      .map(item => item.source)
      .filter((source): source is string => Boolean(source))
      .filter((source, index, array) => array.indexOf(source) === index)
      .sort();
    return sources;
  }, [items]);

  // Calculate price statistics
  const priceStats = useMemo(() => {
    const prices = items
      .map(item => item.purchase_price)
      .filter((price): price is number => typeof price === 'number' && price > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return { min: 0, max: 10000, avg: 0 };

    return {
      min: Math.floor(prices[0]),
      max: Math.ceil(prices[prices.length - 1]),
      avg: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
    };
  }, [items]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
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
    return count;
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const handleMultiSelectChange = (key: string, value: string, checked: boolean) => {
    const currentValues = (filters[key as keyof typeof filters] as string[]) || [];
    let newValues;

    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }

    handleFilterChange(key, newValues.length ? newValues : undefined);
  };

  // Debounced price range change
  const debouncedPriceChange = useCallback((field: 'min' | 'max', value: string) => {
    const numValue = value ? Number(value) : undefined;
    if (field === 'min') {
      handleFilterChange('minValue', numValue);
    } else {
      handleFilterChange('maxValue', numValue);
    }
  }, [handleFilterChange]);

  // Debounce timer for price changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (priceRange.min !== (filters.minValue?.toString() || '')) {
        debouncedPriceChange('min', priceRange.min);
      }
      if (priceRange.max !== (filters.maxValue?.toString() || '')) {
        debouncedPriceChange('max', priceRange.max);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [priceRange.min, priceRange.max, debouncedPriceChange, filters.minValue, filters.maxValue]);

  // Debounced date range change
  const debouncedDateChange = useCallback((field: 'min' | 'max', value: string) => {
    if (field === 'min') {
      handleFilterChange('minDate', value || undefined);
    } else {
      handleFilterChange('maxDate', value || undefined);
    }
  }, [handleFilterChange]);

  // Debounce timer for date changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dateRange.min !== (filters.minDate || '')) {
        debouncedDateChange('min', dateRange.min);
      }
      if (dateRange.max !== (filters.maxDate || '')) {
        debouncedDateChange('max', dateRange.max);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [dateRange.min, dateRange.max, debouncedDateChange, filters.minDate, filters.maxDate]);

  const handlePriceRangeChange = (field: 'min' | 'max', value: string) => {
    const newPriceRange = { ...priceRange, [field]: value };
    setPriceRange(newPriceRange);
  };

  const handleDateRangeChange = (field: 'min' | 'max', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
  };

  const applyFilterPreset = (preset: FilterPreset) => {
    onFilterChange({
      ...filters,
      ...preset.filters,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({});
    setPriceRange({ min: '', max: '' });
    setDateRange({ min: '', max: '' });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatFilterValue = (key: string, value: any): string => {
    switch (key) {
      case 'categories':
      case 'decisions':
      case 'rooms':
      case 'sources':
        return Array.isArray(value) ? `${value.length} selected` : '';
      case 'minValue':
        return `$${value}+`;
      case 'maxValue':
        return `≤ $${value}`;
      case 'minDate':
        return `After ${format(parseISO(value), 'MMM d, yyyy')}`;
      case 'maxDate':
        return `Before ${format(parseISO(value), 'MMM d, yyyy')}`;
      case 'isFixture':
        return value ? 'Fixtures only' : 'Non-fixtures only';
      case 'hasImages':
        return value ? 'With images' : 'Without images';
      default:
        return String(value);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear all
            </button>
          )}
        </div>

        {/* Filter Presets */}
        {filterPresets.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Quick Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {filterPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyFilterPreset(preset)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Icon className={`h-3 w-3 mr-1.5 ${preset.color}`} />
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter Content */}
      <div className="px-6 py-4 space-y-6">
        {/* Categories Filter */}
        <div>
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Categories</span>
            <div className="flex items-center">
              {filters.categories?.length && (
                <span className="mr-2 text-xs text-indigo-600 font-medium">
                  {filters.categories.length}
                </span>
              )}
              {expandedSections.categories ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.categories && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {categories.map((category) => {
                const isSelected = filters.categories?.includes(category) || false;
                return (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleMultiSelectChange('categories', category, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{category}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Decisions Filter */}
        <div>
          <button
            onClick={() => toggleSection('decisions')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Decision Status</span>
            <div className="flex items-center">
              {filters.decisions?.length && (
                <span className="mr-2 text-xs text-indigo-600 font-medium">
                  {filters.decisions.length}
                </span>
              )}
              {expandedSections.decisions ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.decisions && (
            <div className="mt-3 space-y-2">
              {decisionOptions.map((decision) => {
                const isSelected = filters.decisions?.includes(decision.value) || false;
                return (
                  <label key={decision.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleMultiSelectChange('decisions', decision.value, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${decision.color}`}>
                      {decision.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Rooms Filter */}
        <div>
          <button
            onClick={() => toggleSection('rooms')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Rooms</span>
            <div className="flex items-center">
              {filters.rooms?.length && (
                <span className="mr-2 text-xs text-indigo-600 font-medium">
                  {filters.rooms.length}
                </span>
              )}
              {expandedSections.rooms ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.rooms && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {rooms.map((room) => {
                const isSelected = filters.rooms?.includes(room.name) || false;
                return (
                  <label key={room.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleMultiSelectChange('rooms', room.name, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{room.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{room.floor}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Price Range Filter */}
        <div>
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Price Range</span>
            <div className="flex items-center">
              {(filters.minValue || filters.maxValue) && (
                <span className="mr-2 text-xs text-indigo-600 font-medium">
                  ${filters.minValue || 0} - ${filters.maxValue || '∞'}
                </span>
              )}
              {expandedSections.price ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.price && (
            <div className="mt-3 space-y-3">
              {/* Price statistics */}
              {priceStats.max > 0 && (
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>Min: ${priceStats.min}</span>
                  <span>Avg: ${priceStats.avg}</span>
                  <span>Max: ${priceStats.max}</span>
                </div>
              )}

              {/* Price range inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Minimum</label>
                  <input
                    type="number"
                    placeholder="$0"
                    value={priceRange.min}
                    onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Maximum</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={priceRange.max}
                    onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Quick price buttons */}
              <div className="flex flex-wrap gap-1">
                {priceStats.avg > 0 && [
                  { label: `<$${Math.round(priceStats.avg / 2)}`, max: Math.round(priceStats.avg / 2) },
                  { label: `$${priceStats.avg}+`, min: priceStats.avg },
                  { label: `$${priceStats.avg * 2}+`, min: priceStats.avg * 2 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if ('min' in preset) {
                        handlePriceRangeChange('min', String(preset.min));
                        handlePriceRangeChange('max', '');
                      } else if ('max' in preset) {
                        handlePriceRangeChange('min', '');
                        handlePriceRangeChange('max', String(preset.max));
                      }
                    }}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div>
          <button
            onClick={() => toggleSection('date')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">Purchase Date</span>
            <div className="flex items-center">
              {(filters.minDate || filters.maxDate) && (
                <CalendarIcon className="mr-2 h-3 w-3 text-indigo-600" />
              )}
              {expandedSections.date ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </button>

          {expandedSections.date && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                  <input
                    type="date"
                    value={dateRange.min}
                    onChange={(e) => handleDateRangeChange('min', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                  <input
                    type="date"
                    value={dateRange.max}
                    onChange={(e) => handleDateRangeChange('max', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Quick date buttons */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'This Year', days: 365 },
                  { label: 'Last 6 Months', days: 180 },
                  { label: 'Last Month', days: 30 },
                ].map((preset) => {
                  const date = new Date();
                  date.setDate(date.getDate() - preset.days);
                  const dateStr = date.toISOString().split('T')[0];

                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        handleDateRangeChange('min', dateStr);
                        handleDateRangeChange('max', '');
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div>
            <button
              onClick={() => toggleSection('advanced')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">Advanced Options</span>
              {expandedSections.advanced ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expandedSections.advanced && (
              <div className="mt-3 space-y-4">
                {/* Fixture Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">Item Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="fixture"
                        checked={filters.isFixture === undefined}
                        onChange={() => handleFilterChange('isFixture', undefined)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">All Items</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="fixture"
                        checked={filters.isFixture === true}
                        onChange={() => handleFilterChange('isFixture', true)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Fixtures Only</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="fixture"
                        checked={filters.isFixture === false}
                        onChange={() => handleFilterChange('isFixture', false)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Non-fixtures Only</span>
                    </label>
                  </div>
                </div>

                {/* Images Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">Images</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="images"
                        checked={filters.hasImages === undefined}
                        onChange={() => handleFilterChange('hasImages', undefined)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">All Items</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="images"
                        checked={filters.hasImages === true}
                        onChange={() => handleFilterChange('hasImages', true)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">With Images</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="images"
                        checked={filters.hasImages === false}
                        onChange={() => handleFilterChange('hasImages', false)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Without Images</span>
                    </label>
                  </div>
                </div>

                {/* Sources Filter */}
                {availableSources.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Sources ({availableSources.length})
                    </label>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {availableSources.map((source) => {
                        const isSelected = filters.sources?.includes(source) || false;
                        return (
                          <label key={source} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleMultiSelectChange('sources', source, e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{source}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Footer */}
      {hasActiveFilters && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Active Filters ({activeFilterCount})
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (value === undefined || value === null || value === '' ||
                  (Array.isArray(value) && value.length === 0)) {
                return null;
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                >
                  {formatFilterValue(key, value)}
                  <button
                    onClick={() => {
                      if (key === 'minValue' || key === 'maxValue') {
                        const newPriceRange = { ...priceRange, [key === 'minValue' ? 'min' : 'max']: '' };
                        setPriceRange(newPriceRange);
                      }
                      if (key === 'minDate' || key === 'maxDate') {
                        const newDateRange = { ...dateRange, [key === 'minDate' ? 'min' : 'max']: '' };
                        setDateRange(newDateRange);
                      }
                      handleFilterChange(key, undefined);
                    }}
                    className="ml-1.5 h-3 w-3 rounded-full hover:bg-indigo-200 flex items-center justify-center"
                  >
                    <XMarkIcon className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
