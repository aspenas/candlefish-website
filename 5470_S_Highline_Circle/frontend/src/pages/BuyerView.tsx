import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  PhotoIcon,
  MapPinIcon,
  TagIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';

interface ItemCardProps {
  item: any;
}

function ItemCard({ item }: ItemCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {item.images && item.images.length > 0 ? (
        <div className="aspect-w-4 aspect-h-3">
          <img
            src={item.images[0]}
            alt={item.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden w-full h-48 bg-gray-100 flex items-center justify-center">
            <PhotoIcon className="h-12 w-12 text-gray-400" />
          </div>
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
          <PhotoIcon className="h-12 w-12 text-gray-400" />
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {item.name}
          </h3>
          <span className="text-xl font-bold text-green-600 ml-4 flex-shrink-0">
            {formatCurrency(item.appraisedValue || item.purchasePrice || 0)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          {item.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <TagIcon className="h-3 w-3 mr-1" />
              {item.category}
            </span>
          )}
          {item.room && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <MapPinIcon className="h-3 w-3 mr-1" />
              {item.room}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Item #{item.itemNumber}</span>
          {item.purchaseDate && (
            <span className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {new Date(item.purchaseDate).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyerView() {
  const [sortBy, setSortBy] = useState('value-desc');
  const [filterCategory, setFilterCategory] = useState('');

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', { decision: 'sell' }],
    queryFn: () => api.getItems({ decision: 'sell', limit: 1000 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.getItems({ limit: 1000 });
      const uniqueCategories = [...new Set(response.items.map((item: any) => item.category).filter(Boolean))];
      return uniqueCategories.sort();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const items = itemsData?.items || [];

  // Filter and sort items
  let filteredItems = items.filter((item: any) =>
    !filterCategory || item.category === filterCategory
  );

  switch (sortBy) {
    case 'value-desc':
      filteredItems.sort((a: any, b: any) =>
        (b.appraisedValue || b.purchasePrice || 0) - (a.appraisedValue || a.purchasePrice || 0)
      );
      break;
    case 'value-asc':
      filteredItems.sort((a: any, b: any) =>
        (a.appraisedValue || a.purchasePrice || 0) - (b.appraisedValue || b.purchasePrice || 0)
      );
      break;
    case 'name':
      filteredItems.sort((a: any, b: any) => a.name.localeCompare(b.name));
      break;
    case 'category':
      filteredItems.sort((a: any, b: any) => (a.category || '').localeCompare(b.category || ''));
      break;
  }

  const totalValue = filteredItems.reduce((sum: number, item: any) =>
    sum + (item.appraisedValue || item.purchasePrice || 0), 0
  );

  const handleExport = (format: string) => {
    if (format === 'pdf') {
      api.exportBuyerView();
    } else if (format === 'excel') {
      api.exportExcel();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingBagIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buyer View</h1>
              <p className="mt-1 text-gray-600">
                Items marked for sale - {filteredItems.length} items, {formatCurrency(totalValue)} total value
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Filter
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Categories</option>
              {categories?.map((category: string) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="value-desc">Value (High to Low)</option>
              <option value="value-asc">Value (Low to High)</option>
              <option value="name">Name (A-Z)</option>
              <option value="category">Category</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Summary
            </label>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-600">
                {filteredItems.length} items
              </span>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item: any) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items for sale</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterCategory
                ? `No items in the ${filterCategory} category are marked for sale.`
                : 'No items have been marked for sale yet.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Estate Sale Information</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>5470 S Highline Circle</p>
              <p>Private Estate Sale</p>
              <p>All items professionally appraised</p>
              <p>Serious inquiries only</p>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-900 mb-2">Viewing & Purchase</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Viewing by appointment only</p>
              <p>Items sold as-is, where-is</p>
              <p>Payment: Cash, certified check, or wire transfer</p>
              <p>Buyer responsible for pickup/shipping</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
