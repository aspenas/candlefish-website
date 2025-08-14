import React, { useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Calendar, DollarSign, Building2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { GET_CUSTOMER, GET_CUSTOMER_HISTORY, CUSTOMER_UPDATED } from '@/graphql/customers';
import { useFormActions } from '@/store';
import type { Customer, CustomerStatus } from '@/types/graphql';
import { formatCurrency, formatDate, formatAddress, formatPhoneNumber } from '@/utils/formatting';

interface CustomerDetailsProps {
  customerId: string;
  onClose: () => void;
  className?: string;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customerId,
  onClose,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'projects' | 'estimates'>('overview');
  const { openCustomerForm } = useFormActions();

  // Query customer data
  const { data, loading, error } = useQuery(GET_CUSTOMER, {
    variables: { id: customerId },
  });

  // Query customer history
  const { data: historyData, loading: historyLoading } = useQuery(GET_CUSTOMER_HISTORY, {
    variables: { customerId, limit: 50 },
  });

  // Subscribe to customer updates
  useSubscription(CUSTOMER_UPDATED, {
    variables: { id: customerId },
    onData: ({ data: subscriptionData }) => {
      console.log('Customer updated:', subscriptionData?.data?.customerUpdated);
    },
  });

  const customer = data?.customer;
  const history = historyData?.customerHistory || [];

  const handleEdit = () => {
    if (customer) {
      openCustomerForm('edit', customer);
    }
  };

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

  if (loading) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-error-600 mb-4">Failed to load customer details</p>
              <Button variant="outline" onClick={onClose}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader
          title={
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={getStatusVariant(customer.status) as any}>
                    {customer.status.toLowerCase()}
                  </Badge>
                  {customer.salesforceId && (
                    <Badge variant="outline" size="sm">
                      Salesforce Synced
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          }
          actions={
            <Button
              size="sm"
              onClick={handleEdit}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit Customer
            </Button>
          }
        />

        <CardContent>
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'history', label: 'History' },
                { key: 'projects', label: 'Projects' },
                { key: 'estimates', label: 'Estimates' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <CustomerOverview customer={customer} />
          )}

          {activeTab === 'history' && (
            <CustomerHistory history={history} loading={historyLoading} />
          )}

          {activeTab === 'projects' && (
            <CustomerProjects customerId={customer.id} />
          )}

          {activeTab === 'estimates' && (
            <CustomerEstimates customerId={customer.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Overview Tab Component
interface CustomerOverviewProps {
  customer: Customer;
}

const CustomerOverview: React.FC<CustomerOverviewProps> = ({ customer }) => {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Total Projects</p>
              <p className="text-2xl font-bold text-blue-900">{customer.totalProjects}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(customer.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Customer Since</p>
              <p className="text-lg font-bold text-purple-900">
                {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="outlined" padding="md">
          <CardHeader title="Contact Information" />
          <CardContent>
            <div className="space-y-4">
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {formatPhoneNumber(customer.phone)}
                    </a>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{formatAddress(customer.address)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="outlined" padding="md">
          <CardHeader title="Account Details" />
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={getStatusVariant(customer.status) as any}>
                  {customer.status.toLowerCase()}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-gray-900">{formatDate(customer.updatedAt)}</p>
              </div>

              {customer.salesforceId && (
                <div>
                  <p className="text-sm text-gray-500">Salesforce ID</p>
                  <p className="text-gray-900 font-mono text-sm">{customer.salesforceId}</p>
                </div>
              )}

              {customer.lastSync && (
                <div>
                  <p className="text-sm text-gray-500">Last Sync</p>
                  <p className="text-gray-900">{formatDate(customer.lastSync)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {customer.notes && (
        <Card variant="outlined" padding="md">
          <CardHeader title="Notes" />
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// History Tab Component
interface CustomerHistoryProps {
  history: any[];
  loading: boolean;
}

const CustomerHistory: React.FC<CustomerHistoryProps> = ({ history, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((event) => (
        <div key={event.id} className="border-l-4 border-primary-200 pl-4 pb-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
            <span className="text-xs text-gray-500">
              {formatDate(event.timestamp, 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          {event.description && (
            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// Projects Tab Component (placeholder)
interface CustomerProjectsProps {
  customerId: string;
}

const CustomerProjects: React.FC<CustomerProjectsProps> = ({ customerId }) => {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500">Projects view coming soon</p>
    </div>
  );
};

// Estimates Tab Component (placeholder)
interface CustomerEstimatesProps {
  customerId: string;
}

const CustomerEstimates: React.FC<CustomerEstimatesProps> = ({ customerId }) => {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500">Estimates view coming soon</p>
    </div>
  );
};

function getStatusVariant(status: CustomerStatus): "default" | "primary" | "secondary" | "success" | "warning" | "error" | "outline" {
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
}

export default CustomerDetails;
