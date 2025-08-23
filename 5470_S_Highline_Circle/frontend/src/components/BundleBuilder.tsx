import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Item, BundleRequest, BundleProposal, UserRole } from '../types';

interface BundleBuilderProps {
  userRole: UserRole;
  initialItems?: Item[];
  onBundleCreated?: (bundle: BundleProposal) => void;
  onClose?: () => void;
}

const BundleBuilder: React.FC<BundleBuilderProps> = ({
  userRole,
  initialItems = [],
  onBundleCreated,
  onClose
}) => {
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Item[]>(initialItems);
  const [bundleName, setBundleName] = useState('');
  const [bundleNotes, setBundleNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAvailableItems();
  }, []);

  useEffect(() => {
    // Calculate suggested total price
    const suggestedTotal = selectedItems.reduce((sum, item) => {
      return sum + (item.asking_price || item.purchase_price || 0);
    }, 0);
    if (suggestedTotal > 0 && !totalPrice) {
      setTotalPrice(Math.round(suggestedTotal * 0.9)); // 10% bundle discount
    }
  }, [selectedItems]);

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      const items = await api.getItems({ decisions: ['Sell'] });
      setAvailableItems(items.filter((item: Item) =>
        !initialItems.some(initial => initial.id === item.id)
      ));
    } catch (error) {
      console.error('Failed to load available items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (item: Item) => {
    if (!selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
      setAvailableItems(availableItems.filter(available => available.id !== item.id));
    }
  };

  const handleRemoveItem = (item: Item) => {
    setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    setAvailableItems([...availableItems, item].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleCreateBundle = async () => {
    if (!bundleName.trim() || selectedItems.length === 0) return;

    setCreating(true);
    try {
      const bundleRequest: BundleRequest = {
        name: bundleName,
        item_ids: selectedItems.map(item => item.id),
        total_price: totalPrice,
        notes: bundleNotes || undefined
      };

      const response = await api.createBundle(bundleRequest, userRole);
      if (response.success) {
        onBundleCreated?.(response.bundle);
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to create bundle:', error);
    } finally {
      setCreating(false);
    }
  };

  const filteredAvailableItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestedPrice = selectedItems.reduce((sum, item) =>
    sum + (item.asking_price || item.purchase_price || 0), 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Bundle
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Available Items */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-3">Available Items</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-500">{item.category}</p>
                          {item.asking_price && (
                            <p className="text-sm font-medium text-green-600">
                              ${item.asking_price.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 p-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredAvailableItems.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-sm">No items available</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bundle Builder */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-3">
                Bundle Items ({selectedItems.length})
              </h3>

              {/* Bundle Name */}
              <input
                type="text"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="Enter bundle name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🛍️</div>
                  <div className="text-sm">Add items to create a bundle</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-500">{item.category}</p>
                          {item.asking_price && (
                            <p className="text-sm font-medium text-green-600">
                              ${item.asking_price.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bundle Details */}
            {selectedItems.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Individual Total:</span>
                    <span>${suggestedPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Bundle Price:</label>
                    <input
                      type="number"
                      value={totalPrice || ''}
                      onChange={(e) => setTotalPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-24 px-2 py-1 text-right border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                  </div>
                  {totalPrice && totalPrice < suggestedPrice && (
                    <div className="text-xs text-green-600 mt-1 text-right">
                      Save ${(suggestedPrice - totalPrice).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <textarea
                  value={bundleNotes}
                  onChange={(e) => setBundleNotes(e.target.value)}
                  placeholder="Add bundle notes (optional)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm"
                  rows={2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedItems.length > 0 && (
              <>
                {selectedItems.length} items selected
                {totalPrice && ` • $${totalPrice.toLocaleString()} total`}
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBundle}
              disabled={!bundleName.trim() || selectedItems.length === 0 || creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Bundle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleBuilder;
