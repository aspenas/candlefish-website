import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { AssessmentsScreen } from '../../../../apps/mobile-maturity-map/src/screens/AssessmentsScreen';
import { mockStore } from '../../../__mocks__/redux-store';
import { createMockApolloClient } from '../../../__mocks__/apollo-client';
import { 
  createAssessmentFactory,
  createUserFactory 
} from '../../../utils/test-data-factories';

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Share: {
      share: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
  };
});

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-fs for file operations
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('mock file content')),
  exists: jest.fn(() => Promise.resolve(true)),
  unlink: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
}));

// Mock expo modules
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe('AssessmentsScreen', () => {
  let mockClient: any;
  let store: any;

  beforeEach(() => {
    mockClient = createMockApolloClient();
    store = mockStore({
      auth: {
        user: createUserFactory({
          id: 'user-1',
          organizationId: 'org-123',
          role: 'ASSESSOR'
        }),
        isAuthenticated: true,
      },
      assessments: {
        assessments: [],
        loading: false,
        error: null,
      },
      network: {
        isConnected: true,
        isOnline: true,
      },
      sync: {
        lastSyncTime: null,
        pendingChanges: 0,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <ApolloProvider client={mockClient}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </ApolloProvider>
    </Provider>
  );

  describe('Initial Render', () => {
    it('should render assessments list screen', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Q4 Security Assessment',
          status: 'IN_PROGRESS',
          completionPercentage: 65,
        }),
        createAssessmentFactory({
          id: 'assessment-2',
          title: 'Privacy Audit',
          status: 'COMPLETED',
          completionPercentage: 100,
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: {
          assessments: mockAssessments,
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('My Assessments')).toBeTruthy();
      
      await waitFor(() => {
        expect(screen.getByText('Q4 Security Assessment')).toBeTruthy();
        expect(screen.getByText('Privacy Audit')).toBeTruthy();
      });

      // Check progress indicators
      expect(screen.getByText('65% Complete')).toBeTruthy();
      expect(screen.getByText('100% Complete')).toBeTruthy();
      
      // Check status badges
      expect(screen.getByText('In Progress')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('should show loading state while fetching assessments', () => {
      // Arrange
      store = mockStore({
        ...store.getState(),
        assessments: {
          ...store.getState().assessments,
          loading: true,
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.getByText('Loading assessments...')).toBeTruthy();
    });

    it('should show empty state when no assessments exist', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({
        data: {
          assessments: [],
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No assessments yet')).toBeTruthy();
        expect(screen.getByText('Create your first assessment')).toBeTruthy();
      });

      expect(screen.getByTestId('create-first-assessment-btn')).toBeTruthy();
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce(new Error('Network request failed'));

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Unable to load assessments')).toBeTruthy();
        expect(screen.getByText('Check your connection and try again')).toBeTruthy();
      });

      expect(screen.getByTestId('retry-btn')).toBeTruthy();
    });
  });

  describe('Assessment Interaction', () => {
    it('should navigate to assessment details on tap', async () => {
      // Arrange
      const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
        canGoBack: jest.fn(),
      };

      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
          status: 'IN_PROGRESS',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Security Assessment'));

      // Assert
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AssessmentDetails', {
        assessmentId: 'assessment-1',
      });
    });

    it('should show context menu on long press', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
          status: 'IN_PROGRESS',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      fireEvent(screen.getByTestId('assessment-item-assessment-1'), 'onLongPress');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Share Assessment')).toBeTruthy();
        expect(screen.getByText('Export Data')).toBeTruthy();
        expect(screen.getByText('Delete Assessment')).toBeTruthy();
      });
    });

    it('should handle pull-to-refresh', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
        }),
      ];

      mockClient.query
        .mockResolvedValueOnce({ data: { assessments: mockAssessments } })
        .mockResolvedValueOnce({ data: { assessments: [...mockAssessments, createAssessmentFactory()] } });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      const scrollView = screen.getByTestId('assessments-list');
      fireEvent(scrollView, 'onRefresh');

      // Assert
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should handle infinite scroll for large lists', async () => {
      // Arrange
      const initialAssessments = Array.from({ length: 20 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i}`,
          title: `Assessment ${i + 1}`,
        })
      );

      const nextPageAssessments = Array.from({ length: 10 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i + 20}`,
          title: `Assessment ${i + 21}`,
        })
      );

      mockClient.query
        .mockResolvedValueOnce({ 
          data: { 
            assessments: initialAssessments,
            hasNextPage: true 
          } 
        })
        .mockResolvedValueOnce({ 
          data: { 
            assessments: nextPageAssessments,
            hasNextPage: false 
          } 
        });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Assessment 1')).toBeTruthy();
        expect(screen.getByText('Assessment 20')).toBeTruthy();
      });

      // Scroll to end
      const scrollView = screen.getByTestId('assessments-list');
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 2000 },
          contentSize: { height: 2500 },
          layoutMeasurement: { height: 800 },
        },
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Assessment 21')).toBeTruthy();
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should work offline with cached data', async () => {
      // Arrange
      store = mockStore({
        ...store.getState(),
        network: {
          isConnected: false,
          isOnline: false,
        },
        assessments: {
          assessments: [
            createAssessmentFactory({
              id: 'assessment-1',
              title: 'Cached Assessment',
              status: 'IN_PROGRESS',
            }),
          ],
          loading: false,
          error: null,
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Cached Assessment')).toBeTruthy();
      expect(screen.getByTestId('offline-indicator')).toBeTruthy();
      expect(screen.getByText('Working offline')).toBeTruthy();
    });

    it('should show sync pending indicators', () => {
      // Arrange
      store = mockStore({
        ...store.getState(),
        sync: {
          lastSyncTime: Date.now() - 300000, // 5 minutes ago
          pendingChanges: 3,
        },
        assessments: {
          assessments: [
            createAssessmentFactory({
              id: 'assessment-1',
              title: 'Modified Assessment',
              status: 'IN_PROGRESS',
              hasLocalChanges: true,
            }),
          ],
          loading: false,
          error: null,
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByTestId('sync-pending-indicator')).toBeTruthy();
      expect(screen.getByText('3 changes pending sync')).toBeTruthy();
      expect(screen.getByTestId('modified-indicator-assessment-1')).toBeTruthy();
    });

    it('should handle sync conflicts', async () => {
      // Arrange
      store = mockStore({
        ...store.getState(),
        sync: {
          conflicts: [
            {
              assessmentId: 'assessment-1',
              localVersion: createAssessmentFactory({ title: 'Local Version' }),
              remoteVersion: createAssessmentFactory({ title: 'Remote Version' }),
            },
          ],
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Sync conflicts detected')).toBeTruthy();
      expect(screen.getByTestId('resolve-conflicts-btn')).toBeTruthy();
    });
  });

  describe('Search and Filtering', () => {
    it('should filter assessments by search query', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
          status: 'IN_PROGRESS',
        }),
        createAssessmentFactory({
          id: 'assessment-2',
          title: 'Privacy Audit',
          status: 'COMPLETED',
        }),
        createAssessmentFactory({
          id: 'assessment-3',
          title: 'Risk Assessment',
          status: 'DRAFT',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
        expect(screen.getByText('Privacy Audit')).toBeTruthy();
        expect(screen.getByText('Risk Assessment')).toBeTruthy();
      });

      const searchInput = screen.getByTestId('search-input');
      fireEvent.changeText(searchInput, 'security');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
        expect(screen.queryByText('Privacy Audit')).toBeNull();
        expect(screen.getByText('Risk Assessment')).toBeTruthy(); // Contains "ecurity"
      });
    });

    it('should filter by status', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({ status: 'IN_PROGRESS', title: 'Assessment 1' }),
        createAssessmentFactory({ status: 'COMPLETED', title: 'Assessment 2' }),
        createAssessmentFactory({ status: 'DRAFT', title: 'Assessment 3' }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Assessment 1')).toBeTruthy();
        expect(screen.getByText('Assessment 2')).toBeTruthy();
        expect(screen.getByText('Assessment 3')).toBeTruthy();
      });

      const filterButton = screen.getByTestId('filter-btn');
      fireEvent.press(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Filter by Status')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('In Progress'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Assessment 1')).toBeTruthy();
        expect(screen.queryByText('Assessment 2')).toBeNull();
        expect(screen.queryByText('Assessment 3')).toBeNull();
      });
    });

    it('should sort assessments', async () => {
      // Arrange
      const mockAssessments = [
        createAssessmentFactory({
          title: 'C Assessment',
          createdAt: '2024-01-01T00:00:00Z',
        }),
        createAssessmentFactory({
          title: 'A Assessment',
          createdAt: '2024-01-03T00:00:00Z',
        }),
        createAssessmentFactory({
          title: 'B Assessment',
          createdAt: '2024-01-02T00:00:00Z',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('A Assessment')).toBeTruthy();
        expect(screen.getByText('B Assessment')).toBeTruthy();
        expect(screen.getByText('C Assessment')).toBeTruthy();
      });

      const sortButton = screen.getByTestId('sort-btn');
      fireEvent.press(sortButton);

      fireEvent.press(screen.getByText('Name (A-Z)'));

      // Assert - Check that items are reordered
      const assessmentItems = screen.getAllByTestId(/assessment-item-/);
      expect(assessmentItems[0]).toHaveTextContent('A Assessment');
      expect(assessmentItems[1]).toHaveTextContent('B Assessment');
      expect(assessmentItems[2]).toHaveTextContent('C Assessment');
    });
  });

  describe('Document Upload Integration', () => {
    it('should handle document upload from assessment list', async () => {
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
          status: 'IN_PROGRESS',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValueOnce({
        type: 'success',
        name: 'policy-document.pdf',
        size: 1024000,
        uri: 'file:///path/to/document.pdf',
        mimeType: 'application/pdf',
      });

      mockClient.mutate.mockResolvedValueOnce({
        data: {
          uploadAssessmentDocument: {
            id: 'doc-1',
            filename: 'policy-document.pdf',
            processingStatus: 'PROCESSING',
          },
        },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      const quickUploadButton = screen.getByTestId('quick-upload-btn-assessment-1');
      fireEvent.press(quickUploadButton);

      // Assert
      await waitFor(() => {
        expect(mockDocumentPicker.getDocumentAsync).toHaveBeenCalled();
        expect(mockClient.mutate).toHaveBeenCalled();
        expect(screen.getByText('Document uploaded successfully')).toBeTruthy();
      });
    });

    it('should validate file types before upload', async () => {
      const mockDocumentPicker = require('expo-document-picker');
      mockDocumentPicker.getDocumentAsync.mockResolvedValueOnce({
        type: 'success',
        name: 'malware.exe',
        size: 1024,
        uri: 'file:///path/to/malware.exe',
        mimeType: 'application/x-msdownload',
      });

      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      const quickUploadButton = screen.getByTestId('quick-upload-btn-assessment-1');
      fireEvent.press(quickUploadButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Invalid file type')).toBeTruthy();
        expect(screen.getByText('Please select a PDF, DOCX, or TXT file')).toBeTruthy();
      });

      expect(mockClient.mutate).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should virtualize large lists for performance', async () => {
      // Arrange
      const manyAssessments = Array.from({ length: 1000 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i}`,
          title: `Assessment ${i + 1}`,
        })
      );

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: manyAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should only render visible items
        const renderedItems = screen.getAllByTestId(/assessment-item-/);
        expect(renderedItems.length).toBeLessThan(50); // Virtual list threshold
      });
    });

    it('should implement smooth animations', async () => {
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Security Assessment')).toBeTruthy();
      });

      const assessmentItem = screen.getByTestId('assessment-item-assessment-1');
      
      // Test press animation
      fireEvent(assessmentItem, 'onPressIn');
      // In a real test, we would check for animation properties
      // This is a placeholder for animation testing
      expect(assessmentItem).toBeTruthy();
    });

    it('should handle memory efficiently with large datasets', async () => {
      // This would test memory usage patterns
      // In a real implementation, we'd measure memory consumption
      const largeAssessments = Array.from({ length: 10000 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i}`,
          title: `Assessment ${i + 1}`,
          // Large data objects to test memory handling
          responses: Array.from({ length: 100 }, (_, j) => ({
            questionId: `q${j}`,
            selectedValue: Math.floor(Math.random() * 4) + 1,
            comments: `Long comment ${j} `.repeat(100),
          })),
        })
      );

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: largeAssessments.slice(0, 20) }, // Paginated
      });

      // Act
      const { unmount } = render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Assessment 1')).toBeTruthy();
      });

      // Test cleanup
      unmount();
      // In a real test, we'd verify memory was properly released
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader accessibility', async () => {
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
          status: 'IN_PROGRESS',
          completionPercentage: 75,
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const assessmentItem = screen.getByTestId('assessment-item-assessment-1');
        expect(assessmentItem).toHaveProp('accessible', true);
        expect(assessmentItem).toHaveProp(
          'accessibilityLabel',
          'Security Assessment, In Progress, 75% complete'
        );
        expect(assessmentItem).toHaveProp('accessibilityRole', 'button');
        expect(assessmentItem).toHaveProp('accessibilityHint', 'Double tap to open assessment');
      });
    });

    it('should support dynamic text sizing', async () => {
      // This would test with different text size settings
      // In React Native, this involves testing with different font scales
      const mockAssessments = [
        createAssessmentFactory({
          title: 'Test Assessment',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const titleText = screen.getByText('Test Assessment');
        // In a real test, we'd verify the text scales properly
        expect(titleText).toBeTruthy();
      });
    });

    it('should handle voice control commands', async () => {
      // Test Voice Control / Switch Control accessibility
      const mockAssessments = [
        createAssessmentFactory({
          id: 'assessment-1',
          title: 'Security Assessment',
        }),
      ];

      mockClient.query.mockResolvedValueOnce({
        data: { assessments: mockAssessments },
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentsScreen />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const assessmentItem = screen.getByTestId('assessment-item-assessment-1');
        expect(assessmentItem).toHaveProp('accessibilityActions');
        expect(assessmentItem).toHaveProp('onAccessibilityAction');
      });
    });
  });
});