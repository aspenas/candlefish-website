import { MockedProvider } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';

// Mock queries and mutations
export const GET_DASHBOARD_STATS = `
  query GetDashboardStats {
    dashboardStats {
      totalUsers
      activeUsers
      totalContractors
      totalSecrets
      recentActivity {
        id
        action
        timestamp
        user
      }
      systemHealth {
        status
        uptime
        memory
        cpu
      }
    }
  }
`;

export const GET_CONTRACTORS = `
  query GetContractors($filter: ContractorFilter, $pagination: PaginationInput) {
    contractors(filter: $filter, pagination: $pagination) {
      contractors {
        id
        name
        email
        phone
        company
        skills
        status
        rating
        createdAt
      }
      total
      hasMore
    }
  }
`;

export const CREATE_CONTRACTOR = `
  mutation CreateContractor($input: CreateContractorInput!) {
    createContractor(input: $input) {
      id
      name
      email
      phone
      company
      skills
      status
    }
  }
`;

export const GET_SECRETS = `
  query GetSecrets($filter: SecretFilter) {
    secrets(filter: $filter) {
      id
      name
      description
      type
      category
      createdAt
      updatedAt
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      token
      refreshToken
      user {
        id
        email
        name
        role
      }
    }
  }
`;

// Mock data
export const mockDashboardStats = {
  totalUsers: 25,
  activeUsers: 23,
  totalContractors: 150,
  totalSecrets: 45,
  recentActivity: [
    {
      id: '1',
      action: 'USER_LOGIN',
      timestamp: Date.now() - 3600000,
      user: 'john.doe@example.com'
    },
    {
      id: '2',
      action: 'CONTRACTOR_CREATED',
      timestamp: Date.now() - 7200000,
      user: 'admin@example.com'
    }
  ],
  systemHealth: {
    status: 'healthy',
    uptime: '99.9%',
    memory: '65%',
    cpu: '32%'
  }
};

export const mockContractors = [
  {
    id: '1',
    name: 'John Contractor',
    email: 'john@contractor.com',
    phone: '+1234567890',
    company: 'John\'s Contracting',
    skills: ['plumbing', 'electrical'],
    status: 'active',
    rating: 4.5,
    createdAt: Date.now()
  },
  {
    id: '2',
    name: 'Jane Builder',
    email: 'jane@builder.com',
    phone: '+1987654321',
    company: 'Builder Corp',
    skills: ['construction', 'roofing'],
    status: 'active',
    rating: 4.8,
    createdAt: Date.now()
  }
];

export const mockSecrets = [
  {
    id: '1',
    name: 'database-password',
    description: 'Production database password',
    type: 'password',
    category: 'database',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: '2',
    name: 'api-key-stripe',
    description: 'Stripe API key for payments',
    type: 'api-key',
    category: 'payment',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

// Mock responses
export const successfulDashboardMock: MockedResponse = {
  request: {
    query: GET_DASHBOARD_STATS
  },
  result: {
    data: {
      dashboardStats: mockDashboardStats
    }
  }
};

export const successfulContractorsMock: MockedResponse = {
  request: {
    query: GET_CONTRACTORS,
    variables: {
      filter: {},
      pagination: { page: 1, limit: 10 }
    }
  },
  result: {
    data: {
      contractors: {
        contractors: mockContractors,
        total: 2,
        hasMore: false
      }
    }
  }
};

export const successfulCreateContractorMock: MockedResponse = {
  request: {
    query: CREATE_CONTRACTOR,
    variables: {
      input: {
        name: 'New Contractor',
        email: 'new@contractor.com',
        phone: '+1111111111',
        company: 'New Contracting',
        skills: ['painting']
      }
    }
  },
  result: {
    data: {
      createContractor: {
        id: '3',
        name: 'New Contractor',
        email: 'new@contractor.com',
        phone: '+1111111111',
        company: 'New Contracting',
        skills: ['painting'],
        status: 'pending'
      }
    }
  }
};

export const successfulSecretsMock: MockedResponse = {
  request: {
    query: GET_SECRETS,
    variables: { filter: {} }
  },
  result: {
    data: {
      secrets: mockSecrets
    }
  }
};

export const successfulLoginMock: MockedResponse = {
  request: {
    query: LOGIN_MUTATION,
    variables: {
      email: 'test@example.com',
      password: 'password123'
    }
  },
  result: {
    data: {
      login: {
        success: true,
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser
      }
    }
  }
};

// Error mocks
export const networkErrorMock: MockedResponse = {
  request: {
    query: GET_DASHBOARD_STATS
  },
  error: new Error('Network error occurred')
};

export const graphqlErrorMock: MockedResponse = {
  request: {
    query: GET_CONTRACTORS,
    variables: { filter: {}, pagination: { page: 1, limit: 10 } }
  },
  result: {
    errors: [new GraphQLError('Access denied')]
  }
};

export const loginErrorMock: MockedResponse = {
  request: {
    query: LOGIN_MUTATION,
    variables: {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    }
  },
  result: {
    data: {
      login: {
        success: false,
        token: null,
        refreshToken: null,
        user: null
      }
    }
  }
};

// Helper function to create Apollo MockedProvider
export const createApolloMockProvider = (
  mocks: MockedResponse[] = [],
  addTypename: boolean = false
) => {
  return MockedProvider;
};

// Custom hook for testing Apollo operations
export const createMockApolloProvider = (
  children: React.ReactNode,
  mocks: MockedResponse[] = []
) => {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
};
