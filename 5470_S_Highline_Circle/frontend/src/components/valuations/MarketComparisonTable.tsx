import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  LinkIcon,
  PhotoIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { MarketComparison, MarketDataSource } from '../../types';

interface MarketComparisonTableProps {
  comparisons: MarketComparison[];
  currentValuation?: number;
  onViewDetails?: (comparison: MarketComparison) => void;
  onViewImages?: (comparison: MarketComparison) => void;
  onOpenSource?: (comparison: MarketComparison) => void;
  className?: string;
  maxRows?: number;
}

type SortField = 'sale_price' | 'sale_date' | 'similarity_score';
type SortDirection = 'asc' | 'desc';

const getSourceIcon = (source: MarketDataSource) => {
  const icons = {
    ebay: '🛒',
    auction_houses: '🔨',
    retail: '🏪',
    insurance: '📋',
    estate_sales: '🏠',
  };
  return icons[source] || '💼';
};

const getSourceColor = (source: MarketDataSource) => {
  const colors = {
    ebay: 'bg-blue-100 text-blue-800',
    auction_houses: 'bg-purple-100 text-purple-800',
    retail: 'bg-green-100 text-green-800',
    insurance: 'bg-gray-100 text-gray-800',
    estate_sales: 'bg-amber-100 text-amber-800',
  };
  return colors[source] || 'bg-gray-100 text-gray-800';
};

const getSimilarityColor = (score: number) => {
  if (score >= 0.8) return 'text-green-600 bg-green-50';
  if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
  if (score >= 0.4) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const MarketComparisonTable: React.FC<MarketComparisonTableProps> = ({
  comparisons,
  currentValuation,
  onViewDetails,
  onViewImages,
  onOpenSource,
  className,
  maxRows = 10,
}) => {
  const [sortField, setSortField] = useState<SortField>('similarity_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdjustments, setShowAdjustments] = useState(false);

  const sortedComparisons = useMemo(() => {
    const sorted = [...comparisons].sort((a, b) => {
      let aValue: number | Date;
      let bValue: number | Date;

      switch (sortField) {
        case 'sale_price':
          aValue = a.sale_price;
          bValue = b.sale_price;
          break;
        case 'sale_date':
          aValue = new Date(a.sale_date);
          bValue = new Date(b.sale_date);
          break;
        case 'similarity_score':
          aValue = a.similarity_score;
          bValue = b.similarity_score;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return maxRows ? sorted.slice(0, maxRows) : sorted;
  }, [comparisons, sortField, sortDirection, maxRows]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  if (comparisons.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg border border-gray-200 p-8', className)}>
        <div className="text-center">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No market comparisons</h3>
          <p className="mt-1 text-sm text-gray-500">
            Market comparison data will appear here when available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Market Comparisons</h3>
            <p className="text-sm text-gray-500">
              {comparisons.length} comparable items found
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdjustments(!showAdjustments)}
              className={clsx(
                'inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md',
                showAdjustments
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              )}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Adjustments
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sale_price')}
              >
                <div className="flex items-center">
                  Sale Price
                  <SortIcon field="sale_price" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sale_date')}
              >
                <div className="flex items-center">
                  Sale Date
                  <SortIcon field="sale_date" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('similarity_score')}
              >
                <div className="flex items-center">
                  Similarity
                  <SortIcon field="similarity_score" />
                </div>
              </th>
              {showAdjustments && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adjustments
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedComparisons.map((comparison) => (
              <tr key={comparison.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {comparison.comparable_item_title}
                    </div>
                    {comparison.comparable_item_description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {comparison.comparable_item_description}
                      </div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">
                      {getSourceIcon(comparison.source)}
                    </span>
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                      getSourceColor(comparison.source)
                    )}>
                      {comparison.source.replace('_', ' ')}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(comparison.sale_price)}
                    </span>
                    {currentValuation && (
                      <div className={clsx(
                        'ml-2 text-xs',
                        comparison.sale_price > currentValuation ? 'text-green-600' : 'text-red-600'
                      )}>
                        ({comparison.sale_price > currentValuation ? '+' : ''}
                        {((comparison.sale_price - currentValuation) / currentValuation * 100).toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                  {format(parseISO(comparison.sale_date), 'MMM d, yyyy')}
                </td>

                <td className="px-6 py-4">
                  <div className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getSimilarityColor(comparison.similarity_score)
                  )}>
                    {Math.round(comparison.similarity_score * 100)}%
                  </div>
                </td>

                {showAdjustments && (
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {comparison.condition_adjustment !== 0 && (
                        <div className="flex items-center text-xs">
                          <span className="text-gray-500 mr-1">Condition:</span>
                          <span className={comparison.condition_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                            {comparison.condition_adjustment > 0 ? '+' : ''}
                            {(comparison.condition_adjustment * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                      {comparison.market_adjustment !== 0 && (
                        <div className="flex items-center text-xs">
                          <span className="text-gray-500 mr-1">Market:</span>
                          <span className={comparison.market_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                            {comparison.market_adjustment > 0 ? '+' : ''}
                            {(comparison.market_adjustment * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                )}

                <td className="px-6 py-4 text-right space-x-2">
                  {comparison.images && comparison.images.length > 0 && onViewImages && (
                    <button
                      onClick={() => onViewImages(comparison)}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm"
                      title="View images"
                    >
                      <PhotoIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {comparison.source_url && onOpenSource && (
                    <button
                      onClick={() => onOpenSource(comparison)}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm"
                      title="View source"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(comparison)}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-sm"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Avg Sale Price:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCurrency(sortedComparisons.reduce((acc, c) => acc + c.sale_price, 0) / sortedComparisons.length)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Avg Similarity:</span>
            <span className="ml-2 font-medium text-gray-900">
              {Math.round(sortedComparisons.reduce((acc, c) => acc + c.similarity_score, 0) / sortedComparisons.length * 100)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Price Range:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatCurrency(Math.min(...sortedComparisons.map(c => c.sale_price)))} - 
              {formatCurrency(Math.max(...sortedComparisons.map(c => c.sale_price)))}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Data Sources:</span>
            <span className="ml-2 font-medium text-gray-900">
              {new Set(sortedComparisons.map(c => c.source)).size}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketComparisonTable;