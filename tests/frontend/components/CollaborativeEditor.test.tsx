import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createEditor } from 'lexical';
import { $createParagraphNode, $createTextNode } from 'lexical';

import { CollaborativeEditor } from '../../../apps/collaboration-editor/src/components/editor/CollaborativeEditor';
import { CollaborationProvider } from '../../../apps/collaboration-editor/src/components/providers/CollaborationProvider';

// Mock Lexical editor
const mockEditor = {
  registerCommand: jest.fn(),
  registerMutationListener: jest.fn(),
  registerUpdateListener: jest.fn(),
  update: jest.fn(),
  getEditorState: jest.fn(),
  setEditable: jest.fn(),
  focus: jest.fn(),
  blur: jest.fn(),
  hasNodes: jest.fn(() => true),
  transform: jest.fn(),
  read: jest.fn(),
  getElementByKey: jest.fn(),
  dispatchCommand: jest.fn(),
  isEditable: jest.fn(() => true),
  getRootElement: jest.fn(() => document.createElement('div'))
};

jest.mock('@lexical/react/LexicalComposer', () => ({
  LexicalComposer: ({ children, initialConfig }: any) => {
    return (
      <div data-testid="lexical-composer" data-initial-config={JSON.stringify(initialConfig)}>
        {children}
      </div>
    );
  }
}));

jest.mock('@lexical/react/LexicalRichTextPlugin', () => ({
  RichTextPlugin: ({ contentEditable, placeholder }: any) => (
    <div data-testid="rich-text-plugin">
      <div data-testid="content-editable">{contentEditable}</div>
      <div data-testid="placeholder">{placeholder}</div>
    </div>
  )
}));

jest.mock('@lexical/react/LexicalContentEditable', () => ({
  ContentEditable: (props: any) => (
    <div 
      {...props} 
      data-testid="content-editable-element"
      contentEditable={true}
      suppressContentEditableWarning={true}
    >
      Editable content
    </div>
  )
}));

jest.mock('@lexical/react/useLexicalComposerContext', () => ({
  useLexicalComposerContext: () => [mockEditor]
}));

// Mock Y.js for CRDT support
const mockYDoc = {
  getText: jest.fn(() => ({
    insert: jest.fn(),
    delete: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
    toString: jest.fn(() => 'Mock document content')
  })),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn()
};

jest.mock('yjs', () => ({
  Doc: jest.fn(() => mockYDoc),
  Text: jest.fn()
}));

// Mock WebSocket manager
const mockWebSocketManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  isConnected: true
};

jest.mock('../../../apps/collaboration-editor/src/lib/websocket-manager', () => ({
  WebSocketManager: jest.fn(() => mockWebSocketManager)
}));

describe('CollaborativeEditor Component', () => {
  const defaultProps = {
    documentId: 'test-doc-123',
    initialContent: 'Initial document content',
    isEditable: true,
    onContentChange: jest.fn(),
    onSelectionChange: jest.fn(),
    onOperationApplied: jest.fn(),
    placeholder: 'Start typing...'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.getEditorState.mockReturnValue({
      read: jest.fn((fn) => fn()),
      toJSON: jest.fn(() => ({ root: { children: [] } }))
    });
  });

  describe('Initialization', () => {
    test('should render with initial configuration', () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      expect(screen.getByTestId('collaborative-editor')).toBeInTheDocument();
      expect(screen.getByTestId('lexical-composer')).toBeInTheDocument();
      expect(screen.getByTestId('rich-text-plugin')).toBeInTheDocument();
    });

    test('should initialize with correct Lexical configuration', () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const composer = screen.getByTestId('lexical-composer');
      const configData = composer.getAttribute('data-initial-config');
      const config = JSON.parse(configData!);

      expect(config).toMatchObject({
        namespace: 'CollaborativeEditor',
        editable: true,
        onError: expect.any(Function)
      });
      expect(config.nodes).toContain('ParagraphNode');
      expect(config.nodes).toContain('TextNode');
    });

    test('should connect to WebSocket on mount', () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      expect(mockWebSocketManager.connect).toHaveBeenCalled();
      expect(mockWebSocketManager.on).toHaveBeenCalledWith(
        'document:operation',
        expect.any(Function)
      );
    });

    test('should initialize Y.js document', () => {
      const YDoc = require('yjs').Doc;
      
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      expect(YDoc).toHaveBeenCalled();
      expect(mockYDoc.getText).toHaveBeenCalledWith('content');
    });
  });

  describe('Content Editing', () => {
    test('should handle text input', async () => {
      const user = userEvent.setup();
      const onContentChange = jest.fn();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} onContentChange={onContentChange} />
        </CollaborationProvider>
      );

      const contentEditable = screen.getByTestId('content-editable-element');
      await user.click(contentEditable);
      await user.type(contentEditable, 'Hello World');

      // Simulate Lexical update
      await act(async () => {
        const updateListener = mockEditor.registerUpdateListener.mock.calls[0][0];
        updateListener({
          editorState: {
            read: jest.fn(() => 'Hello World'),
            toJSON: jest.fn(() => ({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello World' }] }] } }))
          },
          dirtyElements: new Map(),
          dirtyLeaves: new Set(),
          editorState_DEPRECATED: null,
          normalizedNodes: new Set(),
          prevEditorState: null,
          tags: new Set()
        });
      });

      expect(onContentChange).toHaveBeenCalled();
    });

    test('should handle formatting commands', async () => {
      const user = userEvent.setup();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const contentEditable = screen.getByTestId('content-editable-element');
      await user.click(contentEditable);

      // Select text and apply bold formatting
      await user.keyboard('{Control>}b{/Control}');

      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FORMAT_TEXT_COMMAND' }),
        'bold'
      );
    });

    test('should handle undo/redo', async () => {
      const user = userEvent.setup();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const contentEditable = screen.getByTestId('content-editable-element');
      await user.click(contentEditable);

      // Undo
      await user.keyboard('{Control>}z{/Control}');
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UNDO_COMMAND' }),
        undefined
      );

      // Redo
      await user.keyboard('{Control>}y{/Control}');
      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REDO_COMMAND' }),
        undefined
      );
    });

    test('should handle selection changes', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} onSelectionChange={onSelectionChange} />
        </CollaborationProvider>
      );

      const contentEditable = screen.getByTestId('content-editable-element');
      await user.click(contentEditable);

      // Simulate selection change
      await act(async () => {
        const updateListener = mockEditor.registerUpdateListener.mock.calls[0][0];
        updateListener({
          editorState: {
            read: jest.fn(() => ({
              getSelection: () => ({
                anchor: { offset: 0 },
                focus: { offset: 5 }
              })
            }))
          },
          dirtyElements: new Map(),
          dirtyLeaves: new Set(),
          editorState_DEPRECATED: null,
          normalizedNodes: new Set(),
          prevEditorState: null,
          tags: new Set()
        });
      });

      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          anchor: { offset: 0 },
          focus: { offset: 5 }
        })
      );
    });
  });

  describe('Real-time Collaboration', () => {
    test('should apply remote operations', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Simulate incoming operation from another user
      const remoteOperation = {
        id: 'op-remote-123',
        type: 'INSERT',
        position: 5,
        content: 'Hello ',
        userId: 'user-456',
        timestamp: Date.now()
      };

      await act(async () => {
        const operationHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'document:operation'
        )?.[1];

        if (operationHandler) {
          operationHandler({ operation: remoteOperation });
        }
      });

      expect(mockEditor.update).toHaveBeenCalled();
      expect(defaultProps.onOperationApplied).toHaveBeenCalledWith(remoteOperation);
    });

    test('should transform conflicting operations', async () => {
      const onOperationApplied = jest.fn();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} onOperationApplied={onOperationApplied} />
        </CollaborationProvider>
      );

      // Simulate conflicting operations
      const localOperation = {
        type: 'INSERT',
        position: 5,
        content: 'Local ',
        userId: 'current-user'
      };

      const remoteOperation = {
        type: 'INSERT',
        position: 5,
        content: 'Remote ',
        userId: 'other-user'
      };

      await act(async () => {
        // Apply local operation first
        mockEditor.update.mock.calls[0][0]();
        
        // Then apply conflicting remote operation
        const operationHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'document:operation'
        )?.[1];

        if (operationHandler) {
          operationHandler({ operation: remoteOperation });
        }
      });

      // Should apply operational transformation
      expect(onOperationApplied).toHaveBeenCalled();
    });

    test('should handle presence updates', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const presenceUpdate = {
        userId: 'user-789',
        cursor: 15,
        selection: { start: 10, end: 20 },
        user: {
          id: 'user-789',
          name: 'Other User',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      await act(async () => {
        const presenceHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'document:presence'
        )?.[1];

        if (presenceHandler) {
          presenceHandler(presenceUpdate);
        }
      });

      // Should update presence indicators
      expect(screen.getByTestId('presence-cursor-user-789')).toBeInTheDocument();
    });

    test('should emit cursor position updates', async () => {
      const user = userEvent.setup();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const contentEditable = screen.getByTestId('content-editable-element');
      await user.click(contentEditable);

      // Move cursor
      await user.keyboard('{ArrowRight}{ArrowRight}');

      await waitFor(() => {
        expect(mockWebSocketManager.emit).toHaveBeenCalledWith(
          'cursor:update',
          expect.objectContaining({
            documentId: 'test-doc-123',
            position: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Y.js CRDT Integration', () => {
    test('should sync with Y.js document', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Simulate Y.js text change
      const yText = mockYDoc.getText();
      const yTextObserver = yText.observe.mock.calls[0][0];

      await act(async () => {
        yTextObserver([
          {
            type: 'insert',
            index: 0,
            values: ['Hello from Y.js']
          }
        ]);
      });

      expect(mockEditor.update).toHaveBeenCalled();
    });

    test('should handle Y.js delete operations', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const yText = mockYDoc.getText();
      const yTextObserver = yText.observe.mock.calls[0][0];

      await act(async () => {
        yTextObserver([
          {
            type: 'delete',
            index: 5,
            length: 3
          }
        ]);
      });

      expect(mockEditor.update).toHaveBeenCalled();
    });

    test('should maintain document consistency across peers', async () => {
      const { rerender } = render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Simulate multiple operations from different peers
      const operations = [
        { type: 'INSERT', position: 0, content: 'A', userId: 'user-1' },
        { type: 'INSERT', position: 1, content: 'B', userId: 'user-2' },
        { type: 'INSERT', position: 0, content: 'C', userId: 'user-3' }
      ];

      for (const operation of operations) {
        await act(async () => {
          const operationHandler = mockWebSocketManager.on.mock.calls.find(
            call => call[0] === 'document:operation'
          )?.[1];

          if (operationHandler) {
            operationHandler({ operation });
          }
        });
      }

      // Final state should be consistent
      expect(mockYDoc.getText().toString()).toBeDefined();
    });
  });

  describe('Toolbar Integration', () => {
    test('should render formatting toolbar', () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} showToolbar={true} />
        </CollaborationProvider>
      );

      expect(screen.getByTestId('editor-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('bold-button')).toBeInTheDocument();
      expect(screen.getByTestId('italic-button')).toBeInTheDocument();
      expect(screen.getByTestId('underline-button')).toBeInTheDocument();
    });

    test('should handle toolbar button clicks', async () => {
      const user = userEvent.setup();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} showToolbar={true} />
        </CollaborationProvider>
      );

      const boldButton = screen.getByTestId('bold-button');
      await user.click(boldButton);

      expect(mockEditor.dispatchCommand).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'FORMAT_TEXT_COMMAND' }),
        'bold'
      );
    });

    test('should update toolbar state based on selection', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} showToolbar={true} />
        </CollaborationProvider>
      );

      // Simulate selection with bold formatting
      await act(async () => {
        const updateListener = mockEditor.registerUpdateListener.mock.calls[0][0];
        updateListener({
          editorState: {
            read: jest.fn(() => ({
              getSelection: () => ({
                hasFormat: (format: string) => format === 'bold'
              })
            }))
          }
        });
      });

      const boldButton = screen.getByTestId('bold-button');
      expect(boldButton).toHaveClass('active');
    });
  });

  describe('Performance Optimization', () => {
    test('should debounce content change events', async () => {
      jest.useFakeTimers();
      const onContentChange = jest.fn();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} onContentChange={onContentChange} />
        </CollaborationProvider>
      );

      // Trigger multiple rapid changes
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          const updateListener = mockEditor.registerUpdateListener.mock.calls[0][0];
          updateListener({
            editorState: {
              read: jest.fn(() => `Content ${i}`),
              toJSON: jest.fn(() => ({ root: { children: [] } }))
            }
          });
        });
      }

      // Should not call onChange for every change
      expect(onContentChange).toHaveBeenCalledTimes(0);

      // After debounce delay
      jest.advanceTimersByTime(300);
      expect(onContentChange).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('should virtualize long documents', () => {
      const longContent = 'A'.repeat(10000);
      
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} initialContent={longContent} />
        </CollaborationProvider>
      );

      expect(screen.getByTestId('virtualized-content')).toBeInTheDocument();
    });

    test('should lazy load editor plugins', async () => {
      const { rerender } = render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} plugins={['tables']} />
        </CollaborationProvider>
      );

      // Initially, plugin should not be loaded
      expect(screen.queryByTestId('table-plugin')).not.toBeInTheDocument();

      // After interaction that requires the plugin
      rerender(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} plugins={['tables']} enableTables={true} />
        </CollaborationProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('table-plugin')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket disconnection gracefully', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Simulate WebSocket disconnection
      await act(async () => {
        mockWebSocketManager.isConnected = false;
        const disconnectHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];

        if (disconnectHandler) {
          disconnectHandler();
        }
      });

      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });

    test('should handle malformed operations', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Send malformed operation
      await act(async () => {
        const operationHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'document:operation'
        )?.[1];

        if (operationHandler) {
          operationHandler({ 
            operation: { 
              type: 'INVALID_TYPE',
              position: -1,
              content: null
            }
          });
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid operation received')
      );

      consoleSpy.mockRestore();
    });

    test('should recover from Y.js document corruption', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      // Simulate Y.js error
      await act(async () => {
        const errorHandler = mockYDoc.on.mock.calls.find(
          call => call[0] === 'error'
        )?.[1];

        if (errorHandler) {
          errorHandler(new Error('Y.js document corrupted'));
        }
      });

      expect(screen.getByTestId('document-recovery-dialog')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      const editor = screen.getByTestId('content-editable-element');
      expect(editor).toHaveAttribute('role', 'textbox');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
      expect(editor).toHaveAttribute('aria-label', 'Document editor');
    });

    test('should announce operation status to screen readers', async () => {
      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      await act(async () => {
        const operationHandler = mockWebSocketManager.on.mock.calls.find(
          call => call[0] === 'document:operation'
        )?.[1];

        if (operationHandler) {
          operationHandler({
            operation: {
              type: 'INSERT',
              content: 'New content',
              userId: 'other-user'
            },
            user: { name: 'Other User' }
          });
        }
      });

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/other user added text/i);
    });

    test('should support keyboard navigation for toolbar', async () => {
      const user = userEvent.setup();

      render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} showToolbar={true} />
        </CollaborationProvider>
      );

      // Tab to toolbar
      await user.tab();
      expect(screen.getByTestId('bold-button')).toHaveFocus();

      // Navigate through toolbar buttons
      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('italic-button')).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByTestId('underline-button')).toHaveFocus();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup WebSocket connections on unmount', () => {
      const { unmount } = render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      unmount();

      expect(mockWebSocketManager.disconnect).toHaveBeenCalled();
      expect(mockWebSocketManager.off).toHaveBeenCalledWith('document:operation');
      expect(mockWebSocketManager.off).toHaveBeenCalledWith('document:presence');
    });

    test('should cleanup Y.js document on unmount', () => {
      const { unmount } = render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      unmount();

      expect(mockYDoc.destroy).toHaveBeenCalled();
    });

    test('should cleanup Lexical listeners on unmount', () => {
      const unregisterFn = jest.fn();
      mockEditor.registerUpdateListener.mockReturnValue(unregisterFn);
      mockEditor.registerCommand.mockReturnValue(unregisterFn);

      const { unmount } = render(
        <CollaborationProvider>
          <CollaborativeEditor {...defaultProps} />
        </CollaborationProvider>
      );

      unmount();

      expect(unregisterFn).toHaveBeenCalled();
    });
  });
});