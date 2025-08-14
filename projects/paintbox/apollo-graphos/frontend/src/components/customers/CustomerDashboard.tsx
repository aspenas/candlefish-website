import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Plus, Filter, MoreVertical, MapPin, Phone, Mail } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { SEARCH_CUSTOMERS } from '@/graphql/customers';
import { useAppStore, useUIActions, useFormActions } from '@/store';
import type { Customer, CustomerFilter, CustomerStatus } from '@/types/graphql';
import { formatCurrency, formatDate } from '@/utils/formatting';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';

interface CustomerDashboardProps {
  className?: string;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const { selectedCustomerId } = useAppStore((state) => state.ui);
  const { setSelectedCustomer } = useUIActions();
  const { openCustomerForm } = useFormActions();

  // Build filter object
  const filter = useMemo((): CustomerFilter => {
    const filterObj: CustomerFilter = {};

    if (searchTerm.trim()) {
      filterObj.search = searchTerm.trim();
    }

    if (statusFilter !== 'ALL') {
      filterObj.status = statusFilter as CustomerStatus;
    }

    return filterObj;
  }, [searchTerm, statusFilter]);

  // GraphQL query
  const { data, loading, error, refetch, fetchMore } = useQuery(SEARCH_CUSTOMERS, {
    variables: {
      filter,
      limit: 20,
      offset: 0,
    },
    notifyOnNetworkStatusChange: true,
  });

  const customers = data?.customers?.edges?.map(edge => edge.node) || [];
  const totalCount = data?.customers?.totalCount || 0;
  const hasNextPage = data?.customers?.pageInfo?.hasNextPage || false;

  // Load more customers
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loading) {
      fetchMore({
        variables: {
          offset: customers.length,
        },
      });
    }
  }, [hasNextPage, loading, fetchMore, customers.length]);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customerId: string) => {
    setSelectedCustomer(customerId);
  }, [setSelectedCustomer]);

  // Handle new customer
  const handleNewCustomer = useCallback(() => {
    openCustomerForm('create');
  }, [openCustomerForm]);

  // Handle edit customer
  const handleEditCustomer = useCallback((customer: Customer) => {
    openCustomerForm('edit', customer);
  }, [openCustomerForm]);

  // Status badge variant
  const getStatusVariant = (status: CustomerStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'secondary';
      case 'PROSPECT':
        return 'warning';
      case 'ARCHIVED':
        return 'error';
      default:
        return 'default';
    }
  };

  if (selectedCustomerId) {
    return (
      <CustomerDetails
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomer(undefined)}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader
          title="Customer Management"
          subtitle={`${totalCount} customers total`}
          actions={
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Filters
              </Button>
              <Button
                size="sm"
                onClick={handleNewCustomer}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Customer
              </Button>
            </div>
          }
        />

        <CardContent>
          {/* Search Bar */}
          <div className="mb-6">
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              fullWidth
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'ALL')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && customers.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-error-600 mb-4">Failed to load customers</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && customers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No customers found</p>
              <Button onClick={handleNewCustomer} leftIcon={<Plus className="w-4 h-4" />}>
                Add Your First Customer
              </Button>
            </div>
          )}

          {/* Customer List */}
          {customers.length > 0 && (
            <div className="space-y-4">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onSelect={handleCustomerSelect}
                  onEdit={handleEditCustomer}
                  getStatusVariant={getStatusVariant}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasNextPage && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                loading={loading}
              >
                Load More Customers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerForm />
    </div>
  );
};

// Customer Card Component
interface CustomerCardProps {
  customer: Customer;
  onSelect: (id: string) => void;
  onEdit: (customer: Customer) => void;
  getStatusVariant: (status: CustomerStatus) => string;
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onSelect,
  onEdit,
  getStatusVariant,
}) => {
  return (
    <Card
      variant="outlined"
      padding="md"
      className="hover:shadow-medium transition-shadow cursor-pointer"
      onClick={() => onSelect(customer.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {customer.name}
            </h3>
            <Badge variant={getStatusVariant(customer.status) as any}>
              {customer.status.toLowerCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
            {customer.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="truncate">
                  {customer.address.city}, {customer.address.state}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Projects:</span>
              <span className="ml-1 font-medium">{customer.totalProjects}</span>
            </div>
            <div>
              <span className="text-gray-500">Revenue:</span>
              <span className="ml-1 font-medium">{formatCurrency(customer.totalRevenue)}</span>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Created {formatDate(customer.createdAt)}
          </div>
        </div>

        <div className="flex-shrink-0 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(customer);
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default CustomerDashboard;
