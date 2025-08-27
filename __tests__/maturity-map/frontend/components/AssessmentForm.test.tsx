import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { AssessmentForm } from '../../../../components/maturity-map/AssessmentForm';
import { 
  CREATE_ASSESSMENT,
  SUBMIT_ASSESSMENT_RESPONSE,
  UPLOAD_ASSESSMENT_DOCUMENT 
} from '../../../../graphql/mutations';
import { GET_ASSESSMENT_TEMPLATES } from '../../../../graphql/queries';
import { 
  createAssessmentFactory,
  createTemplateFactory,
  createQuestionFactory 
} from '../../../utils/test-data-factories';

// Mock file upload for testing
const mockFile = new File(['test content'], 'test-document.pdf', {
  type: 'application/pdf',
});

// Mock drag and drop API
Object.defineProperty(window, 'DataTransfer', {
  value: class DataTransfer {
    items: any[] = [];
    files: File[] = [];
    
    constructor() {
      this.items = [];
      this.files = [];
    }
  }
});

describe('AssessmentForm Component', () => {
  const mockTemplate = createTemplateFactory({
    id: 'template-1',
    name: 'Security Maturity Template',
    questions: [
      createQuestionFactory({
        id: 'q1',
        text: 'Does your organization have a documented security policy?',
        dimension: 'governance',
        weight: 0.3,
        options: [
          { value: 1, label: 'No policy exists', score: 0 },
          { value: 2, label: 'Basic policy exists', score: 25 },
          { value: 3, label: 'Comprehensive policy exists', score: 75 },
          { value: 4, label: 'Policy is regularly reviewed and updated', score: 100 }
        ]
      }),
      createQuestionFactory({
        id: 'q2',
        text: 'How often do you conduct security awareness training?',
        dimension: 'people',
        weight: 0.4,
        options: [
          { value: 1, label: 'Never', score: 0 },
          { value: 2, label: 'Annually', score: 33 },
          { value: 3, label: 'Quarterly', score: 66 },
          { value: 4, label: 'Monthly or more frequent', score: 100 }
        ]
      })
    ]
  });

  const defaultMocks = [
    {
      request: {
        query: GET_ASSESSMENT_TEMPLATES,
        variables: { organizationId: 'org-123' }
      },
      result: {
        data: {
          assessmentTemplates: [mockTemplate]
        }
      }
    }
  ];

  const TestWrapper: React.FC<{ children: React.ReactNode; mocks?: any[] }> = ({ 
    children, 
    mocks = defaultMocks 
  }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </MockedProvider>
  );

  beforeEach(() => {
    // Reset any global mocks
    jest.clearAllMocks();
  });

  describe('Form Initialization', () => {
    it('should render assessment creation form', async () => {
      // Arrange & Act
      render(
        <TestWrapper>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Create New Assessment')).toBeInTheDocument();
      expect(screen.getByLabelText('Assessment Title')).toBeInTheDocument();
      expect(screen.getByText('Select Template')).toBeInTheDocument();

      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Security Maturity Template')).toBeInTheDocument();
      });
    });

    it('should render assessment editing form with existing data', async () => {
      // Arrange
      const existingAssessment = createAssessmentFactory({
        id: 'assessment-1',
        title: 'Existing Assessment',
        status: 'IN_PROGRESS',
        questions: mockTemplate.questions,
        responses: [
          { questionId: 'q1', selectedValue: 2, comments: 'We have basic policies' }
        ]
      });

      // Act
      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={existingAssessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Edit Assessment')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing Assessment')).toBeInTheDocument();
      
      // Check that previous responses are pre-selected
      const question1 = screen.getByText('Does your organization have a documented security policy?');
      const basicPolicyOption = within(question1.closest('.question-container')!).getByLabelText('Basic policy exists');
      expect(basicPolicyOption).toBeChecked();
    });

    it('should display loading state while fetching templates', () => {
      // Arrange
      const loadingMocks = [
        {
          request: {
            query: GET_ASSESSMENT_TEMPLATES,
            variables: { organizationId: 'org-123' }
          },
          delay: 1000,
          result: {
            data: { assessmentTemplates: [] }
          }
        }
      ];

      // Act
      render(
        <TestWrapper mocks={loadingMocks}>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn();

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={onSubmit}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act - Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Please select a template')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should validate title length limits', async () => {
      // Arrange
      const user = userEvent.setup();
      const longTitle = 'A'.repeat(256); // Exceeds 255 character limit

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByLabelText('Assessment Title');
      await user.clear(titleInput);
      await user.type(titleInput, longTitle);
      
      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      expect(screen.getByText('Title must be 255 characters or less')).toBeInTheDocument();
    });

    it('should validate special characters in title', async () => {
      // Arrange
      const user = userEvent.setup();
      const invalidTitle = 'Assessment <script>alert("xss")</script>';

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByLabelText('Assessment Title');
      await user.clear(titleInput);
      await user.type(titleInput, invalidTitle);

      // Assert - Should sanitize input and show warning
      expect(screen.getByText('Title contains invalid characters')).toBeInTheDocument();
      expect(titleInput).toHaveValue('Assessment alert("xss")'); // Script tags removed
    });
  });

  describe('Assessment Creation', () => {
    it('should create new assessment successfully', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      
      const createMocks = [
        ...defaultMocks,
        {
          request: {
            query: CREATE_ASSESSMENT,
            variables: {
              input: {
                title: 'New Security Assessment',
                templateId: 'template-1',
                organizationId: 'org-123'
              }
            }
          },
          result: {
            data: {
              createAssessment: createAssessmentFactory({
                id: 'assessment-new',
                title: 'New Security Assessment'
              })
            }
          }
        }
      ];

      render(
        <TestWrapper mocks={createMocks}>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={onSubmit}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Security Maturity Template')).toBeInTheDocument();
      });

      // Fill form
      const titleInput = screen.getByLabelText('Assessment Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Security Assessment');

      const templateOption = screen.getByLabelText('Security Maturity Template');
      await user.click(templateOption);

      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
          id: 'assessment-new',
          title: 'New Security Assessment'
        }));
      });
    });

    it('should handle creation errors gracefully', async () => {
      // Arrange
      const user = userEvent.setup();
      const errorMocks = [
        ...defaultMocks,
        {
          request: {
            query: CREATE_ASSESSMENT,
            variables: expect.any(Object)
          },
          error: new Error('Network error occurred')
        }
      ];

      render(
        <TestWrapper mocks={errorMocks}>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      await waitFor(() => {
        expect(screen.getByText('Security Maturity Template')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText('Assessment Title');
      await user.type(titleInput, 'Test Assessment');
      
      const templateOption = screen.getByLabelText('Security Maturity Template');
      await user.click(templateOption);

      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to create assessment. Please try again.')).toBeInTheDocument();
      });

      expect(screen.getByRole('alert')).toHaveClass('error');
    });

    it('should show loading state during creation', async () => {
      // Arrange
      const user = userEvent.setup();
      const delayedMocks = [
        ...defaultMocks,
        {
          request: {
            query: CREATE_ASSESSMENT,
            variables: expect.any(Object)
          },
          delay: 1000,
          result: {
            data: {
              createAssessment: createAssessmentFactory()
            }
          }
        }
      ];

      render(
        <TestWrapper mocks={delayedMocks}>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      await waitFor(() => {
        expect(screen.getByText('Security Maturity Template')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText('Assessment Title');
      await user.type(titleInput, 'Test Assessment');
      
      const templateOption = screen.getByLabelText('Security Maturity Template');
      await user.click(templateOption);

      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      expect(screen.getByText('Creating assessment...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Question Response Handling', () => {
    it('should handle single-choice questions', async () => {
      // Arrange
      const user = userEvent.setup();
      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const question1Section = screen.getByText('Does your organization have a documented security policy?').closest('.question-container');
      const comprehensiveOption = within(question1Section!).getByLabelText('Comprehensive policy exists');
      await user.click(comprehensiveOption);

      // Assert
      expect(comprehensiveOption).toBeChecked();
      
      // Verify other options are unchecked
      const basicOption = within(question1Section!).getByLabelText('Basic policy exists');
      expect(basicOption).not.toBeChecked();
    });

    it('should handle comments for questions', async () => {
      // Arrange
      const user = userEvent.setup();
      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const question1Section = screen.getByText('Does your organization have a documented security policy?').closest('.question-container');
      const commentsField = within(question1Section!).getByLabelText('Additional comments');
      await user.type(commentsField, 'Our policy was updated last quarter and includes new GDPR requirements.');

      // Assert
      expect(commentsField).toHaveValue('Our policy was updated last quarter and includes new GDPR requirements.');
    });

    it('should validate comment length limits', async () => {
      // Arrange
      const user = userEvent.setup();
      const longComment = 'A'.repeat(1001); // Exceeds 1000 character limit
      
      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const question1Section = screen.getByText('Does your organization have a documented security policy?').closest('.question-container');
      const commentsField = within(question1Section!).getByLabelText('Additional comments');
      await user.type(commentsField, longComment);

      // Assert
      expect(screen.getByText('Comment must be 1000 characters or less')).toBeInTheDocument();
      expect(screen.getByText('1001/1000')).toBeInTheDocument(); // Character counter
    });

    it('should auto-save responses periodically', async () => {
      // Arrange
      const user = userEvent.setup();
      const saveMocks = [
        {
          request: {
            query: SUBMIT_ASSESSMENT_RESPONSE,
            variables: {
              input: {
                assessmentId: 'assessment-1',
                responses: [
                  { questionId: 'q1', selectedValue: 3 }
                ]
              }
            }
          },
          result: {
            data: {
              submitAssessmentResponse: createAssessmentFactory({
                id: 'assessment-1',
                completionPercentage: 50
              })
            }
          }
        }
      ];

      const assessment = createAssessmentFactory({
        id: 'assessment-1',
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper mocks={saveMocks}>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
            autoSaveInterval={1000} // 1 second for testing
          />
        </TestWrapper>
      );

      // Act
      const question1Section = screen.getByText('Does your organization have a documented security policy?').closest('.question-container');
      const comprehensiveOption = within(question1Section!).getByLabelText('Comprehensive policy exists');
      await user.click(comprehensiveOption);

      // Wait for auto-save
      await waitFor(() => {
        expect(screen.getByText('Auto-saved')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Assert
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });
  });

  describe('Document Upload', () => {
    it('should handle file upload via drag and drop', async () => {
      // Arrange
      const uploadMocks = [
        {
          request: {
            query: UPLOAD_ASSESSMENT_DOCUMENT,
            variables: {
              input: {
                assessmentId: 'assessment-1',
                file: expect.any(Object)
              }
            }
          },
          result: {
            data: {
              uploadAssessmentDocument: {
                id: 'doc-1',
                filename: 'test-document.pdf',
                size: 1024,
                processingStatus: 'PROCESSING'
              }
            }
          }
        }
      ];

      const assessment = createAssessmentFactory({
        id: 'assessment-1',
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper mocks={uploadMocks}>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const dropZone = screen.getByText('Drop documents here or click to upload');
      
      // Simulate drag and drop
      const dragEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      });

      fireEvent(dropZone, dragEvent);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });
    });

    it('should validate file types and sizes', async () => {
      // Arrange
      const invalidFile = new File(['content'], 'malware.exe', {
        type: 'application/x-msdownload'
      });

      const assessment = createAssessmentFactory({
        id: 'assessment-1',
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const dropZone = screen.getByText('Drop documents here or click to upload');
      const dragEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { files: [invalidFile] }
      });

      fireEvent(dropZone, dragEvent);

      // Assert
      expect(screen.getByText('Invalid file type. Please upload PDF, DOCX, or TXT files only.')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('error');
    });

    it('should show upload progress', async () => {
      // Arrange
      let progressCallback: ((progress: number) => void) | undefined;
      
      const uploadMocks = [
        {
          request: {
            query: UPLOAD_ASSESSMENT_DOCUMENT,
            variables: expect.any(Object)
          },
          result: () => {
            // Simulate upload progress
            setTimeout(() => progressCallback?.(25), 100);
            setTimeout(() => progressCallback?.(50), 200);
            setTimeout(() => progressCallback?.(75), 300);
            setTimeout(() => progressCallback?.(100), 400);
            
            return {
              data: {
                uploadAssessmentDocument: {
                  id: 'doc-1',
                  filename: 'test-document.pdf',
                  processingStatus: 'COMPLETED'
                }
              }
            };
          }
        }
      ];

      const assessment = createAssessmentFactory({
        id: 'assessment-1',
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper mocks={uploadMocks}>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const dropZone = screen.getByText('Drop documents here or click to upload');
      const dragEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { files: [mockFile] }
      });

      fireEvent(dropZone, dragEvent);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Upload completed')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      // Arrange
      const user = userEvent.setup();
      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act - Navigate with keyboard
      await user.tab(); // Focus first question
      await user.keyboard('{ArrowDown}'); // Navigate to next option
      await user.keyboard('{Space}'); // Select option

      // Assert
      const selectedOption = screen.getByRole('radio', { checked: true });
      expect(selectedOption).toBeInTheDocument();
      expect(selectedOption).toHaveFocus();
    });

    it('should have proper ARIA labels and descriptions', () => {
      // Arrange
      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Assert
      const question1 = screen.getByRole('group', { 
        name: 'Does your organization have a documented security policy?' 
      });
      expect(question1).toHaveAttribute('aria-required', 'true');

      const progressIndicator = screen.getByRole('progressbar');
      expect(progressIndicator).toHaveAttribute('aria-label', 'Assessment completion progress');

      const helpText = screen.getByText('Select the option that best describes your current state');
      expect(helpText).toHaveAttribute('id');
      
      const firstQuestion = screen.getByRole('radiogroup');
      expect(firstQuestion).toHaveAttribute('aria-describedby', helpText.id);
    });

    it('should announce form errors to screen readers', async () => {
      // Arrange
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="create"
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Act
      const submitButton = screen.getByRole('button', { name: /create assessment/i });
      await user.click(submitButton);

      // Assert
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      expect(errorAlert).toContainHTML('Title is required');
    });
  });

  describe('Performance and Optimization', () => {
    it('should implement virtual scrolling for large question lists', () => {
      // Arrange - Create assessment with many questions
      const manyQuestions = Array.from({ length: 500 }, (_, i) =>
        createQuestionFactory({
          id: `q${i}`,
          text: `Question ${i}`,
          dimension: 'governance'
        })
      );

      const assessment = createAssessmentFactory({
        questions: manyQuestions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
          />
        </TestWrapper>
      );

      // Assert - Only visible questions should be rendered
      const questionElements = screen.getAllByRole('group');
      expect(questionElements.length).toBeLessThan(50); // Virtual scrolling active
      
      const virtualScrollContainer = screen.getByTestId('virtual-scroll-container');
      expect(virtualScrollContainer).toBeInTheDocument();
    });

    it('should debounce auto-save to prevent excessive requests', async () => {
      // Arrange
      const user = userEvent.setup();
      const saveMock = jest.fn().mockResolvedValue({
        data: { submitAssessmentResponse: createAssessmentFactory() }
      });

      const assessment = createAssessmentFactory({
        questions: mockTemplate.questions,
        status: 'IN_PROGRESS'
      });

      render(
        <TestWrapper mocks={[{
          request: { query: SUBMIT_ASSESSMENT_RESPONSE },
          result: saveMock
        }]}>
          <AssessmentForm 
            mode="edit"
            assessment={assessment}
            organizationId="org-123"
            onSubmit={jest.fn()}
            onCancel={jest.fn()}
            autoSaveInterval={500}
          />
        </TestWrapper>
      );

      // Act - Rapid changes should be debounced
      const question1Section = screen.getByText('Does your organization have a documented security policy?').closest('.question-container');
      const options = within(question1Section!).getAllByRole('radio');
      
      await user.click(options[0]);
      await user.click(options[1]);
      await user.click(options[2]);
      await user.click(options[3]);

      // Wait for debounced save
      await waitFor(() => {
        expect(screen.getByText('Auto-saved')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Assert - Should only save once after debounce period
      expect(saveMock).toHaveBeenCalledTimes(1);
    });
  });
});