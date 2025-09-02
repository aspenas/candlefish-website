import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { MockedProvider } from '@apollo/client/testing';

import { DocumentViewer } from '../../../apps/mobile-collaboration/src/components/DocumentViewer';
import { OfflineProvider } from '../../../apps/mobile-collaboration/src/providers/OfflineProvider';
import { ThemeProvider } from '../../../apps/mobile-collaboration/src/providers/ThemeProvider';

// Mock react-native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Vibration: {
    vibrate: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
}));

// Mock Y.js for offline sync
const mockYDoc = {
  getText: jest.fn(() => ({
    insert: jest.fn(),
    delete: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
    toString: jest.fn(() => 'Mock document content'),
    toDelta: jest.fn(() => [{ insert: 'Mock content' }]),
  })),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  getMap: jest.fn(() => new Map()),
};

jest.mock('yjs', () => ({
  Doc: jest.fn(() => mockYDoc),
  Text: jest.fn(),
}));

// Mock biometric authentication
jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => 
    Promise.resolve({ available: true, biometryType: 'TouchID' })
  ),
  simplePrompt: jest.fn(() => 
    Promise.resolve({ success: true })
  ),
}));

// Mock GraphQL queries
const mockDocument = {
  id: 'doc-123',
  title: 'Mobile Test Document',
  content: JSON.stringify({
    blocks: [
      {
        key: 'block1',
        text: 'This is a test document for mobile viewing.',
        type: 'paragraph',
      }
    ]
  }),
  status: 'ACTIVE',
  lastModified: new Date().toISOString(),
  owner: {
    id: 'user-1',
    name: 'Document Owner',
  },
  collaborators: [],
};

const mocks = [
  {
    request: {
      query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
      variables: { id: 'doc-123' },
    },
    result: {
      data: {
        document: mockDocument,
      },
    },
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MockedProvider mocks={mocks} addTypename={false}>
    <ThemeProvider>
      <OfflineProvider>
        {children}
      </OfflineProvider>
    </ThemeProvider>
  </MockedProvider>
);

describe('DocumentViewer Component', () => {
  const defaultProps = {
    documentId: 'doc-123',
    isEditable: true,
    showToolbar: true,
    onContentChange: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    test('should render document viewer with content', async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('document-viewer')).toBeTruthy();
        expect(getByText('Mobile Test Document')).toBeTruthy();
      });
    });

    test('should show loading state initially', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    test('should show error state when document fails to load', async () => {
      const errorMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          error: new Error('Network error'),
        },
      ];

      const { getByTestId, getByText } = render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
        expect(getByText(/failed to load document/i)).toBeTruthy();
      });
    });

    test('should render in read-only mode', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} isEditable={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('document-viewer')).toBeTruthy();
        expect(getByTestId('read-only-indicator')).toBeTruthy();
      });
    });
  });

  describe('Document Content', () => {
    test('should display document blocks correctly', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('block-renderer-block1')).toBeTruthy();
        expect(getByTestId('paragraph-block')).toBeTruthy();
      });
    });

    test('should handle rich text formatting', async () => {
      const formattedContent = JSON.stringify({
        blocks: [
          {
            key: 'block1',
            text: 'Bold and italic text',
            type: 'paragraph',
            inlineStyleRanges: [
              { offset: 0, length: 4, style: 'BOLD' },
              { offset: 9, length: 6, style: 'ITALIC' },
            ],
          }
        ]
      });

      const mockWithFormatting = {
        ...mockDocument,
        content: formattedContent,
      };

      const formattingMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: mockWithFormatting,
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={formattingMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('bold-text')).toBeTruthy();
        expect(getByTestId('italic-text')).toBeTruthy();
      });
    });

    test('should handle different block types', async () => {
      const multiBlockContent = JSON.stringify({
        blocks: [
          { key: 'heading', text: 'Heading', type: 'header-one' },
          { key: 'paragraph', text: 'Paragraph text', type: 'paragraph' },
          { key: 'list', text: 'List item', type: 'unordered-list-item' },
          { key: 'quote', text: 'Quote text', type: 'blockquote' },
        ]
      });

      const mockWithBlocks = {
        ...mockDocument,
        content: multiBlockContent,
      };

      const blockMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: mockWithBlocks,
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={blockMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('header-block')).toBeTruthy();
        expect(getByTestId('paragraph-block')).toBeTruthy();
        expect(getByTestId('list-item-block')).toBeTruthy();
        expect(getByTestId('blockquote-block')).toBeTruthy();
      });
    });
  });

  describe('Editing Functionality', () => {
    test('should handle text input', async () => {
      const onContentChange = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} onContentChange={onContentChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'Updated text content');
        
        expect(onContentChange).toHaveBeenCalledWith(
          expect.objectContaining({
            blocks: expect.arrayContaining([
              expect.objectContaining({
                text: 'Updated text content'
              })
            ])
          })
        );
      });
    });

    test('should handle block type changes', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} showToolbar={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        const blockTypeButton = getByTestId('block-type-button');
        fireEvent.press(blockTypeButton);
        
        const headerOption = getByTestId('header-option');
        fireEvent.press(headerOption);
        
        expect(getByTestId('header-block')).toBeTruthy();
      });
    });

    test('should apply text formatting', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} showToolbar={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent(textInput, 'selectionChange', {
          nativeEvent: { selection: { start: 0, end: 4 } }
        });
        
        const boldButton = getByTestId('bold-button');
        fireEvent.press(boldButton);
        
        expect(getByTestId('bold-text')).toBeTruthy();
      });
    });

    test('should handle undo/redo operations', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} showToolbar={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Make a change
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'Changed text');
        
        // Undo
        const undoButton = getByTestId('undo-button');
        fireEvent.press(undoButton);
        
        expect(getByTestId('text-input-block1').props.value).not.toBe('Changed text');
        
        // Redo
        const redoButton = getByTestId('redo-button');
        fireEvent.press(redoButton);
        
        expect(getByTestId('text-input-block1').props.value).toBe('Changed text');
      });
    });
  });

  describe('Offline Support', () => {
    test('should load document from cache when offline', async () => {
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      // Mock cached document
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockDocument));

      const { getByTestId, getByText } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
        expect(getByText('Mobile Test Document')).toBeTruthy();
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('document-doc-123');
    });

    test('should queue changes when offline', async () => {
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      const onContentChange = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} onContentChange={onContentChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'Offline change');
        
        expect(getByTestId('offline-queue-indicator')).toBeTruthy();
      });

      // Verify change is queued locally
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pending-changes-doc-123',
        expect.any(String)
      );
    });

    test('should sync changes when coming back online', async () => {
      // Start offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
      
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'Queued change');
      });

      // Come back online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });
      
      // Trigger network state change
      act(() => {
        const networkListener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
        networkListener({ isConnected: true });
      });

      await waitFor(() => {
        expect(getByTestId('sync-indicator')).toBeTruthy();
      });
    });

    test('should handle sync conflicts', async () => {
      // Mock conflicting changes
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        documentId: 'doc-123',
        changes: [
          { type: 'INSERT', position: 5, content: 'Local change' }
        ],
        timestamp: Date.now() - 1000 // Local change is older
      }));

      const conflictMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: {
                ...mockDocument,
                content: JSON.stringify({
                  blocks: [{
                    key: 'block1',
                    text: 'This is a Remote change for mobile viewing.',
                    type: 'paragraph',
                  }]
                }),
                lastModified: new Date().toISOString(), // Server version is newer
              },
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={conflictMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('conflict-resolution-dialog')).toBeTruthy();
      });
    });
  });

  describe('Biometric Authentication', () => {
    test('should prompt for biometric authentication for sensitive documents', async () => {
      const ReactNativeBiometrics = require('react-native-biometrics');
      
      const sensitiveDoc = {
        ...mockDocument,
        requiresBiometric: true,
      };

      const biometricMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: sensitiveDoc,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={biometricMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(ReactNativeBiometrics.simplePrompt).toHaveBeenCalledWith({
          promptMessage: 'Authenticate to access this document'
        });
      });
    });

    test('should deny access if biometric authentication fails', async () => {
      const ReactNativeBiometrics = require('react-native-biometrics');
      ReactNativeBiometrics.simplePrompt.mockResolvedValue({ success: false });

      const sensitiveDoc = {
        ...mockDocument,
        requiresBiometric: true,
      };

      const biometricMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: sensitiveDoc,
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={biometricMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('access-denied')).toBeTruthy();
      });
    });
  });

  describe('Touch Gestures', () => {
    test('should handle pinch to zoom', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const documentContainer = getByTestId('document-container');
        
        // Simulate pinch gesture
        fireEvent(documentContainer, 'onMoveShouldSetPanResponder', {
          nativeEvent: { numberActiveTouches: 2 }
        });
        
        fireEvent(documentContainer, 'onPanResponderMove', {
          nativeEvent: {
            touches: [
              { pageX: 100, pageY: 100 },
              { pageX: 150, pageY: 150 }
            ]
          }
        });

        expect(getByTestId('zoom-indicator')).toBeTruthy();
      });
    });

    test('should handle pull to refresh', async () => {
      const onRefresh = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} onRefresh={onRefresh} />
        </TestWrapper>
      );

      await waitFor(() => {
        const scrollView = getByTestId('document-scroll-view');
        
        fireEvent(scrollView, 'onRefresh');
        
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    test('should handle swipe gestures for navigation', async () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer 
            {...defaultProps} 
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        const documentContainer = getByTestId('document-container');
        
        // Simulate swipe left
        fireEvent(documentContainer, 'onPanResponderMove', {
          nativeEvent: { dx: -100, dy: 0, vx: -2 }
        });
        
        fireEvent(documentContainer, 'onPanResponderRelease', {
          nativeEvent: { dx: -100, dy: 0, vx: -2 }
        });

        expect(onSwipeLeft).toHaveBeenCalled();
      });
    });

    test('should handle long press for context menu', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textBlock = getByTestId('text-block-block1');
        
        fireEvent(textBlock, 'onLongPress');
        
        expect(getByTestId('context-menu')).toBeTruthy();
        expect(Vibration.vibrate).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Performance Optimization', () => {
    test('should virtualize long documents', async () => {
      const longContent = JSON.stringify({
        blocks: Array.from({ length: 1000 }, (_, i) => ({
          key: `block${i}`,
          text: `Block ${i} content`,
          type: 'paragraph',
        }))
      });

      const longDocMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: {
                ...mockDocument,
                content: longContent,
              },
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={longDocMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('virtualized-list')).toBeTruthy();
      });
    });

    test('should lazy load images', async () => {
      const imageContent = JSON.stringify({
        blocks: [
          {
            key: 'image1',
            text: ' ',
            type: 'atomic',
            entityRanges: [{
              offset: 0,
              length: 1,
              key: 0
            }]
          }
        ],
        entityMap: {
          0: {
            type: 'IMAGE',
            mutability: 'IMMUTABLE',
            data: {
              src: 'https://example.com/large-image.jpg'
            }
          }
        }
      });

      const imageMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: {
                ...mockDocument,
                content: imageContent,
              },
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={imageMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('lazy-image')).toBeTruthy();
        expect(getByTestId('image-placeholder')).toBeTruthy();
      });
    });

    test('should debounce text input changes', async () => {
      jest.useFakeTimers();
      const onContentChange = jest.fn();
      
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} onContentChange={onContentChange} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        
        // Rapid text changes
        fireEvent.changeText(textInput, 'A');
        fireEvent.changeText(textInput, 'AB');
        fireEvent.changeText(textInput, 'ABC');
        
        expect(onContentChange).not.toHaveBeenCalled();
        
        // Advance timers
        jest.advanceTimersByTime(300);
        
        expect(onContentChange).toHaveBeenCalledTimes(1);
      });
      
      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    test('should have proper accessibility labels', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} showToolbar={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('document-viewer')).toHaveProp('accessibilityLabel', 'Document viewer');
        expect(getByTestId('bold-button')).toHaveProp('accessibilityLabel', 'Bold text');
        expect(getByTestId('italic-button')).toHaveProp('accessibilityLabel', 'Italic text');
      });
    });

    test('should support screen reader navigation', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const documentContainer = getByTestId('document-container');
        
        expect(documentContainer).toHaveProp('accessibilityRole', 'document');
        expect(documentContainer).toHaveProp('accessibilityHint', 'Swipe to navigate through document content');
      });
    });

    test('should announce content changes to screen readers', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'New content');
        
        expect(getByTestId('accessibility-announcement')).toHaveProp(
          'accessibilityLiveRegion',
          'polite'
        );
      });
    });

    test('should support large text sizes', async () => {
      // Mock large text accessibility setting
      jest.mock('react-native', () => ({
        ...jest.requireActual('react-native'),
        AccessibilityInfo: {
          isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
          fetch: jest.fn(() => Promise.resolve(false)),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
        PixelRatio: {
          getFontScale: jest.fn(() => 1.5), // Large text
        },
      }));

      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textBlock = getByTestId('text-block-block1');
        expect(textBlock.props.style).toMatchObject({
          fontSize: expect.any(Number),
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle document parsing errors', async () => {
      const invalidContentMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: {
                ...mockDocument,
                content: 'invalid json content',
              },
            },
          },
        },
      ];

      const { getByTestId } = render(
        <MockedProvider mocks={invalidContentMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      await waitFor(() => {
        expect(getByTestId('content-error')).toBeTruthy();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to parse document content',
          expect.any(Array)
        );
      });
    });

    test('should recover from temporary network errors', async () => {
      let callCount = 0;
      const retryMocks = [
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          error: new Error('Network timeout'),
        },
        {
          request: {
            query: require('../../../apps/mobile-collaboration/src/graphql/queries/document').GET_DOCUMENT,
            variables: { id: 'doc-123' },
          },
          result: {
            data: {
              document: mockDocument,
            },
          },
        },
      ];

      const { getByTestId, getByText } = render(
        <MockedProvider mocks={retryMocks} addTypename={false}>
          <ThemeProvider>
            <OfflineProvider>
              <DocumentViewer {...defaultProps} />
            </OfflineProvider>
          </ThemeProvider>
        </MockedProvider>
      );

      // Initial error state
      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
      });

      // Retry
      const retryButton = getByTestId('retry-button');
      fireEvent.press(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(getByText('Mobile Test Document')).toBeTruthy();
      });
    });

    test('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      const { getByTestId } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const textInput = getByTestId('text-input-block1');
        fireEvent.changeText(textInput, 'Test change');
        
        // Should not crash, but show warning
        expect(getByTestId('storage-warning')).toBeTruthy();
      });
    });
  });

  describe('Memory Management', () => {
    test('should cleanup listeners on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      unmount();

      // Verify Y.js cleanup
      expect(mockYDoc.destroy).toHaveBeenCalled();
    });

    test('should release large images from memory when not visible', async () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <DocumentViewer {...defaultProps} />
        </TestWrapper>
      );

      // Simulate scrolling away from images
      await waitFor(() => {
        const scrollView = getByTestId('document-scroll-view');
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: 1000 },
            contentSize: { height: 2000 },
            layoutMeasurement: { height: 800 }
          }
        });
      });

      // Images should be unloaded
      expect(getByTestId('image-placeholder')).toBeTruthy();
    });
  });
});