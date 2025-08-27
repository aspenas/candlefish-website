/// <reference types="cypress" />

import { createAssessmentFactory, createUserFactory } from '../../../utils/test-data-factories';

describe('Assessment Workflow E2E Tests', () => {
  beforeEach(() => {
    // Mock authentication and organization setup
    cy.login('assessor@example.com', 'password123', {
      organizationId: 'org-123',
      role: 'ASSESSOR',
      permissions: ['READ_ASSESSMENTS', 'WRITE_ASSESSMENTS']
    });

    // Intercept GraphQL requests
    cy.intercept('POST', '/api/graphql', (req) => {
      if (req.body.operationName === 'GetAssessmentTemplates') {
        req.reply({
          data: {
            assessmentTemplates: [
              {
                id: 'template-1',
                name: 'Security Maturity Template',
                description: 'Comprehensive security assessment',
                questionCount: 25,
                dimensions: ['governance', 'risk-management', 'incident-response', 'awareness']
              },
              {
                id: 'template-2', 
                name: 'Privacy Maturity Template',
                description: 'GDPR and privacy assessment',
                questionCount: 18,
                dimensions: ['data-governance', 'rights-management', 'technical-measures']
              }
            ]
          }
        });
      }
    }).as('getTemplates');

    // Navigate to assessments page
    cy.visit('/assessments');
  });

  describe('Assessment Creation Flow', () => {
    it('should create a new assessment from template', () => {
      // Start assessment creation
      cy.get('[data-cy=create-assessment-btn]').click();
      
      // Verify form is displayed
      cy.get('[data-cy=assessment-form]').should('be.visible');
      cy.get('h2').should('contain', 'Create New Assessment');

      // Wait for templates to load
      cy.wait('@getTemplates');
      cy.get('[data-cy=template-cards]').should('be.visible');

      // Fill out assessment details
      cy.get('[data-cy=assessment-title]')
        .clear()
        .type('Q4 2024 Security Assessment');

      cy.get('[data-cy=assessment-description]')
        .clear()
        .type('Quarterly security maturity assessment to evaluate current posture and identify improvement areas.');

      // Select template
      cy.get('[data-cy=template-card]')
        .contains('Security Maturity Template')
        .click();

      // Verify template selection
      cy.get('[data-cy=selected-template]')
        .should('contain', 'Security Maturity Template')
        .should('contain', '25 questions');

      // Create assessment
      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'CreateAssessment') {
          expect(req.body.variables.input).to.deep.include({
            title: 'Q4 2024 Security Assessment',
            templateId: 'template-1',
            organizationId: 'org-123'
          });
          
          req.reply({
            data: {
              createAssessment: createAssessmentFactory({
                id: 'assessment-new',
                title: 'Q4 2024 Security Assessment',
                status: 'DRAFT',
                createdAt: new Date().toISOString()
              })
            }
          });
        }
      }).as('createAssessment');

      cy.get('[data-cy=create-assessment-submit]').click();

      // Verify creation success
      cy.wait('@createAssessment');
      cy.get('[data-cy=success-message]')
        .should('be.visible')
        .should('contain', 'Assessment created successfully');

      // Should navigate to assessment questions
      cy.url().should('include', '/assessments/assessment-new');
      cy.get('[data-cy=assessment-questions]').should('be.visible');
    });

    it('should validate required fields and show appropriate errors', () => {
      // Start assessment creation
      cy.get('[data-cy=create-assessment-btn]').click();

      // Try to submit without filling required fields
      cy.get('[data-cy=create-assessment-submit]').click();

      // Verify validation errors
      cy.get('[data-cy=title-error]')
        .should('be.visible')
        .should('contain', 'Title is required');

      cy.get('[data-cy=template-error]')
        .should('be.visible')
        .should('contain', 'Please select a template');

      // Fill title but leave template empty
      cy.get('[data-cy=assessment-title]').type('Test Assessment');
      cy.get('[data-cy=create-assessment-submit]').click();

      // Title error should be gone, template error should remain
      cy.get('[data-cy=title-error]').should('not.exist');
      cy.get('[data-cy=template-error]')
        .should('be.visible')
        .should('contain', 'Please select a template');
    });

    it('should handle network errors gracefully', () => {
      cy.get('[data-cy=create-assessment-btn]').click();
      
      // Fill out form
      cy.get('[data-cy=assessment-title]').type('Network Error Test');
      cy.wait('@getTemplates');
      cy.get('[data-cy=template-card]').first().click();

      // Mock network error
      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'CreateAssessment') {
          req.reply({
            statusCode: 500,
            body: { error: 'Internal server error' }
          });
        }
      }).as('createAssessmentError');

      cy.get('[data-cy=create-assessment-submit]').click();

      // Verify error handling
      cy.wait('@createAssessmentError');
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .should('contain', 'Failed to create assessment');

      // Form should remain accessible for retry
      cy.get('[data-cy=assessment-form]').should('be.visible');
      cy.get('[data-cy=create-assessment-submit]').should('not.be.disabled');
    });
  });

  describe('Assessment Question Flow', () => {
    beforeEach(() => {
      // Setup existing assessment with questions
      const mockAssessment = createAssessmentFactory({
        id: 'assessment-1',
        title: 'Security Assessment',
        status: 'IN_PROGRESS',
        questions: [
          {
            id: 'q1',
            text: 'Does your organization have a documented information security policy?',
            dimension: 'governance',
            weight: 0.25,
            options: [
              { value: 1, label: 'No policy exists', score: 0 },
              { value: 2, label: 'Basic policy exists but is outdated', score: 33 },
              { value: 3, label: 'Current policy exists but lacks detail', score: 66 },
              { value: 4, label: 'Comprehensive, current policy exists', score: 100 }
            ]
          },
          {
            id: 'q2',
            text: 'How frequently does your organization conduct security awareness training?',
            dimension: 'awareness',
            weight: 0.3,
            options: [
              { value: 1, label: 'Never', score: 0 },
              { value: 2, label: 'Ad-hoc or when incidents occur', score: 25 },
              { value: 3, label: 'Annually', score: 50 },
              { value: 4, label: 'Quarterly or more frequent', score: 100 }
            ]
          }
        ],
        responses: []
      });

      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'GetAssessment') {
          req.reply({
            data: { assessment: mockAssessment }
          });
        }
      }).as('getAssessment');

      cy.visit('/assessments/assessment-1');
      cy.wait('@getAssessment');
    });

    it('should answer questions and track progress', () => {
      // Verify assessment loaded
      cy.get('[data-cy=assessment-title]')
        .should('contain', 'Security Assessment');

      cy.get('[data-cy=progress-indicator]')
        .should('contain', '0% Complete');

      // Answer first question
      cy.get('[data-cy=question-q1]').within(() => {
        cy.get('[data-cy=question-text]')
          .should('contain', 'Does your organization have a documented information security policy?');
        
        cy.get('[data-cy=option-3]')
          .contains('Current policy exists but lacks detail')
          .click();

        cy.get('[data-cy=comments-field]')
          .type('Our policy was last updated 18 months ago and needs revision to include cloud security guidelines.');
      });

      // Verify auto-save indicator
      cy.get('[data-cy=auto-save-status]', { timeout: 3000 })
        .should('contain', 'Saved');

      // Progress should update
      cy.get('[data-cy=progress-indicator]')
        .should('contain', '50% Complete');

      // Answer second question
      cy.get('[data-cy=question-q2]').within(() => {
        cy.get('[data-cy=option-4]')
          .contains('Quarterly or more frequent')
          .click();

        cy.get('[data-cy=comments-field]')
          .type('We conduct mandatory quarterly training plus additional sessions for high-risk departments.');
      });

      // Assessment should be complete
      cy.get('[data-cy=progress-indicator]')
        .should('contain', '100% Complete');

      cy.get('[data-cy=complete-assessment-btn]')
        .should('be.visible')
        .should('not.be.disabled');
    });

    it('should handle question navigation', () => {
      // Navigate to specific question using sidebar
      cy.get('[data-cy=question-nav-q2]').click();
      cy.get('[data-cy=question-q2]').should('be.visible');
      cy.url().should('include', '#question-q2');

      // Use next/previous buttons
      cy.get('[data-cy=prev-question-btn]').click();
      cy.get('[data-cy=question-q1]').should('be.visible');

      cy.get('[data-cy=next-question-btn]').click();
      cy.get('[data-cy=question-q2]').should('be.visible');
    });

    it('should validate responses before allowing submission', () => {
      // Try to complete assessment without answering all questions
      cy.get('[data-cy=question-q1]').within(() => {
        cy.get('[data-cy=option-3]').click();
      });

      // Complete button should appear but show validation warning
      cy.get('[data-cy=complete-assessment-btn]')
        .should('be.visible')
        .click();

      cy.get('[data-cy=validation-modal]')
        .should('be.visible')
        .should('contain', 'incomplete questions');

      cy.get('[data-cy=review-incomplete-btn]').click();

      // Should highlight unanswered questions
      cy.get('[data-cy=question-q2]')
        .should('have.class', 'highlighted-incomplete');
    });
  });

  describe('Document Upload Flow', () => {
    beforeEach(() => {
      // Navigate to assessment with upload capability
      cy.visit('/assessments/assessment-1');
      cy.get('[data-cy=documents-tab]').click();
    });

    it('should upload documents via drag and drop', () => {
      // Mock file upload
      cy.fixture('sample-policy.pdf', 'base64').then((fileContent) => {
        const fileName = 'sample-policy.pdf';
        const mimeType = 'application/pdf';

        // Intercept upload mutation
        cy.intercept('POST', '/api/graphql', (req) => {
          if (req.body.operationName === 'UploadAssessmentDocument') {
            req.reply({
              data: {
                uploadAssessmentDocument: {
                  id: 'doc-1',
                  filename: fileName,
                  size: 245760,
                  mimeType,
                  processingStatus: 'PROCESSING',
                  uploadedAt: new Date().toISOString()
                }
              }
            });
          }
        }).as('uploadDocument');

        // Simulate drag and drop
        cy.get('[data-cy=upload-dropzone]')
          .trigger('dragover', { dataTransfer: { files: [] } })
          .should('have.class', 'dragover');

        cy.get('[data-cy=upload-dropzone]')
          .selectFile({
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName,
            mimeType,
            lastModified: Date.now()
          }, { action: 'drag-drop' });

        // Verify upload initiated
        cy.wait('@uploadDocument');
        cy.get('[data-cy=uploaded-document]')
          .should('contain', fileName)
          .should('contain', 'Processing...');

        // Mock processing completion
        cy.intercept('GET', '/api/documents/doc-1/status', {
          processingStatus: 'COMPLETED',
          analysisResults: {
            confidence: 0.92,
            relevantSections: [
              { section: 'Access Control', confidence: 0.95 },
              { section: 'Data Protection', confidence: 0.88 }
            ],
            suggestedResponses: [
              {
                questionId: 'q1',
                suggestedValue: 4,
                reasoning: 'Document shows comprehensive security policy'
              }
            ]
          }
        }).as('getDocumentStatus');

        // Check processing status
        cy.get('[data-cy=refresh-status-btn]').click();
        cy.wait('@getDocumentStatus');

        cy.get('[data-cy=document-analysis]')
          .should('be.visible')
          .should('contain', 'Analysis Complete');

        cy.get('[data-cy=suggested-responses]')
          .should('contain', 'Found 1 suggested response');
      });
    });

    it('should validate file types and sizes', () => {
      // Test invalid file type
      cy.fixture('invalid-file.exe', 'base64').then((fileContent) => {
        cy.get('[data-cy=upload-dropzone]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'invalid-file.exe',
          mimeType: 'application/x-msdownload',
        }, { action: 'drag-drop', force: true });

        cy.get('[data-cy=upload-error]')
          .should('be.visible')
          .should('contain', 'Invalid file type');
      });

      // Test file too large (mock 50MB file)
      cy.get('[data-cy=upload-dropzone]').selectFile({
        contents: new Uint8Array(52428800), // 50MB
        fileName: 'large-file.pdf',
        mimeType: 'application/pdf',
      }, { action: 'drag-drop', force: true });

      cy.get('[data-cy=upload-error]')
        .should('be.visible')
        .should('contain', 'File size exceeds 25MB limit');
    });
  });

  describe('Assessment Completion and Results', () => {
    it('should complete assessment and show results', () => {
      // Mock completed assessment
      const completedAssessment = createAssessmentFactory({
        id: 'assessment-1',
        status: 'COMPLETED',
        completionPercentage: 100,
        completedAt: new Date().toISOString(),
        scores: [
          { dimension: 'governance', score: 78, level: 'DEVELOPING' },
          { dimension: 'risk-management', score: 85, level: 'ADVANCED' },
          { dimension: 'incident-response', score: 62, level: 'BASIC' },
          { dimension: 'awareness', score: 91, level: 'ADVANCED' }
        ]
      });

      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'CompleteAssessment') {
          req.reply({
            data: {
              completeAssessment: completedAssessment
            }
          });
        }
      }).as('completeAssessment');

      // Navigate to assessment and complete it
      cy.visit('/assessments/assessment-1');
      cy.get('[data-cy=complete-assessment-btn]').click();
      
      // Confirm completion
      cy.get('[data-cy=confirm-completion-modal]')
        .should('be.visible');
      
      cy.get('[data-cy=confirm-complete-btn]').click();

      // Verify completion
      cy.wait('@completeAssessment');
      cy.get('[data-cy=completion-success]')
        .should('be.visible')
        .should('contain', 'Assessment completed successfully');

      // Should redirect to results
      cy.url().should('include', '/assessments/assessment-1/results');

      // Verify results display
      cy.get('[data-cy=overall-score]')
        .should('contain', '79'); // Average score

      cy.get('[data-cy=maturity-level]')
        .should('contain', 'Developing');

      // Verify dimension scores
      cy.get('[data-cy=dimension-governance]')
        .should('contain', '78')
        .should('contain', 'Developing');

      cy.get('[data-cy=dimension-awareness]')
        .should('contain', '91')
        .should('contain', 'Advanced');

      // Verify chart visualization
      cy.get('[data-cy=radar-chart]').should('be.visible');
      cy.get('[data-cy=trend-chart]').should('be.visible');
    });

    it('should generate and download PDF report', () => {
      cy.visit('/assessments/assessment-1/results');

      // Mock PDF generation
      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'GenerateMaturityReport') {
          req.reply({
            data: {
              generateMaturityReport: {
                reportUrl: '/api/reports/assessment-1-report.pdf',
                generatedAt: new Date().toISOString()
              }
            }
          });
        }
      }).as('generateReport');

      // Generate report
      cy.get('[data-cy=generate-report-btn]').click();

      // Verify report options modal
      cy.get('[data-cy=report-options-modal]')
        .should('be.visible');

      cy.get('[data-cy=include-charts]').check();
      cy.get('[data-cy=include-recommendations]').check();
      cy.get('[data-cy=include-benchmarks]').check();

      cy.get('[data-cy=generate-pdf-btn]').click();

      // Verify report generation
      cy.wait('@generateReport');
      cy.get('[data-cy=report-ready]')
        .should('be.visible')
        .should('contain', 'Report generated successfully');

      // Verify download link
      cy.get('[data-cy=download-report-btn]')
        .should('have.attr', 'href')
        .and('include', 'assessment-1-report.pdf');
    });
  });

  describe('Real-time Collaboration', () => {
    it('should handle multiple users working on same assessment', () => {
      // Setup WebSocket mock
      cy.mockWebSocket('/ws/assessment-1');

      cy.visit('/assessments/assessment-1');

      // Simulate another user joining
      cy.triggerWebSocketMessage({
        type: 'USER_JOINED',
        payload: {
          userId: 'user-2',
          userName: 'Jane Smith',
          avatar: '/avatars/jane.jpg'
        }
      });

      // Verify collaborative indicators
      cy.get('[data-cy=active-users]')
        .should('contain', 'Jane Smith')
        .should('contain', '2 users active');

      // Simulate real-time response update
      cy.get('[data-cy=question-q1] [data-cy=option-2]').click();

      cy.triggerWebSocketMessage({
        type: 'RESPONSE_UPDATED',
        payload: {
          userId: 'user-2',
          questionId: 'q2',
          selectedValue: 4,
          timestamp: new Date().toISOString()
        }
      });

      // Verify real-time update indicator
      cy.get('[data-cy=question-q2]')
        .should('have.class', 'recently-updated')
        .find('[data-cy=updated-by]')
        .should('contain', 'Updated by Jane Smith');
    });

    it('should handle connection loss gracefully', () => {
      cy.mockWebSocket('/ws/assessment-1');
      cy.visit('/assessments/assessment-1');

      // Simulate connection loss
      cy.closeWebSocket();

      cy.get('[data-cy=connection-status]')
        .should('contain', 'Connection lost')
        .should('have.class', 'status-offline');

      // Make changes while offline
      cy.get('[data-cy=question-q1] [data-cy=option-3]').click();

      // Verify offline indicators
      cy.get('[data-cy=offline-changes]')
        .should('be.visible')
        .should('contain', '1 unsaved change');

      // Restore connection
      cy.reconnectWebSocket();

      cy.get('[data-cy=connection-status]')
        .should('contain', 'Connected')
        .should('have.class', 'status-online');

      // Verify changes are synced
      cy.get('[data-cy=offline-changes]')
        .should('not.exist');

      cy.get('[data-cy=sync-success]')
        .should('be.visible')
        .should('contain', 'Changes synchronized');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load large assessments efficiently', () => {
      // Mock large assessment (100+ questions)
      const largeAssessment = createAssessmentFactory({
        id: 'large-assessment',
        questionCount: 150
      });

      cy.intercept('POST', '/api/graphql', (req) => {
        if (req.body.operationName === 'GetAssessment') {
          req.reply({ data: { assessment: largeAssessment } });
        }
      }).as('getLargeAssessment');

      // Measure loading time
      const start = performance.now();
      cy.visit('/assessments/large-assessment');
      cy.wait('@getLargeAssessment');

      cy.get('[data-cy=assessment-questions]')
        .should('be.visible');

      cy.then(() => {
        const loadTime = performance.now() - start;
        expect(loadTime).to.be.lessThan(3000); // Under 3 seconds
      });

      // Verify virtual scrolling is active
      cy.get('[data-cy=virtual-scroll-container]')
        .should('be.visible');

      // Only visible questions should be in DOM
      cy.get('[data-cy^=question-]')
        .should('have.length.lessThan', 20); // Virtual scrolling limit
    });

    it('should work on mobile devices', () => {
      // Test mobile viewport
      cy.viewport('iphone-x');
      cy.visit('/assessments/assessment-1');

      // Verify mobile-optimized layout
      cy.get('[data-cy=mobile-nav]').should('be.visible');
      cy.get('[data-cy=desktop-sidebar]').should('not.be.visible');

      // Test touch interactions
      cy.get('[data-cy=question-q1]').within(() => {
        cy.get('[data-cy=option-2]')
          .trigger('touchstart')
          .trigger('touchend');
      });

      // Verify mobile progress indicator
      cy.get('[data-cy=mobile-progress]')
        .should('be.visible')
        .should('contain', '50% Complete');

      // Test mobile document upload
      cy.get('[data-cy=mobile-upload-btn]').click();
      cy.get('[data-cy=mobile-upload-modal]')
        .should('be.visible');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle session timeout gracefully', () => {
      cy.visit('/assessments/assessment-1');

      // Mock session timeout
      cy.intercept('POST', '/api/graphql', {
        statusCode: 401,
        body: { errors: [{ message: 'Session expired' }] }
      }).as('sessionTimeout');

      cy.get('[data-cy=question-q1] [data-cy=option-2]').click();

      // Verify session timeout handling
      cy.wait('@sessionTimeout');
      cy.get('[data-cy=session-expired-modal]')
        .should('be.visible')
        .should('contain', 'Your session has expired');

      cy.get('[data-cy=login-again-btn]').click();
      
      // Should redirect to login with return URL
      cy.url().should('include', '/login');
      cy.url().should('include', 'returnTo=%2Fassessments%2Fassessment-1');
    });

    it('should preserve work during unexpected navigation', () => {
      cy.visit('/assessments/assessment-1');

      // Make changes
      cy.get('[data-cy=question-q1] [data-cy=option-3]').click();
      cy.get('[data-cy=question-q1] [data-cy=comments-field]')
        .type('Important context information');

      // Attempt to navigate away
      cy.window().then((win) => {
        win.history.pushState({}, '', '/assessments');
      });

      // Verify unsaved changes warning
      cy.get('[data-cy=unsaved-changes-modal]')
        .should('be.visible')
        .should('contain', 'You have unsaved changes');

      // Choose to stay and save
      cy.get('[data-cy=save-and-continue-btn]').click();

      // Verify changes are saved
      cy.get('[data-cy=save-success]')
        .should('be.visible')
        .should('contain', 'Changes saved');
    });
  });
});