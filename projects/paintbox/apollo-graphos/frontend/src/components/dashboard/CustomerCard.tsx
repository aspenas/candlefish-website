import React from 'react'
import {
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Customer } from '@/types'
import { StatusBadge } from '../common/StatusBadge'
import { formatDate, formatPhoneNumber } from '@/utils/formatters'

interface CustomerCardProps {
  customer: Customer
  onSync: () => void
  syncLoading: boolean
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onSync,
  syncLoading
}) => {
  const getSyncStatusColor = (customer: Customer) => {
    if (!customer.salesforceId) return 'text-gray-500'

    if (!customer.lastSyncAt) return 'text-yellow-600'

    const lastSync = new Date(customer.lastSyncAt)
    const now = new Date()
    const daysSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceSync > 7) return 'text-red-600'
    if (daysSinceSync > 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getSyncStatusText = (customer: Customer) => {
    if (!customer.salesforceId) return 'Not synced'

    if (!customer.lastSyncAt) return 'Never synced'

    const lastSync = new Date(customer.lastSyncAt)
    const now = new Date()
    const daysSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceSync < 1) return 'Synced today'
    if (daysSinceSync < 2) return 'Synced yesterday'
    return `Synced ${Math.floor(daysSinceSync)} days ago`
  }

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {customer.name}
              </h3>
              <div className="flex items-center space-x-4 mt-1">
                <StatusBadge status={customer.status} />
                {customer.salesforceId && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    SF: {customer.salesforceId.slice(-6)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
            {customer.email && (
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center space-x-2">
                <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>{formatPhoneNumber(customer.phone)}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-center space-x-2">
                <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{customer.address}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>Created {formatDate(customer.createdAt)}</span>
            </div>

            {customer.updatedAt !== customer.createdAt && (
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>Updated {formatDate(customer.updatedAt)}</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <ArrowPathIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className={getSyncStatusColor(customer)}>
                {getSyncStatusText(customer)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onSync}
            disabled={syncLoading || !customer.salesforceId}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!customer.salesforceId ? 'Customer not linked to Salesforce' : 'Sync with Salesforce'}
          >
            <ArrowPathIcon className={`h-3 w-3 mr-1 ${syncLoading ? 'animate-spin' : ''}`} />
            Sync
          </button>

          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
            <EyeIcon className="h-3 w-3 mr-1" />
            View
          </button>

          <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
            <PencilIcon className="h-3 w-3 mr-1" />
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
