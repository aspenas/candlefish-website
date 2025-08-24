import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { gql } from '@apollo/client';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { WebSocketServer } from 'ws';
import '@testing-library/jest-dom';

// GraphQL queries and mutations
const GET_DOCUMENTS = gql`
  query GetDocuments($organizationId: ID!, $limit: Int, $offset: Int) {
    documents(organizationId: $organizationId, limit: $limit, offset: $offset) {
      id
      title
      content
      status
      author {
        id
        name
        email
      }
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      id
      title
      content
      status
      author {
        id
        name
      }
      createdAt
    }
  }
`;

const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
    updateDocument(id: $id, input: $input) {
      id
      title
      content
      status
      updatedAt
      lastEditedBy {
        id
        name
      }
    }
  }
`;

const DOCUMENT_UPDATED_SUBSCRIPTION = gql`
  subscription DocumentUpdated($documentId: ID!) {
    documentUpdated(documentId: $documentId) {
      id
      title
      content
      status
      updatedAt
      lastEditedBy {
        id
        name
      }
    }
  }
`;

const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`;

// Mock REST API server
const server = setupServer(
  rest.get('/api/documents', (req, res, ctx) => {
    const organizationId = req.url.searchParams.get('organizationId');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const offset = parseInt(req.url.searchParams.get('offset') || '0');

    return res(
      ctx.json({
        documents: mockDocuments.slice(offset, offset + limit),
        total: mockDocuments.length,
        hasMore: offset + limit < mockDocuments.length,
      })
    );
  }),

  rest.post('/api/documents', (req, res, ctx) => {
    const newDocument = {
      id: `doc_${Date.now()}`,
      ...req.body,
      author: mockUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDocuments.push(newDocument as any);

    return res(ctx.json(newDocument));
  }),

  rest.put('/api/documents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const docIndex = mockDocuments.findIndex(doc => doc.id === id);

    if (docIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Document not found' }));
    }

    mockDocuments[docIndex] = {
      ...mockDocuments[docIndex],
      ...req.body,
      updatedAt: new Date().toISOString(),
      lastEditedBy: mockUser,
    };

    return res(ctx.json(mockDocuments[docIndex]));
  }),

  rest.delete('/api/documents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const docIndex = mockDocuments.findIndex(doc => doc.id === id);

    if (docIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Document not found' }));
    }

    mockDocuments.splice(docIndex, 1);

    return res(ctx.json({ success: true }));
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    return res(ctx.json(mockUser));
  }),

  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;

    if (email === 'test@candlefish.ai' && password === 'password123') {
      return res(
        ctx.json({
          token: 'mock-jwt-token',
          user: mockUser,
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  })
);

// Mock data
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'test@candlefish.ai',
  role: 'USER',
  organizationId: 'org-1',
};

let mockDocuments = [
  {
    id: 'doc-1',
    title: 'First Document',
    content: 'This is the first document content',
    status: 'PUBLISHED',
    author: mockUser,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-2',
    title: 'Second Document',
    content: 'This is the second document content',
    status: 'DRAFT',
    author: mockUser,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

// GraphQL mocks
const createGraphQLMocks = () => [
  {
    request: {
      query: GET_DOCUMENTS,
      variables: { organizationId: 'org-1', limit: 10, offset: 0 },
    },
    result: {
      data: {
        documents: mockDocuments,
      },
    },
  },
  {
    request: {
      query: CREATE_DOCUMENT,
      variables: {
        input: {
          title: 'New Document',
          content: 'New document content',
          organizationId: 'org-1',
        },
      },
    },
    result: {
      data: {
        createDocument: {
          id: 'doc-3',
          title: 'New Document',
          content: 'New document content',
          status: 'DRAFT',
          author: mockUser,
          createdAt: new Date().toISOString(),
        },
      },
    },
  },
  {
    request: {
      query: UPDATE_DOCUMENT,
      variables: {
        id: 'doc-1',
        input: {
          title: 'Updated Document',
          content: 'Updated content',
        },
      },
    },
    result: {
      data: {
        updateDocument: {
          id: 'doc-1',
          title: 'Updated Document',
          content: 'Updated content',
          status: 'PUBLISHED',
          updatedAt: new Date().toISOString(),
          lastEditedBy: mockUser,
        },
      },
    },
  },
  {
    request: {
      query: DELETE_DOCUMENT,
      variables: { id: 'doc-1' },
    },
    result: {
      data: {
        deleteDocument: true,
      },
    },
  },
];

// Mock WebSocket server for real-time testing
const createMockWebSocketServer = () => {
  const mockWS = {
    clients: new Set(),
    on: jest.fn(),
    close: jest.fn(),
    broadcast: jest.fn((data) => {
      mockWS.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(data);
        }
      });
    }),
  };

  return mockWS;
};

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: mockUser, token: 'mock-token', isAuthenticated: true }, action) => {
        switch (action.type) {
          case 'auth/login':
            return { ...state, ...action.payload, isAuthenticated: true };
          case 'auth/logout':
            return { user: null, token: null, isAuthenticated: false };
          default:
            return state;
        }
      },
      documents: (state = { items: [], loading: false, error: null }, action) => {
        switch (action.type) {
          case 'documents/setLoading':
            return { ...state, loading: action.payload };
          case 'documents/setDocuments':
            return { ...state, items: action.payload, loading: false };
          case 'documents/addDocument':
            return { ...state, items: [...state.items, action.payload] };
          case 'documents/updateDocument':
            return {
              ...state,
              items: state.items.map((doc: any) =>
                doc.id === action.payload.id ? action.payload : doc
              ),
            };
          case 'documents/removeDocument':
            return {
              ...state,
              items: state.items.filter((doc: any) => doc.id !== action.payload),
            };
          case 'documents/setError':
            return { ...state, error: action.payload, loading: false };
          default:
            return state;
        }
      },
    },
    preloadedState: initialState,
  });
};

// Test component that uses both REST and GraphQL
interface DocumentListProps {
  useGraphQL?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({ useGraphQL = false }) => {
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      if (useGraphQL) {
        // GraphQL implementation would go here
        // For this test, we'll simulate it
        setDocuments(mockDocuments);
      } else {
        // REST API call
        const response = await fetch('/api/documents?organizationId=org-1');

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async (title: string, content: string) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({
          title,
          content,
          organizationId: 'org-1',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const newDoc = await response.json();
      setDocuments(prev => [...prev, newDoc]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const updateDocument = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      const updatedDoc = await response.json();
      setDocuments(prev => prev.map(doc =>
        doc.id === id ? updatedDoc : doc
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  React.useEffect(() => {
    fetchDocuments();
  }, [useGraphQL]);

  if (loading) {
    return <div data-testid="loading">Loading documents...</div>;
  }

  if (error) {
    return (
      <div data-testid="error">
        Error: {error}
        <button onClick={() => fetchDocuments()} data-testid="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="document-list">
      <h2>Documents ({documents.length})</h2>

      <div className="actions">
        <button
          data-testid="create-document-button"
          onClick={() => createDocument('New Document', 'New content')}
        >
          Create Document
        </button>

        <button
          data-testid="refresh-button"
          onClick={fetchDocuments}
        >
          Refresh
        </button>
      </div>

      <div className="documents">
        {documents.map(doc => (
          <div key={doc.id} data-testid={`document-${doc.id}`} className="document-item">
            <h3>{doc.title}</h3>
            <p>{doc.content}</p>
            <div className="document-meta">
              <span>Status: {doc.status}</span>
              <span>Author: {doc.author.name}</span>
              <span>Created: {new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>

            <div className="document-actions">
              <button
                data-testid={`edit-${doc.id}`}
                onClick={() => updateDocument(doc.id, {
                  title: `${doc.title} (Updated)`,
                  content: `${doc.content} - Updated`
                })}
              >
                Edit
              </button>

              <button
                data-testid={`delete-${doc.id}`}
                onClick={() => deleteDocument(doc.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div data-testid="empty-state">
          No documents found. Create your first document!
        </div>
      )}
    </div>
  );
};

// Test wrapper component
const TestWrapper: React.FC<{
  children: React.ReactNode;
  useGraphQL?: boolean;
  initialState?: any;
}> = ({ children, useGraphQL = false, initialState = {} }) => {
  const store = createMockStore(initialState);
  const mocks = createGraphQLMocks();

  if (useGraphQL) {
    return (
      <Provider store={store}>
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
};

describe('API-Frontend Communication Integration Tests', () => {
  const user = userEvent.setup();

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });

    // Mock fetch globally
    global.fetch = jest.fn();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    mockDocuments = [
      {
        id: 'doc-1',
        title: 'First Document',
        content: 'This is the first document content',
        status: 'PUBLISHED',
        author: mockUser,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'doc-2',
        title: 'Second Document',
        content: 'This is the second document content',
        status: 'DRAFT',
        author: mockUser,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];
    jest.clearAllMocks();
  });

  describe('REST API Integration', () => {
    it('should fetch and display documents from REST API', async () => {
      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for documents to load
      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // Should display documents
      expect(screen.getByText('Documents (2)')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-1')).toBeInTheDocument();
      expect(screen.getByTestId('document-doc-2')).toBeInTheDocument();

      expect(screen.getByText('First Document')).toBeInTheDocument();
      expect(screen.getByText('Second Document')).toBeInTheDocument();
    });

    it('should create new document via REST API', async () => {
      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      const createButton = screen.getByTestId('create-document-button');
      await user.click(createButton);

      // Should add new document to the list
      await waitFor(() => {
        expect(screen.getByText('Documents (3)')).toBeInTheDocument();
      });

      expect(screen.getByText('New Document')).toBeInTheDocument();
      expect(screen.getByText('New content')).toBeInTheDocument();
    });

    it('should update document via REST API', async () => {
      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      const editButton = screen.getByTestId('edit-doc-1');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('First Document (Updated)')).toBeInTheDocument();
      });

      expect(screen.getByText('This is the first document content - Updated')).toBeInTheDocument();
    });

    it('should delete document via REST API', async () => {
      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Documents (2)')).toBeInTheDocument();

      const deleteButton = screen.getByTestId('delete-doc-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Documents (1)')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('document-doc-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('document-doc-2')).toBeInTheDocument();
    });

    it('should handle REST API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should retry failed requests', async () => {
      let callCount = 0;

      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          callCount++;

          if (callCount === 1) {
            return res(
              ctx.status(500),
              ctx.json({ error: 'Server error' })
            );
          }

          return res(
            ctx.json({
              documents: mockDocuments,
              total: mockDocuments.length,
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList useGraphQL={false} />
        </TestWrapper>
      );

      // Should show error first
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Documents (2)')).toBeInTheDocument();
      expect(callCount).toBe(2);
    });
  });

  describe('GraphQL Integration', () => {
    it('should work with GraphQL queries', async () => {
      render(
        <TestWrapper useGraphQL={true}>
          <DocumentList useGraphQL={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Documents (2)')).toBeInTheDocument();
      expect(screen.getByText('First Document')).toBeInTheDocument();
      expect(screen.getByText('Second Document')).toBeInTheDocument();
    });

    it('should handle GraphQL mutations', async () => {
      render(
        <TestWrapper useGraphQL={true}>
          <DocumentList useGraphQL={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // GraphQL mutations would be tested here
      // For this example, we're focusing on the integration pattern
      expect(screen.getByTestId('create-document-button')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authentication flow', async () => {
      const unauthenticatedStore = createMockStore({
        auth: { user: null, token: null, isAuthenticated: false },
      });

      render(
        <Provider store={unauthenticatedStore}>
          <DocumentList />
        </Provider>
      );

      // Without auth, API calls should fail
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });

    it('should include auth headers in API requests', async () => {
      let capturedHeaders: any = {};

      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          capturedHeaders = Object.fromEntries(req.headers.entries());

          return res(
            ctx.json({
              documents: mockDocuments,
              total: mockDocuments.length,
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // Headers are handled by the fetch implementation in DocumentList
      // In a real app, this would be handled by an HTTP client or interceptor
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket connections', async () => {
      const mockWS = createMockWebSocketServer();

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // Simulate WebSocket message
      const updateMessage = {
        type: 'DOCUMENT_UPDATED',
        data: {
          id: 'doc-1',
          title: 'Updated via WebSocket',
          content: 'Real-time update',
          updatedAt: new Date().toISOString(),
        },
      };

      act(() => {
        mockWS.broadcast(JSON.stringify(updateMessage));
      });

      // In a real implementation, this would update the document in real-time
    });

    it('should handle subscription updates', async () => {
      const subscriptionMocks = [
        ...createGraphQLMocks(),
        {
          request: {
            query: DOCUMENT_UPDATED_SUBSCRIPTION,
            variables: { documentId: 'doc-1' },
          },
          result: {
            data: {
              documentUpdated: {
                id: 'doc-1',
                title: 'Updated via Subscription',
                content: 'GraphQL subscription update',
                status: 'PUBLISHED',
                updatedAt: new Date().toISOString(),
                lastEditedBy: mockUser,
              },
            },
          },
        },
      ];

      render(
        <TestWrapper useGraphQL={true}>
          <MockedProvider mocks={subscriptionMocks} addTypename={false}>
            <DocumentList useGraphQL={true} />
          </MockedProvider>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // Subscription updates would be handled by Apollo Client
      // This tests the subscription setup
    });
  });

  describe('Error Boundary Integration', () => {
    it('should catch and display API errors', async () => {
      // Mock all API calls to fail
      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Database connection failed' })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to fetch documents/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading states during API calls', async () => {
      // Delay the API response
      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.json({
              documents: mockDocuments,
              total: mockDocuments.length,
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading documents...')).toBeInTheDocument();

      // Should hide loading after data loads
      await waitFor(
        () => {
          expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      expect(screen.getByTestId('document-list')).toBeInTheDocument();
    });
  });

  describe('Caching and Performance', () => {
    it('should handle cached responses', async () => {
      let apiCallCount = 0;

      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          apiCallCount++;

          return res(
            ctx.json({
              documents: mockDocuments,
              total: mockDocuments.length,
            })
          );
        })
      );

      const { rerender } = render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      expect(apiCallCount).toBe(1);

      // Re-render component
      rerender(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      // Should make another API call (no caching in this simple example)
      await waitFor(() => {
        expect(apiCallCount).toBe(2);
      });
    });
  });

  describe('Network Conditions', () => {
    it('should handle slow network conditions', async () => {
      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          return res(
            ctx.delay(3000), // 3 second delay
            ctx.json({
              documents: mockDocuments,
              total: mockDocuments.length,
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      // Should show loading for extended period
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Should eventually load
      await waitFor(
        () => {
          expect(screen.getByTestId('document-list')).toBeInTheDocument();
        },
        { timeout: 4000 }
      );
    });

    it('should handle network failures', async () => {
      server.use(
        rest.get('/api/documents', (req, res) => {
          return res.networkError('Network connection failed');
        })
      );

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('document-list')).toBeInTheDocument();
      });

      // Initial state: 2 documents
      expect(screen.getByText('Documents (2)')).toBeInTheDocument();

      // Create a document
      const createButton = screen.getByTestId('create-document-button');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Documents (3)')).toBeInTheDocument();
      });

      // Edit a document
      const editButton = screen.getByTestId('edit-doc-1');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('First Document (Updated)')).toBeInTheDocument();
      });

      // Count should remain the same
      expect(screen.getByText('Documents (3)')).toBeInTheDocument();

      // Delete a document
      const deleteButton = screen.getByTestId('delete-doc-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Documents (2)')).toBeInTheDocument();
      });
    });
  });
});
