import React, { useState } from 'react';
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  QuestionMarkCircleIcon,
  GiftIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

import { api } from '../services/api';

interface BulkActionsProps {
  selectedItems: string[];
  onBulkUpdate: (itemIds: string[], updates: any) => void;
  onClearSelection: () => void;
  totalItems: number;
}

const decisions = [
  { value: 'keep', label: 'Keep', icon: CheckCircleIcon, color: 'bg-green-600 hover:bg-green-700' },
  { value: 'sell', label: 'Sell', icon: CurrencyDollarIcon, color: 'bg-yellow-600 hover:bg-yellow-700' },
  { value: 'unsure', label: 'Unsure', icon: QuestionMarkCircleIcon, color: 'bg-gray-600 hover:bg-gray-700' },
  { value: 'donated', label: 'Donated', icon: GiftIcon, color: 'bg-purple-600 hover:bg-purple-700' },
  { value: 'sold', label: 'Sold', icon: CurrencyDollarIcon, color: 'bg-blue-600 hover:bg-blue-700' },
];

export default function BulkActions({
  selectedItems,
  onBulkUpdate,
  onClearSelection,
  totalItems
}: BulkActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);

  const selectedCount = selectedItems.length;

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkDecision = async (decision: string) => {
    if (showConfirmation !== decision) {
      setShowConfirmation(decision);
      return;
    }

    setIsLoading(true);
    try {
      await onBulkUpdate(selectedItems, { decision });
      onClearSelection();
      setShowConfirmation(null);
    } catch (error) {
      console.error('Bulk update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: string) => {
    switch (format) {
      case 'excel':
        api.exportExcel(selectedItems);
        break;
      case 'pdf':
        api.exportPDF(selectedItems);
        break;
      case 'csv':
        api.exportCSV(selectedItems);
        break;
    }
  };

  const handleDelete = async () => {
    if (showConfirmation !== 'delete') {
      setShowConfirmation('delete');
      return;
    }

    setIsLoading(true);
    try {
      await onBulkUpdate(selectedItems, { deleted: true });
      onClearSelection();
      setShowConfirmation(null);
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmation(null);
  };

  return (
    <div className="bg-white shadow rounded-lg border border-indigo-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">
                {selectedCount} of {totalItems} items selected
              </span>
            </div>
          </div>

          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Decision Actions */}
          {decisions.map((decision) => {
            const Icon = decision.icon;
            const isConfirming = showConfirmation === decision.value;

            return (
              <button
                key={decision.value}
                onClick={() => handleBulkDecision(decision.value)}
                disabled={isLoading}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                  isConfirming
                    ? 'bg-red-600 hover:bg-red-700'
                    : decision.color
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {isConfirming ? `Confirm ${decision.label}` : `Mark as ${decision.label}`}
              </button>
            );
          })}

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Export:</span>
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              PDF
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              CSV
            </button>
          </div>

          {/* Delete Action */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              showConfirmation === 'delete'
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <TrashIcon className="h-4 w-4 mr-1.5" />
            {showConfirmation === 'delete' ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>

        {/* Confirmation Message */}
        {showConfirmation && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-sm text-yellow-800">
                {showConfirmation === 'delete'
                  ? `Are you sure you want to delete ${selectedCount} items? This action cannot be undone.`
                  : `This will update ${selectedCount} items. Click the button again to confirm.`
                }
              </p>
              <button
                onClick={cancelConfirmation}
                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
            Processing {selectedCount} items...
          </div>
        )}
      </div>
    </div>
  );
}
