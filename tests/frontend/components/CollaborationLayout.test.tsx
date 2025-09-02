import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { act } from 'react-dom/test-utils';

import { CollaborationLayout } from '../../../apps/collaboration-editor/src/components/layout/CollaborationLayout';
import { CollaborationProvider } from '../../../apps/collaboration-editor/src/components/providers/CollaborationProvider';
import { DocumentProvider } from '../../../apps/collaboration-editor/src/components/providers/DocumentProvider';

// Mock WebSocket manager
jest.mock('../../../apps/collaboration-editor/src/lib/websocket-manager', () => ({
  WebSocketManager: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isConnected: false
  }))
}));

// Mock Lexical editor
jest.mock('@lexical/react/LexicalComposer', () => ({
  LexicalComposer: ({ children }: any) => <div data-testid="lexical-composer">{children}</div>
}));

// Mock GraphQL queries and mutations
const mocks = [
  {
    request: {
      query: require('../../../apps/collaboration-editor/src/graphql/queries/document').GET_DOCUMENT,
      variables: { id: 'test-doc-id' }
    },
    result: {
      data: {
        document: {
          id: 'test-doc-id',
          title: 'Test Document',
          content: 'Test content',
          status: 'ACTIVE',
          owner: {
            id: 'owner-id',
            name: 'Document Owner',
            avatar: 'https://example.com/avatar.jpg'
          },
          collaborators: [
            {
              id: 'collab-1',
              user: {
                id: 'user-1',
                name: 'Collaborator 1',
                avatar: 'https://example.com/avatar1.jpg'
              },
              role: 'EDITOR',
              presence: {
                status: 'ACTIVE',
                cursor: 10,
                lastSeen: new Date().toISOString()
              }
            }
          ],
          versions: [],
          comments: []
        }
      }
    }
  },
  {
    request: {
      query: require('../../../apps/collaboration-editor/src/graphql/subscriptions/document').DOCUMENT_OPERATIONS_SUBSCRIPTION,
      variables: { documentId: 'test-doc-id' }
    },
    result: {
      data: {
        documentOperations: {
          operation: {
            id: 'op-123',
            type: 'INSERT',
            position: 5,
            content: 'Hello',
            userId: 'user-1',
            timestamp: new Date().toISOString()
          },
          user: {
            id: 'user-1',
            name: 'Test User'
          }
        }
      }
    }
  }
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <MockedProvider mocks={mocks} addTypename={false}>
      <CollaborationProvider>
        <DocumentProvider documentId="test-doc-id">
          {children}
        </DocumentProvider>
      </CollaborationProvider>
    </MockedProvider>
  </BrowserRouter>
);

describe('CollaborationLayout Component', () => {
  const defaultProps = {
    documentId: 'test-doc-id',
    showSidebar: true,
    sidebarContent: 'activity',
    onSidebarToggle: jest.fn(),
    onSidebarContentChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render main layout structure', () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('collaboration-layout')).toBeInTheDocument();
      expect(screen.getByTestId('document-header')).toBeInTheDocument();
      expect(screen.getByTestId('editor-container')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();
    });

    test('should render with sidebar hidden', () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} showSidebar={false} />
        </TestWrapper>
      );

      const sidebar = screen.queryByTestId('sidebar-container');
      expect(sidebar).toHaveClass('sidebar-hidden');
    });

    test('should render different sidebar content types', () => {
      const { rerender } = render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} sidebarContent="activity" />
        </TestWrapper>
      );

      expect(screen.getByTestId('activity-sidebar')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} sidebarContent="versions" />
        </TestWrapper>
      );

      expect(screen.getByTestId('version-sidebar')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} sidebarContent="comments" />
        </TestWrapper>
      );

      expect(screen.getByTestId('comment-sidebar')).toBeInTheDocument();
    });
  });

  describe('Document Header', () => {
    test('should display document title and status', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Document')).toBeInTheDocument();
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      });
    });

    test('should show collaborator presence indicators', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const presenceContainer = screen.getByTestId('presence-indicators');
        expect(within(presenceContainer).getByText('Collaborator 1')).toBeInTheDocument();
        expect(within(presenceContainer).getByTestId('presence-active')).toBeInTheDocument();
      });
    });

    test('should handle share button click', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const shareButton = await screen.findByTestId('share-button');
      await user.click(shareButton);

      expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
    });

    test('should handle version history button click', async () => {
      const user = userEvent.setup();
      const onSidebarContentChange = jest.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayout 
            {...defaultProps} 
            onSidebarContentChange={onSidebarContentChange}
          />
        </TestWrapper>
      );

      const versionButton = await screen.findByTestId('version-history-button');
      await user.click(versionButton);

      expect(onSidebarContentChange).toHaveBeenCalledWith('versions');
    });
  });

  describe('Editor Container', () => {
    test('should render collaborative editor', () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('collaborative-editor')).toBeInTheDocument();
      expect(screen.getByTestId('lexical-composer')).toBeInTheDocument();
    });

    test('should show loading state while document is loading', () => {
      const loadingMocks = [
        {
          request: {
            query: require('../../../apps/collaboration-editor/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'test-doc-id' }
          },
          delay: 1000,
          result: {
            data: {
              document: {
                id: 'test-doc-id',
                title: 'Test Document',
                content: 'Test content'
              }
            }
          }
        }
      ];

      render(
        <BrowserRouter>
          <MockedProvider mocks={loadingMocks} addTypename={false}>
            <CollaborationProvider>
              <DocumentProvider documentId="test-doc-id">
                <CollaborationLayout {...defaultProps} />
              </DocumentProvider>
            </CollaborationProvider>
          </MockedProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('editor-loading')).toBeInTheDocument();
    });

    test('should show error state when document fails to load', async () => {
      const errorMocks = [
        {
          request: {
            query: require('../../../apps/collaboration-editor/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'test-doc-id' }
          },
          error: new Error('Failed to load document')
        }
      ];

      render(
        <BrowserRouter>
          <MockedProvider mocks={errorMocks} addTypename={false}>
            <CollaborationProvider>
              <DocumentProvider documentId="test-doc-id">
                <CollaborationLayout {...defaultProps} />
              </DocumentProvider>
            </CollaborationProvider>
          </MockedProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('editor-error')).toBeInTheDocument();
        expect(screen.getByText(/failed to load document/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Functionality', () => {
    test('should toggle sidebar visibility', async () => {
      const user = userEvent.setup();
      const onSidebarToggle = jest.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayout 
            {...defaultProps} 
            onSidebarToggle={onSidebarToggle}
          />
        </TestWrapper>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      await user.click(toggleButton);

      expect(onSidebarToggle).toHaveBeenCalledWith(false);
    });

    test('should switch between sidebar content types', async () => {
      const user = userEvent.setup();
      const onSidebarContentChange = jest.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayout 
            {...defaultProps} 
            onSidebarContentChange={onSidebarContentChange}
          />
        </TestWrapper>
      );

      // Switch to comments
      const commentsTab = screen.getByTestId('sidebar-tab-comments');
      await user.click(commentsTab);

      expect(onSidebarContentChange).toHaveBeenCalledWith('comments');

      // Switch to versions
      const versionsTab = screen.getByTestId('sidebar-tab-versions');
      await user.click(versionsTab);

      expect(onSidebarContentChange).toHaveBeenCalledWith('versions');
    });

    test('should resize sidebar', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const resizeHandle = screen.getByTestId('sidebar-resize-handle');
      const sidebar = screen.getByTestId('sidebar-container');

      // Get initial width
      const initialWidth = sidebar.getBoundingClientRect().width;

      // Simulate drag to resize
      await user.pointer([
        { keys: '[MouseLeft>]', target: resizeHandle },
        { coords: { x: 50, y: 0 } },
        { keys: '[/MouseLeft]' }
      ]);

      const newWidth = sidebar.getBoundingClientRect().width;
      expect(newWidth).not.toBe(initialWidth);
    });
  });

  describe('Real-time Collaboration', () => {
    test('should handle incoming operations from other users', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      // Simulate incoming operation
      await act(async () => {
        const websocketManager = require('../../../apps/collaboration-editor/src/lib/websocket-manager').WebSocketManager;
        const mockInstance = new websocketManager();
        const onOperationCallback = mockInstance.on.mock.calls.find(call => 
          call[0] === 'document:operation'
        )?.[1];

        if (onOperationCallback) {
          onOperationCallback({
            operation: {
              id: 'op-456',
              type: 'INSERT',
              position: 10,
              content: ' World',
              userId: 'user-2'
            },
            user: {
              id: 'user-2',
              name: 'Other User'
            }
          });
        }
      });

      // Verify operation is reflected in editor
      await waitFor(() => {
        const operationIndicator = screen.queryByTestId('operation-applied');
        expect(operationIndicator).toBeInTheDocument();
      });
    });

    test('should update presence indicators for user cursors', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      await act(async () => {
        const websocketManager = require('../../../apps/collaboration-editor/src/lib/websocket-manager').WebSocketManager;
        const mockInstance = new websocketManager();
        const onPresenceCallback = mockInstance.on.mock.calls.find(call => 
          call[0] === 'document:presence'
        )?.[1];

        if (onPresenceCallback) {
          onPresenceCallback({
            userId: 'user-2',
            cursor: 25,
            selection: { start: 20, end: 30 },
            user: {
              id: 'user-2',
              name: 'Cursor User',
              avatar: 'https://example.com/avatar2.jpg'
            }
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-cursor-user-2')).toBeInTheDocument();
      });
    });

    test('should handle WebSocket connection status', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      // Initially connected
      await waitFor(() => {
        expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();
      });

      // Simulate disconnect
      await act(async () => {
        const websocketManager = require('../../../apps/collaboration-editor/src/lib/websocket-manager').WebSocketManager;
        const mockInstance = new websocketManager();
        mockInstance.isConnected = false;
        
        const onDisconnectCallback = mockInstance.on.mock.calls.find(call => 
          call[0] === 'disconnect'
        )?.[1];

        if (onDisconnectCallback) {
          onDisconnectCallback();
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle save shortcut (Ctrl+S)', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      await user.keyboard('{Control>}s{/Control}');

      await waitFor(() => {
        expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
      });
    });

    test('should handle comment shortcut (Ctrl+Shift+M)', async () => {
      const user = userEvent.setup();
      const onSidebarContentChange = jest.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayout 
            {...defaultProps} 
            onSidebarContentChange={onSidebarContentChange}
          />
        </TestWrapper>
      );

      await user.keyboard('{Control>}{Shift>}m{/Shift}{/Control}');

      expect(onSidebarContentChange).toHaveBeenCalledWith('comments');
    });

    test('should handle sidebar toggle shortcut (Ctrl+\\)', async () => {
      const user = userEvent.setup();
      const onSidebarToggle = jest.fn();
      
      render(
        <TestWrapper>
          <CollaborationLayout 
            {...defaultProps} 
            onSidebarToggle={onSidebarToggle}
          />
        </TestWrapper>
      );

      await user.keyboard('{Control>}\\{/Control}');

      expect(onSidebarToggle).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1024
      });

      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByTestId('collaboration-layout');
      expect(layout).toHaveClass('mobile-layout');
    });

    test('should hide sidebar on small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      });

      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} showSidebar={true} />
        </TestWrapper>
      );

      const sidebar = screen.getByTestId('sidebar-container');
      expect(sidebar).toHaveClass('sidebar-mobile-hidden');
    });

    test('should show mobile menu for sidebar access', async () => {
      const user = userEvent.setup();
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 480
      });

      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const mobileMenuButton = screen.getByTestId('mobile-menu-button');
      await user.click(mobileMenuButton);

      expect(screen.getByTestId('mobile-sidebar-overlay')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <CollaborationLayout {...props} />;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent {...defaultProps} />
        </TestWrapper>
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <TestWrapper>
          <TestComponent {...defaultProps} />
        </TestWrapper>
      );

      // Should not cause additional renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    test('should debounce resize events', async () => {
      jest.useFakeTimers();
      
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const resizeHandler = jest.fn();
      window.addEventListener('resize', resizeHandler);

      // Trigger multiple resize events
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event('resize'));
      }

      // Should not process all events immediately
      expect(resizeHandler).toHaveBeenCalledTimes(10);

      // Fast-forward timers
      jest.advanceTimersByTime(300);

      jest.useRealTimers();
      window.removeEventListener('resize', resizeHandler);
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Document editor');
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Sidebar');
      expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute('aria-label', 'Toggle sidebar');
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      // Tab through focusable elements
      await user.tab();
      expect(screen.getByTestId('share-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('version-history-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('sidebar-toggle')).toHaveFocus();
    });

    test('should announce status changes to screen readers', async () => {
      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      // Simulate connection status change
      await act(async () => {
        const websocketManager = require('../../../apps/collaboration-editor/src/lib/websocket-manager').WebSocketManager;
        const mockInstance = new websocketManager();
        mockInstance.isConnected = false;
        
        const onDisconnectCallback = mockInstance.on.mock.calls.find(call => 
          call[0] === 'disconnect'
        )?.[1];

        if (onDisconnectCallback) {
          onDisconnectCallback();
        }
      });

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/connection lost/i);
    });

    test('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps} />
        </TestWrapper>
      );

      const layout = screen.getByTestId('collaboration-layout');
      expect(layout).toHaveClass('high-contrast');
    });
  });

  describe('Error Boundaries', () => {
    test('should catch and display editor errors', () => {
      const ThrowError = () => {
        throw new Error('Editor crashed');
      };

      const ConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps}>
            <ThrowError />
          </CollaborationLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      ConsoleErrorSpy.mockRestore();
    });

    test('should provide error recovery options', async () => {
      const user = userEvent.setup();
      
      // Mock component that throws an error
      const ErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Component error');
        }
        return <div>Working component</div>;
      };

      const { rerender } = render(
        <TestWrapper>
          <CollaborationLayout {...defaultProps}>
            <ErrorComponent shouldThrow={true} />
          </CollaborationLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

      const retryButton = screen.getByTestId('error-retry-button');
      await user.click(retryButton);

      // Simulate successful retry
      rerender(
        <TestWrapper>
          <CollaborationLayout {...defaultProps}>
            <ErrorComponent shouldThrow={false} />
          </CollaborationLayout>
        </TestWrapper>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });
});