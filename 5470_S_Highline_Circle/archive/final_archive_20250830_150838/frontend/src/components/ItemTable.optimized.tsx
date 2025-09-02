import React, { useMemo, useCallback, memo } from 'react';
import { useVirtual } from '@tanstack/react-virtual';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../utils/format';

interface ItemTableProps {
  items: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onPhotoUpload?: (item: any) => void;
  onAddNote?: (item: any) => void;
  selectedItems?: Set<string>;
  onToggleSelect?: (itemId: string) => void;
  onSelectAll?: () => void;
}

// Memoized table row component
const TableRow = memo(({ 
  item, 
  onEdit, 
  onDelete, 
  onPhotoUpload, 
  onAddNote, 
  isSelected,
  onToggleSelect,
  style 
}: any) => {
  const handleToggle = useCallback(() => {
    onToggleSelect?.(item.id);
  }, [item.id, onToggleSelect]);

  return (
    <div 
      style={style}
      className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
    >
      {onToggleSelect && (
        <div className="w-12">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </div>
      )}
      
      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        {/* Thumbnail */}
        <div className="col-span-1">
          {item.images && item.images.length > 0 ? (
            <img
              src={item.images[0]}
              alt={item.name}
              loading="lazy"
              className="h-12 w-12 object-cover rounded"
            />
          ) : (
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
              <PhotoIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="col-span-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {item.category}
          </div>
        </div>

        {/* Room */}
        <div className="col-span-1 text-sm text-gray-900 dark:text-gray-100">
          {item.roomName || item.room}
        </div>

        {/* Value */}
        <div className="col-span-1 text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(item.value || 0)}
        </div>

        {/* Status */}
        <div className="col-span-1">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            item.status === 'keep' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : item.status === 'sell'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}>
            {item.status || 'Unsure'}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Edit item"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {onPhotoUpload && (
            <button
              onClick={() => onPhotoUpload(item)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Upload photo"
            >
              <PhotoIcon className="h-4 w-4" />
            </button>
          )}
          {onAddNote && (
            <button
              onClick={() => onAddNote(item)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Add note"
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Delete item"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

TableRow.displayName = 'TableRow';

export default function ItemTableOptimized({
  items,
  onEdit,
  onDelete,
  onPhotoUpload,
  onAddNote,
  selectedItems = new Set(),
  onToggleSelect,
  onSelectAll,
}: ItemTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Sort items
  const [sortField, setSortField] = React.useState<string>('name');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'value') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDirection]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtual({
    size: sortedItems.length,
    parentRef,
    estimateSize: useCallback(() => 80, []), // Estimated row height
    overscan: 5, // Number of items to render outside viewport
  });

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const SortIcon = useCallback(({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4" />
      : <ChevronDownIcon className="h-4 w-4" />;
  }, [sortField, sortDirection]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
      {/* Table Header */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center">
          {onToggleSelect && (
            <div className="w-12">
              <input
                type="checkbox"
                checked={selectedItems.size === items.length && items.length > 0}
                onChange={() => onSelectAll?.()}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
          )}
          
          <div className="flex-1 grid grid-cols-7 gap-4">
            <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Photo
            </div>
            <button
              onClick={() => handleSort('name')}
              className="col-span-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center hover:text-gray-700 dark:hover:text-gray-300"
            >
              Name <SortIcon field="name" />
            </button>
            <button
              onClick={() => handleSort('room')}
              className="col-span-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center hover:text-gray-700 dark:hover:text-gray-300"
            >
              Room <SortIcon field="room" />
            </button>
            <button
              onClick={() => handleSort('value')}
              className="col-span-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center hover:text-gray-700 dark:hover:text-gray-300"
            >
              Value <SortIcon field="value" />
            </button>
            <button
              onClick={() => handleSort('status')}
              className="col-span-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center hover:text-gray-700 dark:hover:text-gray-300"
            >
              Status <SortIcon field="status" />
            </button>
            <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.virtualItems.map((virtualRow) => {
            const item = sortedItems[virtualRow.index];
            return (
              <TableRow
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                onPhotoUpload={onPhotoUpload}
                onAddNote={onAddNote}
                isSelected={selectedItems.has(item.id)}
                onToggleSelect={onToggleSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {sortedItems.length} items
            {selectedItems.size > 0 && ` (${selectedItems.size} selected)`}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Virtual scrolling enabled for performance
          </div>
        </div>
      </div>
    </div>
  );
}