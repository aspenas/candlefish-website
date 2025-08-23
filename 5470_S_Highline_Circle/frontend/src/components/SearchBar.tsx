import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  BookmarkIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import type { Item } from '../types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onAdvancedSearch?: (filters: AdvancedSearchFilters) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
  items?: Item[];
  showAdvanced?: boolean;
}

interface AdvancedSearchFilters {
  query: string;
  fields: string[];
  fuzzy: boolean;
  priceRange?: { min?: number; max?: number };
  categories?: string[];
  rooms?: string[];
  decisions?: string[];
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: AdvancedSearchFilters;
  createdAt: string;
}

export default function SearchBar({
  onSearch,
  onAdvancedSearch,
  placeholder = "Search items...",
  initialValue = '',
  debounceMs = 300,
  items = [],
  showAdvanced = true
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('inventory-saved-searches');
    const history = localStorage.getItem('inventory-search-history');

    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse saved searches');
      }
    }

    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.warn('Failed to parse search history');
      }
    }
  }, []);

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery);
      // Add to search history
      addToSearchHistory(debouncedQuery);
    } else {
      onSearch('');
    }
  }, [debouncedQuery, onSearch]);

  // Generate search suggestions based on items and history
  const suggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) {
      return searchHistory.slice(0, 5).map(term => ({
        type: 'history' as const,
        text: term,
        subtitle: 'Recent search'
      }));
    }

    const queryLower = query.toLowerCase();
    const itemSuggestions: Array<{type: 'item' | 'category' | 'room' | 'history', text: string, subtitle: string}> = [];

    // Add item name suggestions (fuzzy matching)
    items.forEach(item => {
      if (item.name.toLowerCase().includes(queryLower)) {
        itemSuggestions.push({
          type: 'item',
          text: item.name,
          subtitle: `${item.category} in ${item.room?.name || 'Unknown room'}`
        });
      }
    });

    // Add category suggestions
    const categories = [...new Set(items.map(item => item.category))];
    categories.forEach(category => {
      if (category.toLowerCase().includes(queryLower)) {
        itemSuggestions.push({
          type: 'category',
          text: category,
          subtitle: 'Category'
        });
      }
    });

    // Add room suggestions
    const rooms = [...new Set(items.map(item => item.room?.name).filter(Boolean))] as string[];
    rooms.forEach(room => {
      if (room.toLowerCase().includes(queryLower)) {
        itemSuggestions.push({
          type: 'room',
          text: room,
          subtitle: 'Room'
        });
      }
    });

    // Add relevant search history
    const historyMatches = searchHistory.filter(term =>
      term.toLowerCase().includes(queryLower) && term !== query
    ).slice(0, 3);

    historyMatches.forEach(term => {
      itemSuggestions.push({
        type: 'history',
        text: term,
        subtitle: 'Recent search'
      });
    });

    return itemSuggestions.slice(0, 8);
  }, [query, items, searchHistory]);

  const addToSearchHistory = (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(term => term !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, 20);
      localStorage.setItem('inventory-search-history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setSelectedSuggestionIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      const suggestion = suggestions[selectedSuggestionIndex];
      setQuery(suggestion.text);
      onSearch(suggestion.text);
    } else {
      onSearch(query);
    }
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: typeof suggestions[0]) => {
    setQuery(suggestion.text);
    onSearch(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const saveCurrentSearch = () => {
    if (!query.trim()) return;

    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      query,
      createdAt: new Date().toISOString()
    };

    setSavedSearches(prev => {
      const updated = [newSavedSearch, ...prev].slice(0, 10);
      localStorage.setItem('inventory-saved-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    onSearch(savedSearch.query);
    setShowSuggestions(false);
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(prev => {
      const updated = prev.filter(search => search.id !== id);
      localStorage.setItem('inventory-saved-searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('inventory-search-history');
  };

  const getQuickFilters = () => {
    if (!items.length) return [];

    const totalValue = items.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const avgValue = totalValue / items.length;

    return [
      { label: 'High Value', query: `value:>${Math.round(avgValue * 2)}` },
      { label: 'Recent', query: 'added:this-week' },
      { label: 'Furniture', query: 'category:Furniture' },
      { label: 'To Sell', query: 'decision:sell' },
      { label: 'Unsure', query: 'decision:unsure' },
    ];
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="block w-full pl-10 pr-24 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            autoComplete="off"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
            {query && (
              <button
                type="button"
                onClick={saveCurrentSearch}
                className="h-5 w-5 text-gray-400 hover:text-indigo-600 focus:outline-none"
                title="Save search"
              >
                <BookmarkIcon className="h-5 w-5" />
              </button>
            )}
            {showAdvanced && (
              <button
                type="button"
                onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
                className={`h-5 w-5 focus:outline-none ${
                  showAdvancedPanel ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
                }`}
                title="Advanced search"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
            )}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="h-5 w-5 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Clear search"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (suggestions.length > 0 || savedSearches.length > 0) && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-200 rounded-md max-h-96 overflow-auto"
          >
            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  Saved Searches
                </div>
                {savedSearches.slice(0, 3).map((savedSearch) => (
                  <div
                    key={savedSearch.id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                    onClick={() => loadSavedSearch(savedSearch)}
                  >
                    <div className="flex items-center">
                      <BookmarkSolidIcon className="h-4 w-4 text-indigo-500 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{savedSearch.name}</div>
                        <div className="text-xs text-gray-500">{savedSearch.query}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedSearch(savedSearch.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                {!query.trim() && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    Recent Searches
                  </div>
                )}
                {suggestions.map((suggestion, index) => {
                  const isSelected = index === selectedSuggestionIndex;
                  const Icon = suggestion.type === 'history' ? ClockIcon :
                             suggestion.type === 'category' ? FunnelIcon : MagnifyingGlassIcon;

                  return (
                    <div
                      key={`${suggestion.type}-${suggestion.text}-${index}`}
                      className={`px-3 py-2 cursor-pointer flex items-center ${
                        isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Icon className={`h-4 w-4 mr-3 ${
                        isSelected ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{suggestion.text}</div>
                        <div className="text-xs text-gray-500">{suggestion.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Clear History Option */}
            {!query.trim() && searchHistory.length > 0 && (
              <div className="border-t border-gray-100">
                <button
                  onClick={clearSearchHistory}
                  className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                >
                  Clear search history
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Filters */}
        {!query && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-500 self-center">Quick filters:</span>
              {getQuickFilters().map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setQuery(filter.query);
                    onSearch(filter.query);
                  }}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Search Display */}
        {query && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              <MagnifyingGlassIcon className="h-3 w-3 mr-1" />
              Searching: "{query}"
            </span>
            {searchHistory.includes(query) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <ClockIcon className="h-3 w-3 mr-1" />
                Recent
              </span>
            )}
          </div>
        )}

        {/* Search tips */}
        {!query && !showSuggestions && (
          <div className="mt-3 text-xs text-gray-500">
            <p className="mb-1"><strong>Search tips:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Search by item name, category, room, or description</li>
              <li>Use <code className="bg-gray-100 px-1 rounded">category:Furniture</code> to filter by category</li>
              <li>Use <code className="bg-gray-100 px-1 rounded">value:&gt;1000</code> for price ranges</li>
              <li>Use <code className="bg-gray-100 px-1 rounded">decision:sell</code> to filter by status</li>
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
