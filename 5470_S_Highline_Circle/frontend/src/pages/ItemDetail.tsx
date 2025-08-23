import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  MapPinIcon,
  TagIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';

const decisions = [
  { value: 'keep', label: 'Keep', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'sell', label: 'Sell', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'unsure', label: 'Unsure', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'donated', label: 'Donated', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-800 border-blue-200' },
];

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => api.getItem(id!),
    enabled: !!id,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: any) => api.updateItem(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteItem(id!),
    onSuccess: () => {
      navigate('/inventory');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Item not found</h3>
          <p className="text-gray-600 mb-4">The requested item could not be found.</p>
          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  const startEditing = () => {
    setEditForm({ ...item });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm({});
    setIsEditing(false);
  };

  const saveChanges = () => {
    updateMutation.mutate(editForm);
  };

  const handleDecisionChange = (decision: string) => {
    updateMutation.mutate({ decision });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleDuplicate = () => {
    const duplicate = { ...item };
    delete duplicate.id;
    duplicate.name = `${duplicate.name} (Copy)`;
    // This would typically create a new item
    console.log('Duplicating item:', duplicate);
  };

  const currentDecision = decisions.find(d => d.value === item.decision);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/inventory')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-3xl font-bold bg-transparent border-b-2 border-gray-300 focus:border-indigo-500 focus:outline-none"
                  />
                ) : (
                  item.name
                )}
              </h1>
              <p className="mt-1 text-gray-600">Item #{item.itemNumber}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDuplicate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                  Duplicate
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveChanges}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditing}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Images</h2>
            {item.images && item.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {item.images.map((image: string, index: number) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-lg">
                    <img
                      src={image}
                      alt={`${item.name} ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(image, '_blank')}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
                <span className="ml-2 text-gray-500">No images available</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Description</h2>
            {isEditing ? (
              <textarea
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter item description..."
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {item.description || 'No description available'}
              </p>
            )}
          </div>

          {/* Additional Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Additional Details</h2>
            <div className="space-y-4">
              {item.dimensions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dimensions</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.dimensions || ''}
                      onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{item.dimensions}</p>
                  )}
                </div>
              )}

              {item.condition && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  {isEditing ? (
                    <select
                      value={editForm.condition || ''}
                      onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select condition</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900">{item.condition}</p>
                  )}
                </div>
              )}

              {item.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{item.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Decision Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Decision Status</h2>
            {currentDecision ? (
              <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${currentDecision.color} mb-4`}>
                {currentDecision.label}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200 mb-4">
                No Decision
              </span>
            )}

            {!isEditing && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Change decision:</p>
                <div className="flex flex-wrap gap-2">
                  {decisions.map((decision) => (
                    <button
                      key={decision.value}
                      onClick={() => handleDecisionChange(decision.value)}
                      disabled={updateMutation.isPending}
                      className={`px-3 py-1 text-xs font-medium rounded-full border hover:opacity-80 ${
                        item.decision === decision.value
                          ? decision.color
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {decision.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Item Information</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <TagIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  ) : (
                    <p className="font-medium">{item.category || 'Uncategorized'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Room</p>
                  {isEditing ? (
                    <select
                      value={editForm.room || ''}
                      onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="">Select room</option>
                      {rooms?.rooms?.map((room: any) => (
                        <option key={room.id} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium">{item.room || 'No room assigned'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Appraised Value</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.appraisedValue || ''}
                      onChange={(e) => setEditForm({ ...editForm, appraisedValue: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      step="0.01"
                    />
                  ) : (
                    <p className="font-medium text-lg text-green-600">
                      {formatCurrency(item.appraisedValue || 0)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Purchase Price</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.purchasePrice || ''}
                      onChange={(e) => setEditForm({ ...editForm, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      step="0.01"
                    />
                  ) : (
                    <p className="font-medium">
                      {formatCurrency(item.purchasePrice || 0)}
                    </p>
                  )}
                </div>
              </div>

              {item.purchaseDate && (
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Purchase Date</p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.purchaseDate ? editForm.purchaseDate.split('T')[0] : ''}
                        onChange={(e) => setEditForm({ ...editForm, purchaseDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    ) : (
                      <p className="font-medium">
                        {new Date(item.purchaseDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
