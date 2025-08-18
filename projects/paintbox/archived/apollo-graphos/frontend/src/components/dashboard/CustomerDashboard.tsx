import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { GET_CUSTOMERS, GET_ESTIMATES } from '@/graphql/queries'
import { SYNC_CUSTOMER_WITH_SALESFORCE } from '@/graphql/mutations'
import { Customer, CustomerFilter, CustomerStatus } from '@/types'
import { CustomerCard } from './CustomerCard'
import { SearchInput } from '../common/SearchInput'
import { FilterDropdown } from '../common/FilterDropdown'
import { StatusBadge } from '../common/StatusBadge'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorMessage } from '../common/ErrorMessage'

interface CustomerDashboardProps {
  className?: string
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('')
  const [salesforceFilter, setSalesforceFilter] = useState<'synced' | 'unsynced' | ''>('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  // Build filter object
  const filter = useMemo<CustomerFilter>(() => {
    const filterObj: CustomerFilter = {}

    if (searchTerm) {
      filterObj.search = searchTerm
    }

    if (statusFilter) {
      filterObj.status = statusFilter as CustomerStatus
    }

    if (salesforceFilter === 'synced') {
      filterObj.salesforceSynced = true
    } else if (salesforceFilter === 'unsynced') {
      filterObj.salesforceSynced = false
    }

    return filterObj
  }, [searchTerm, statusFilter, salesforceFilter])

  // GraphQL queries
  const {
    data: customersData,
    loading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
    fetchMore
  } = useQuery(GET_CUSTOMERS, {
    variables: {
      filter,
      limit,
      offset: (page - 1) * limit
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true
  })

  const {
    data: estimatesData,
    loading: estimatesLoading
  } = useQuery(GET_ESTIMATES, {
    variables: {
      limit: 100 // Get recent estimates for dashboard stats
    },
    errorPolicy: 'all'
  })

  // Mutations
  const [syncWithSalesforce, { loading: syncLoading }] = useMutation(
    SYNC_CUSTOMER_WITH_SALESFORCE,
    {
      onCompleted: () => {
        refetchCustomers()
      },
      onError: (error) => {
        console.error('Salesforce sync error:', error)
      }
    }
  )

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1) // Reset to first page on search
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as CustomerStatus | '')
    setPage(1)
  }

  const handleSalesforceFilter = (value: string) => {
    setSalesforceFilter(value as 'synced' | 'unsynced' | '')
    setPage(1)
  }

  const handleSyncCustomer = async (customerId: string) => {
    try {
      await syncWithSalesforce({
        variables: { customerId }
      })
    } catch (error) {
      console.error('Failed to sync customer:', error)
    }
  }

  const handleLoadMore = async () => {
    if (customersData?.customers.pageInfo.hasNextPage) {
      await fetchMore({
        variables: {
          offset: page * limit
        }
      })
      setPage(prev => prev + 1)
    }
  }

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const customers = customersData?.customers.edges.map(edge => edge.node) || []
    const estimates = estimatesData?.estimates.edges.map(edge => edge.node) || []

    return {
      totalCustomers: customersData?.customers.totalCount || 0,
      activeCustomers: customers.filter(c => c.status === CustomerStatus.ACTIVE).length,
      syncedCustomers: customers.filter(c => c.salesforceId).length,
      pendingEstimates: estimates.filter(e => e.status === 'DRAFT' || e.status === 'IN_PROGRESS').length
    }
  }, [customersData, estimatesData])

  const customers = customersData?.customers.edges.map(edge => edge.node) || []
  const hasError = customersError || !customersData
  const isLoading = customersLoading && !customersData

  if (hasError && !customersData) {
    return (
      <div className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to load customers"
          message={customersError?.message || 'Unable to fetch customer data'}
          onRetry={() => refetchCustomers()}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage customers and monitor Salesforce sync status
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchCustomers()}
            disabled={customersLoading}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${customersLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowPathIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Salesforce Synced</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.syncedCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Estimates</p>
              <p className="text-2xl font-bold text-gray-900">
                {estimatesLoading ? '...' : dashboardStats.pendingEstimates}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search customers by name, email, or phone..."
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-4">
            <FilterDropdown
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: CustomerStatus.ACTIVE },
                { label: 'Inactive', value: CustomerStatus.INACTIVE },
                { label: 'Prospect', value: CustomerStatus.PROSPECT },
                { label: 'Archived', value: CustomerStatus.ARCHIVED }
              ]}
              value={statusFilter}
              onChange={handleStatusFilter}
              placeholder="Filter by status"
            />

            <FilterDropdown
              options={[
                { label: 'All Sync Status', value: '' },
                { label: 'Synced', value: 'synced' },
                { label: 'Not Synced', value: 'unsynced' }
              ]}
              value={salesforceFilter}
              onChange={handleSalesforceFilter}
              placeholder="Filter by sync status"
            />
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow border">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter || salesforceFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first customer.'}
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Add Customer
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onSync={() => handleSyncCustomer(customer.id)}
                syncLoading={syncLoading}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {customersData?.customers.pageInfo.hasNextPage && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              disabled={customersLoading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {customersLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
