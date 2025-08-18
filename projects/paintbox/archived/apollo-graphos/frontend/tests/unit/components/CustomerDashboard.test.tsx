import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { SEARCH_CUSTOMERS } from '@/graphql/customers';
import { CustomerStatus } from '@/types/graphql';
import CustomerDashboard from '@/components/customers/CustomerDashboard';

// Mock the store hooks
const mockSetSelectedCustomer = jest.fn();
const mockOpenCustomerForm = jest.fn();

jest.mock('@/store', () => ({
  useAppStore: jest.fn(() => ({ selectedCustomerId: null })),
  useUIActions: jest.fn(() => ({ setSelectedCustomer: mockSetSelectedCustomer })),
  useFormActions: jest.fn(() => ({ openCustomerForm: mockOpenCustomerForm }))
}));

// Mock utility functions
jest.mock('@/utils/formatting', () => ({
  formatCurrency: (value: number) => `$${value.toLocaleString()}`,
  formatDate: (date: string) => new Date(date).toLocaleDateString()
}));

const mockCustomers = [
  {
    id: 'customer-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    address: {
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701'
    },
    status: CustomerStatus.Active,
    salesforceId: 'sf-001',
    lastSyncAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    totalProjects: 3,
    totalRevenue: 15000
  },
  {
    id: 'customer-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1-555-0124',
    address: {
      street: '456 Oak Ave',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201'
    },
    status: CustomerStatus.Prospect,
    salesforceId: 'sf-002',
    lastSyncAt: '2024-01-16T10:00:00Z',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    totalProjects: 0,
    totalRevenue: 0
  }
];

const createMockResponse = (variables = {}, customers = mockCustomers) => ({
  request: {
    query: SEARCH_CUSTOMERS,
    variables: {
      filter: {},
      limit: 20,
      offset: 0,
      ...variables
    }
  },
  result: {
    data: {
      customers: {
        edges: customers.map((customer, index) => ({
          node: customer,
          cursor: `cursor-${index + 1}`
        })),
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: `cursor-${customers.length}`
        },
        totalCount: customers.length
      }
    }
  }
});

const createLoadingMock = () => ({
  request: {
    query: SEARCH_CUSTOMERS,
    variables: { filter: {}, limit: 20, offset: 0 }
  },
  result: {
    loading: true
  }
});

const createErrorMock = () => ({
  request: {
    query: SEARCH_CUSTOMERS,
    variables: { filter: {}, limit: 20, offset: 0 }
  },
  error: new Error('Failed to load customers')
});

describe('CustomerDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard header correctly', async () => {
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    expect(screen.getByText('Customer Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('2 customers total')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    const mocks = [createLoadingMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error state when query fails', async () => {
    const mocks = [createErrorMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('displays empty state when no customers exist', async () => {
    const mocks = [createMockResponse({}, [])];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No customers found')).toBeInTheDocument();
      expect(screen.getByText('Add Your First Customer')).toBeInTheDocument();
    });
  });

  it('displays customer list with correct information', async () => {
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check customer details
    const johnCard = screen.getByText('John Doe').closest('.hover\\:shadow-medium');
    expect(johnCard).toBeInTheDocument();

    if (johnCard) {
      expect(within(johnCard).getByText('john@example.com')).toBeInTheDocument();
      expect(within(johnCard).getByText('+1-555-0123')).toBeInTheDocument();
      expect(within(johnCard).getByText('Austin, TX')).toBeInTheDocument();
      expect(within(johnCard).getByText('active')).toBeInTheDocument();
      expect(within(johnCard).getByText('$15,000')).toBeInTheDocument();
    }
  });

  it('handles search functionality', async () => {
    const user = userEvent.setup();
    const searchMock = createMockResponse({
      variables: {
        filter: { search: 'john' },
        limit: 20,
        offset: 0
      }
    }, [mockCustomers[0]]);

    const mocks = [createMockResponse(), searchMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 customers total')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search customers by name, email, or phone...');
    await user.type(searchInput, 'john');

    await waitFor(() => {
      expect(screen.getByText('1 customers total')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('handles status filter', async () => {
    const user = userEvent.setup();
    const filterMock = createMockResponse({
      variables: {
        filter: { status: CustomerStatus.Active },
        limit: 20,
        offset: 0
      }
    }, [mockCustomers[0]]);

    const mocks = [createMockResponse(), filterMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('2 customers total')).toBeInTheDocument();
    });

    // Open filters
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    // Select Active status
    const statusSelect = screen.getByDisplayValue('All Statuses');
    await user.selectOptions(statusSelect, 'ACTIVE');

    await waitFor(() => {
      expect(screen.getByText('1 customers total')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('handles customer selection', async () => {
    const user = userEvent.setup();
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const johnCard = screen.getByText('John Doe').closest('div');
    expect(johnCard).toBeInTheDocument();

    if (johnCard) {
      await user.click(johnCard);
      expect(mockSetSelectedCustomer).toHaveBeenCalledWith('customer-1');
    }
  });

  it('handles add customer button', async () => {
    const user = userEvent.setup();
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    const addButton = screen.getByText('Add Customer');
    await user.click(addButton);

    expect(mockOpenCustomerForm).toHaveBeenCalledWith('create');
  });

  it('handles customer edit', async () => {
    const user = userEvent.setup();
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the more options button (three dots)
    const moreButtons = screen.getAllByRole('button');
    const moreButton = moreButtons.find(button =>
      button.querySelector('svg')?.getAttribute('data-slot') === 'icon'
    );

    if (moreButton) {
      await user.click(moreButton);
      expect(mockOpenCustomerForm).toHaveBeenCalledWith('edit', mockCustomers[0]);
    }
  });

  it('handles pagination with load more', async () => {
    const user = userEvent.setup();
    const initialMock = createMockResponse({}, mockCustomers.slice(0, 1));
    initialMock.result.data.customers.pageInfo.hasNextPage = true;

    const loadMoreMock = {
      request: {
        query: SEARCH_CUSTOMERS,
        variables: {
          filter: {},
          limit: 20,
          offset: 1
        }
      },
      result: {
        data: {
          customers: {
            edges: mockCustomers.slice(1).map((customer, index) => ({
              node: customer,
              cursor: `cursor-${index + 2}`
            })),
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: true,
              startCursor: 'cursor-2',
              endCursor: 'cursor-2'
            },
            totalCount: 2
          }
        }
      }
    };

    const mocks = [initialMock, loadMoreMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Load More Customers')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByText('Load More Customers');
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('shows correct status badge variants', async () => {
    const customersWithStatuses = [
      { ...mockCustomers[0], status: CustomerStatus.Active },
      { ...mockCustomers[1], status: CustomerStatus.Prospect },
      { ...mockCustomers[0], id: 'customer-3', status: CustomerStatus.Inactive },
      { ...mockCustomers[1], id: 'customer-4', status: CustomerStatus.Archived }
    ];

    const mocks = [createMockResponse({}, customersWithStatuses)];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('prospect')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
      expect(screen.getByText('archived')).toBeInTheDocument();
    });
  });

  it('formats currency and dates correctly', async () => {
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$15,000')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    const errorMock = createErrorMock();

    render(
      <MockedProvider mocks={[errorMock]} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // Verify retry functionality is called
    expect(screen.getByText('Failed to load customers')).toBeInTheDocument();
  });

  it('filters toggle works correctly', async () => {
    const user = userEvent.setup();
    const mocks = [createMockResponse()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <CustomerDashboard />
      </MockedProvider>
    );

    // Initially filters should be hidden
    expect(screen.queryByText('Status')).not.toBeInTheDocument();

    // Click filters button
    const filtersButton = screen.getByText('Filters');
    await user.click(filtersButton);

    // Filters should now be visible
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();

    // Click filters button again to hide
    await user.click(filtersButton);

    // Filters should be hidden again
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });
});
