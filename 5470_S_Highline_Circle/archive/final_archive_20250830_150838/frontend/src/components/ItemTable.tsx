import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  DocumentTextIcon,
  LinkIcon,
  CameraIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

interface ItemTableProps {
  items: any[];
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onUpdateItem: (item: any) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc' | null;
}

export default function ItemTable({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onUpdateItem,
  onSort,
  sortBy,
  sortOrder,
}: ItemTableProps) {
  const allSelected = items.length > 0 && items.every(item => selectedItems.includes(item.id));
  const someSelected = items.some(item => selectedItems.includes(item.id));

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return <div className="w-4 h-4 opacity-30 hover:opacity-60">
        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
      </div>;
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 text-indigo-600" />
    ) : sortOrder === 'desc' ? (
      <ChevronDownIcon className="w-4 h-4 text-indigo-600" />
    ) : (
      <div className="w-4 h-4 opacity-30 hover:opacity-60">
        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
      </div>
    );
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'Keep':
        return 'bg-green-100 text-green-800';
      case 'Sell':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sold':
        return 'bg-blue-100 text-blue-800';
      case 'Donated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSource = (item: any) => {
    if (!item.source) return null;

    const source = item.source;
    const sourceLower = source.toLowerCase();

    // Known vendor invoices with specific formatting
    const vendorInvoices: Record<string, { color: string, icon: any, display: string }> = {
      'Holly Downs Invoice': { color: 'text-purple-600', icon: DocumentTextIcon, display: 'Holly Downs' },
      'DWR Invoice': { color: 'text-blue-600', icon: DocumentTextIcon, display: 'Design Within Reach' },
      'RH Invoice': { color: 'text-indigo-600', icon: DocumentTextIcon, display: 'Restoration Hardware' },
      'Nix Communications Invoice': { color: 'text-green-600', icon: DocumentTextIcon, display: 'Nix Communications' },
      '11 Ravens Invoice': { color: 'text-red-600', icon: DocumentTextIcon, display: '11 Ravens' },
      'Lovesac Invoices': { color: 'text-pink-600', icon: DocumentTextIcon, display: 'Lovesac' },
      'Peloton Invoice': { color: 'text-gray-700', icon: DocumentTextIcon, display: 'Peloton' },
      'Bluecube Invoice': { color: 'text-cyan-600', icon: DocumentTextIcon, display: 'Bluecube' },
    };

    // Check for known vendor invoices
    if (vendorInvoices[source]) {
      const vendor = vendorInvoices[source];
      const Icon = vendor.icon;

      // Parse invoice ref for Holly Downs format (date | inv number | description)
      let invoiceDisplay = item.invoice_ref;
      if (item.invoice_ref && item.invoice_ref.includes('|')) {
        const parts = item.invoice_ref.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          invoiceDisplay = parts[1]; // Show just the invoice number
        }
      }

      return (
        <div className={`flex items-center space-x-1 text-xs ${vendor.color}`}>
          <Icon className="h-3 w-3" />
          <span className="font-medium" title={item.invoice_ref || source}>{vendor.display}</span>
          {invoiceDisplay && invoiceDisplay !== item.invoice_ref && (
            <span className="text-gray-500" title={item.invoice_ref}>{invoiceDisplay}</span>
          )}
        </div>
      );
    }

    // Bloom & Flourish sources
    if (source.includes('Bloom & Flourish')) {
      return (
        <div className="flex items-center space-x-1 text-xs text-green-600">
          <DocumentIcon className="h-3 w-3" />
          <span className="font-medium">Bloom & Flourish</span>
          {source.includes('pending') && (
            <span className="text-gray-500">(pending)</span>
          )}
        </div>
      );
    }

    // Photo/Visual sources
    if (sourceLower.includes('photo') || sourceLower.includes('visual')) {
      const extraInfo = source.includes('Design Within Reach') ? ' (DWR)' : '';
      return (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <CameraIcon className="h-3 w-3" />
          <span>Visual Estimate{extraInfo}</span>
        </div>
      );
    }

    // Generic invoice sources
    if (sourceLower.includes('invoice') || sourceLower.includes('receipt')) {
      return (
        <div className="flex items-center space-x-1 text-xs text-blue-600">
          <DocumentTextIcon className="h-3 w-3" />
          <span className="font-medium">Invoice</span>
          {item.invoice_ref && (
            <span className="text-gray-500">#{item.invoice_ref}</span>
          )}
        </div>
      );
    }

    // Web sources
    if (sourceLower.includes('http') || sourceLower.includes('www') || sourceLower.includes('.com')) {
      return (
        <div className="flex items-center space-x-1 text-xs">
          <LinkIcon className="h-3 w-3 text-blue-600" />
          <a
            href={source.startsWith('http') ? source : `https://${source}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Website
          </a>
        </div>
      );
    }

    // Default source display
    return (
      <div className="text-xs text-gray-600" title={source}>
        {source.length > 30 ? source.substring(0, 27) + '...' : source}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) {
                    onSelectAll([]);
                  } else {
                    onSelectAll(items.map(item => item.id));
                  }
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center space-x-1">
                <span>Item</span>
                <SortIcon field="name" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('room')}
            >
              <div className="flex items-center space-x-1">
                <span>Room</span>
                <SortIcon field="room" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('category')}
            >
              <div className="flex items-center space-x-1">
                <span>Category</span>
                <SortIcon field="category" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('price')}
            >
              <div className="flex items-center space-x-1">
                <span>Price & Source</span>
                <SortIcon field="price" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => onSort('decision')}
            >
              <div className="flex items-center space-x-1">
                <span>Decision</span>
                <SortIcon field="decision" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className={selectedItems.includes(item.id) ? 'bg-indigo-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => onSelectItem(item.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4">
                <Link
                  to={`/item/${item.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  {item.name}
                </Link>
                {item.is_fixture && (
                  <span className="ml-2 text-xs text-gray-500">(Fixture)</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.room || 'Unassigned'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.category}
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">
                    {item.price ? (
                      <span title={`Source: ${item.source || 'Unknown'}`}>
                        {formatCurrency(item.price)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  {item.price > 0 && renderSource(item)}
                  {!item.price && item.source && (
                    <div className="text-xs text-gray-400 italic">
                      No price • {renderSource(item)}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={item.decision}
                  onChange={(e) => {
                    console.log('Updating item decision:', { id: item.id, decision: e.target.value });
                    onUpdateItem({ id: item.id, decision: e.target.value });
                  }}
                  disabled={false} // TODO: Add loading state when update is in progress
                  className={`text-xs rounded-full px-2 py-1 font-semibold ${getDecisionColor(item.decision)}`}
                >
                  <option value="Keep">Keep</option>
                  <option value="Sell">Sell</option>
                  <option value="Unsure">Unsure</option>
                  <option value="Sold">Sold</option>
                  <option value="Donated">Donated</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <Link
                  to={`/item/${item.id}`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <PencilIcon className="h-5 w-5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
