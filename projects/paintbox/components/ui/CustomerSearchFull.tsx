"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Building, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  name: string;
  type: 'contact' | 'account';
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  onCreateNew: () => void;
  placeholder?: string;
  className?: string;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSelectCustomer,
  onCreateNew,
  placeholder = "Search by name, email, or phone...",
  className
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isServiceReady, setIsServiceReady] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Test API connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/v1/salesforce/test');
        const result = await response.json();

        if (result.success && result.connected) {
          setIsServiceReady(true);
          console.log('Salesforce connection verified:', result.data.message);
        } else {
          setError('Salesforce connection failed');
          console.error('Salesforce connection test failed:', result);
        }
      } catch (error) {
        console.error('Failed to test Salesforce connection:', error);
        setError('Unable to connect to Salesforce');
      }
    };

    testConnection();
  }, []);

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2 && isServiceReady) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery, isServiceReady]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    setError(null);

    try {
      // Use the real API endpoint for search
      const response = await fetch(
        `/api/v1/salesforce/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search API returned ${response.status}`);
      }

      const apiResult = await response.json();

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Search failed');
      }

      const { contacts = [], accounts = [] } = apiResult.data;

      // Transform results to common format
      const contactResults: Customer[] = contacts.map((contact: any) => ({
        id: contact.Id,
        name: contact.Name,
        type: 'contact' as const,
        email: contact.Email,
        phone: contact.Phone,
        mobile: contact.MobilePhone,
        address: contact.MailingStreet ? {
          street: contact.MailingStreet,
          city: contact.MailingCity || '',
          state: contact.MailingState || '',
          zip: contact.MailingPostalCode || ''
        } : undefined
      }));

      const accountResults: Customer[] = accounts.map((account: any) => ({
        id: account.Id,
        name: account.Name,
        type: 'account' as const,
        phone: account.Phone,
        address: account.BillingStreet ? {
          street: account.BillingStreet,
          city: account.BillingCity || '',
          state: account.BillingState || '',
          zip: account.BillingPostalCode || ''
        } : undefined
      }));

      const allResults = [...contactResults, ...accountResults];
      setResults(allResults);
      setShowDropdown(allResults.length > 0 || true); // Show even if no results
      setSelectedIndex(-1);

      // Log successful search for debugging
      console.log(`Found ${allResults.length} results for query: ${searchQuery}`);
    } catch (error) {
      console.error('Search failed:', error);
      setError(`Search failed: ${(error as Error).message}`);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectCustomer(results[selectedIndex]);
        } else if (selectedIndex === -1 && query.length > 0) {
          onCreateNew();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ?
        <span key={index} className="font-semibold text-paintbox-primary">{part}</span> :
        part
    );
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-paintbox-primary focus:border-transparent outline-none transition-all"
          disabled={!isServiceReady && !error}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-paintbox-primary animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : results.length === 0 && !isSearching && query.length >= 2 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">No customers found</p>
              <button
                onClick={onCreateNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-paintbox-primary text-white rounded-lg hover:bg-paintbox-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Customer
              </button>
            </div>
          ) : (
            <>
              {results.map((customer, index) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0",
                    selectedIndex === index && "bg-gray-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      customer.type === 'contact' ? "bg-blue-100" : "bg-purple-100"
                    )}>
                      {customer.type === 'contact' ? (
                        <User className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Building className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {highlightMatch(customer.name, query)}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          customer.type === 'contact'
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        )}>
                          {customer.type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                        {customer.email && (
                          <p>{highlightMatch(customer.email, query)}</p>
                        )}
                        {customer.phone && (
                          <p>{highlightMatch(customer.phone, query)}</p>
                        )}
                        {customer.address && (
                          <p className="text-xs text-gray-500">
                            {customer.address.street}, {customer.address.city}, {customer.address.state} {customer.address.zip}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {query.length > 0 && (
                <button
                  onClick={onCreateNew}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3",
                    selectedIndex === results.length && "bg-gray-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Create New Customer</p>
                    <p className="text-sm text-gray-600">Add "{query}" as a new customer</p>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Service Status */}
      {!isServiceReady && !error && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Connecting to Salesforce...
        </p>
      )}
    </div>
  );
};
