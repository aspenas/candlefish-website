// Mock Customer resolver for testing federation architecture
import { CustomerStatus } from '@/types/graphql';

// Mock resolver implementation for testing purposes
const mockCustomerResolver = {
  customers: (parent: any, args: any, context: any) => {
    const { filter, limit = 10, offset = 0 } = args;

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
        salesforceId: 'sf-001-customer-1',
        lastSyncAt: new Date().toISOString(),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
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
        salesforceId: 'sf-002-customer-2',
        lastSyncAt: new Date().toISOString(),
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: new Date().toISOString(),
        totalProjects: 0,
        totalRevenue: 0
      }
    ];

    let filteredCustomers = mockCustomers;

    // Apply filters
    if (filter) {
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.name.toLowerCase().includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm) ||
          customer.phone.includes(searchTerm)
        );
      }

      if (filter.status) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.status === filter.status
        );
      }

      if (filter.salesforceId) {
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.salesforceId === filter.salesforceId
        );
      }
    }

    // Apply pagination
    const totalCount = filteredCustomers.length;
    const paginatedCustomers = filteredCustomers.slice(offset, offset + limit);

    return {
      edges: paginatedCustomers.map((customer, index) => ({
        node: customer,
        cursor: `cursor-${offset + index + 1}`
      })),
      pageInfo: {
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: paginatedCustomers.length > 0 ? `cursor-${offset + 1}` : null,
        endCursor: paginatedCustomers.length > 0 ? `cursor-${offset + paginatedCustomers.length}` : null
      },
      totalCount
    };
  },

  customer: (parent: any, args: any, context: any) => {
    const { id } = args;

    const mockCustomer = {
      id,
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
      salesforceId: 'sf-001-customer-1',
      lastSyncAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
      totalProjects: 3,
      totalRevenue: 15000,
      projects: [
        {
          id: 'project-1',
          name: 'Kitchen Remodel',
          status: 'IN_PROGRESS',
          createdAt: '2024-01-15T00:00:00Z'
        },
        {
          id: 'project-2',
          name: 'Bathroom Renovation',
          status: 'COMPLETED',
          createdAt: '2024-02-01T00:00:00Z'
        }
      ],
      estimates: [
        {
          id: 'estimate-1',
          status: 'APPROVED',
          goodPrice: 5000,
          betterPrice: 7500,
          bestPrice: 10000,
          selectedTier: 'BETTER',
          createdAt: '2024-01-10T00:00:00Z'
        }
      ]
    };

    return mockCustomer;
  },

  syncCustomerFromSalesforce: (parent: any, args: any, context: any) => {
    const { salesforceId } = args;

    return {
      success: true,
      customer: {
        id: 'customer-synced',
        name: 'Synced Customer',
        email: 'synced@example.com',
        phone: '+1-555-9999',
        address: {
          street: '999 Synced St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701'
        },
        status: CustomerStatus.Active,
        salesforceId: salesforceId,
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalProjects: 0,
        totalRevenue: 0
      },
      errors: []
    };
  }
};

describe('Customer Resolver', () => {
  describe('customers query', () => {
    it('should return paginated customers list', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: {}, limit: 10, offset: 0 },
        {}
      );

      expect(result).toBeDefined();
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]).toHaveProperty('node');
      expect(result.edges[0]).toHaveProperty('cursor');
      expect(result.totalCount).toBe(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should handle pagination correctly', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: {}, limit: 1, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
      expect(result.pageInfo.startCursor).toBe('cursor-1');
      expect(result.pageInfo.endCursor).toBe('cursor-1');
    });

    it('should filter by search term', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { search: 'john' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.name).toBe('John Doe');
      expect(result.totalCount).toBe(1);
    });

    it('should filter by email', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { search: 'jane@example.com' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.email).toBe('jane@example.com');
    });

    it('should filter by phone', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { search: '555-0124' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.phone).toContain('555-0124');
    });

    it('should filter by status', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { status: CustomerStatus.Active }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.status).toBe(CustomerStatus.Active);
    });

    it('should filter by salesforceId', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { salesforceId: 'sf-001-customer-1' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.salesforceId).toBe('sf-001-customer-1');
    });

    it('should return empty results for non-matching filters', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: { search: 'nonexistent' }, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle offset beyond available data', () => {
      const result = mockCustomerResolver.customers(
        null,
        { filter: {}, limit: 10, offset: 100 },
        {}
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(true);
    });
  });

  describe('customer query', () => {
    it('should return a single customer by id', () => {
      const customerId = 'customer-123';
      const result = mockCustomerResolver.customer(
        null,
        { id: customerId },
        {}
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(customerId);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('+1-555-0123');
      expect(result.status).toBe(CustomerStatus.Active);
      expect(result.salesforceId).toBe('sf-001-customer-1');
    });

    it('should include customer address', () => {
      const result = mockCustomerResolver.customer(null, { id: 'test' }, {});

      expect(result.address).toBeDefined();
      expect(result.address.street).toBe('123 Main St');
      expect(result.address.city).toBe('Austin');
      expect(result.address.state).toBe('TX');
      expect(result.address.zipCode).toBe('78701');
    });

    it('should include related projects', () => {
      const result = mockCustomerResolver.customer(null, { id: 'test' }, {});

      expect(result.projects).toBeDefined();
      expect(result.projects).toHaveLength(2);
      expect(result.projects[0].name).toBe('Kitchen Remodel');
      expect(result.projects[1].name).toBe('Bathroom Renovation');
    });

    it('should include related estimates', () => {
      const result = mockCustomerResolver.customer(null, { id: 'test' }, {});

      expect(result.estimates).toBeDefined();
      expect(result.estimates).toHaveLength(1);
      expect(result.estimates[0].status).toBe('APPROVED');
      expect(result.estimates[0].selectedTier).toBe('BETTER');
    });

    it('should have valid timestamp formats', () => {
      const result = mockCustomerResolver.customer(null, { id: 'test' }, {});

      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
      expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(result.lastSyncAt)).toBeInstanceOf(Date);
    });
  });

  describe('syncCustomerFromSalesforce mutation', () => {
    it('should successfully sync customer from Salesforce', () => {
      const salesforceId = 'sf-test-123';
      const result = mockCustomerResolver.syncCustomerFromSalesforce(
        null,
        { salesforceId },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
      expect(result.customer.salesforceId).toBe(salesforceId);
      expect(result.errors).toHaveLength(0);
    });

    it('should return synced customer with valid data', () => {
      const result = mockCustomerResolver.syncCustomerFromSalesforce(
        null,
        { salesforceId: 'test' },
        {}
      );

      expect(result.customer.name).toBe('Synced Customer');
      expect(result.customer.email).toBe('synced@example.com');
      expect(result.customer.status).toBe(CustomerStatus.Active);
      expect(new Date(result.customer.lastSyncAt)).toBeInstanceOf(Date);
    });
  });
});
