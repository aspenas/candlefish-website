describe('Document Management', () => {
  beforeEach(() => {
    cy.login();
    cy.task('cleanDatabase');
    cy.task('seedDatabase');
  });

  describe('Document Creation', () => {
    it('should create a new document', () => {
      cy.visit('/documents');

      cy.get('[data-testid="create-document-button"]').click();
      cy.url().should('include', '/documents/create');

      // Fill in document details
      cy.get('[data-testid="document-title-input"]').type('My New Document');
      cy.get('[data-testid="document-content-editor"]').type('This is the content of my new document.');

      // Set document status
      cy.get('[data-testid="status-select"]').select('DRAFT');

      // Save document
      cy.get('[data-testid="save-document-button"]').click();

      cy.wait('@createDocument');

      // Should redirect to document view
      cy.url().should('match', /\/documents\/[a-zA-Z0-9-]+$/);

      // Verify document was created
      cy.get('[data-testid="document-title"]').should('contain', 'My New Document');
      cy.get('[data-testid="document-content"]').should('contain', 'This is the content of my new document.');
      cy.get('[data-testid="document-status"]').should('contain', 'DRAFT');
    });

    it('should validate required fields', () => {
      cy.visit('/documents/create');

      // Try to save without required fields
      cy.get('[data-testid="save-document-button"]').click();

      cy.get('[data-testid="title-error"]')
        .should('be.visible')
        .and('contain', 'Title is required');
    });

    it('should save as draft automatically', () => {
      cy.visit('/documents/create');

      cy.get('[data-testid="document-title-input"]').type('Auto-saved Document');
      cy.get('[data-testid="document-content-editor"]').type('This should be auto-saved.');

      // Wait for auto-save
      cy.wait(3000);

      cy.get('[data-testid="auto-save-indicator"]')
        .should('be.visible')
        .and('contain', 'Saved');
    });

    it('should handle rich text formatting', () => {
      cy.visit('/documents/create');

      cy.get('[data-testid="document-title-input"]').type('Formatted Document');

      // Focus on editor
      cy.get('[data-testid="document-content-editor"]').click();

      // Type content
      cy.get('[data-testid="document-content-editor"]').type('This is bold text');

      // Select text and apply formatting
      cy.get('[data-testid="document-content-editor"]')
        .type('{selectall}')
        .then(() => {
          cy.get('[data-testid="bold-button"]').click();
        });

      // Add more content
      cy.get('[data-testid="document-content-editor"]')
        .type('{movetoend}')
        .type('{enter}This is italic text')
        .type('{selectall}')
        .then(() => {
          cy.get('[data-testid="italic-button"]').click();
        });

      cy.get('[data-testid="save-document-button"]').click();

      cy.wait('@createDocument');

      // Verify formatting is preserved
      cy.get('[data-testid="document-content"]')
        .should('contain.html', '<strong>')  // Bold formatting
        .and('contain.html', '<em>');        // Italic formatting
    });
  });

  describe('Document Listing', () => {
    beforeEach(() => {
      // Create test documents
      cy.createDocument({ title: 'First Document', status: 'PUBLISHED' });
      cy.createDocument({ title: 'Second Document', status: 'DRAFT' });
      cy.createDocument({ title: 'Third Document', status: 'REVIEW' });
    });

    it('should display list of documents', () => {
      cy.visit('/documents');

      cy.wait('@getDocuments');

      cy.get('[data-testid="document-list"]').should('be.visible');
      cy.get('[data-testid^="document-item-"]').should('have.length', 3);

      // Check document cards contain expected information
      cy.get('[data-testid="document-item-1"]').within(() => {
        cy.get('[data-testid="document-title"]').should('contain', 'First Document');
        cy.get('[data-testid="document-status"]').should('contain', 'PUBLISHED');
        cy.get('[data-testid="document-author"]').should('be.visible');
        cy.get('[data-testid="document-date"]').should('be.visible');
      });
    });

    it('should filter documents by status', () => {
      cy.visit('/documents');

      cy.wait('@getDocuments');

      // Filter by DRAFT status
      cy.get('[data-testid="status-filter"]').select('DRAFT');

      cy.get('[data-testid^="document-item-"]').should('have.length', 1);
      cy.get('[data-testid="document-item-1"]')
        .find('[data-testid="document-status"]')
        .should('contain', 'DRAFT');
    });

    it('should search documents by title', () => {
      cy.visit('/documents');

      cy.wait('@getDocuments');

      cy.get('[data-testid="search-input"]').type('First');

      cy.get('[data-testid^="document-item-"]').should('have.length', 1);
      cy.get('[data-testid="document-item-1"]')
        .find('[data-testid="document-title"]')
        .should('contain', 'First Document');
    });

    it('should sort documents by different criteria', () => {
      cy.visit('/documents');

      cy.wait('@getDocuments');

      // Sort by title A-Z
      cy.get('[data-testid="sort-select"]').select('title-asc');

      cy.get('[data-testid^="document-item-"]').first()
        .find('[data-testid="document-title"]')
        .should('contain', 'First Document');

      // Sort by title Z-A
      cy.get('[data-testid="sort-select"]').select('title-desc');

      cy.get('[data-testid^="document-item-"]').first()
        .find('[data-testid="document-title"]')
        .should('contain', 'Third Document');
    });

    it('should paginate large document lists', () => {
      // Create many documents
      for (let i = 4; i <= 25; i++) {
        cy.createDocument({ title: `Document ${i}`, status: 'PUBLISHED' });
      }

      cy.visit('/documents');

      cy.wait('@getDocuments');

      // Should show first page (10 items per page)
      cy.get('[data-testid^="document-item-"]').should('have.length', 10);

      // Check pagination controls
      cy.get('[data-testid="pagination"]').should('be.visible');
      cy.get('[data-testid="page-info"]').should('contain', '1 of 3');

      // Go to next page
      cy.get('[data-testid="next-page-button"]').click();

      cy.get('[data-testid^="document-item-"]').should('have.length', 10);
      cy.get('[data-testid="page-info"]').should('contain', '2 of 3');
    });
  });

  describe('Document Editing', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Editable Document',
        content: 'Original content',
        status: 'DRAFT'
      }).as('testDocument');
    });

    it('should edit document content', function() {
      cy.visit(`/documents/${this.testDocument.id}/edit`);

      // Modify title
      cy.get('[data-testid="document-title-input"]')
        .clear()
        .type('Updated Document Title');

      // Modify content
      cy.get('[data-testid="document-content-editor"]')
        .clear()
        .type('This is the updated content with new information.');

      // Change status
      cy.get('[data-testid="status-select"]').select('REVIEW');

      // Save changes
      cy.get('[data-testid="save-document-button"]').click();

      cy.wait('@updateDocument');

      // Verify changes were saved
      cy.get('[data-testid="document-title"]').should('contain', 'Updated Document Title');
      cy.get('[data-testid="document-content"]').should('contain', 'updated content');
      cy.get('[data-testid="document-status"]').should('contain', 'REVIEW');
    });

    it('should show unsaved changes warning', function() {
      cy.visit(`/documents/${this.testDocument.id}/edit`);

      // Make changes
      cy.get('[data-testid="document-title-input"]')
        .clear()
        .type('Changed Title');

      // Try to navigate away
      cy.get('[data-testid="back-button"]').click();

      // Should show confirmation dialog
      cy.get('[data-testid="unsaved-changes-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-discard"]').click();

      // Should navigate away
      cy.url().should('include', '/documents');
    });

    it('should handle concurrent editing conflicts', function() {
      cy.visit(`/documents/${this.testDocument.id}/edit`);

      // Simulate another user editing the same document
      cy.updateDocument(this.testDocument.id, {
        title: 'Externally Updated Title',
        content: 'Content updated by another user'
      });

      // Make local changes
      cy.get('[data-testid="document-title-input"]')
        .clear()
        .type('Locally Updated Title');

      // Try to save
      cy.get('[data-testid="save-document-button"]').click();

      // Should show conflict resolution dialog
      cy.get('[data-testid="conflict-dialog"]').should('be.visible');

      // Choose to merge changes
      cy.get('[data-testid="merge-changes-button"]').click();

      // Should show merge interface
      cy.get('[data-testid="merge-interface"]').should('be.visible');
    });
  });

  describe('Document Collaboration', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Collaborative Document',
        content: 'Shared content',
        status: 'DRAFT'
      }).as('sharedDocument');
    });

    it('should show real-time collaborators', function() {
      cy.visit(`/documents/${this.sharedDocument.id}/edit`);

      // Mock WebSocket connection for real-time updates
      cy.window().then((win) => {
        const mockWS = {
          send: cy.stub(),
          close: cy.stub(),
        };

        win.mockWebSocket = mockWS;
      });

      // Simulate another user joining
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('collaborator-joined', {
          detail: {
            userId: 'user-2',
            userName: 'Jane Doe',
            avatar: 'https://avatar.example.com/jane.jpg'
          }
        }));
      });

      // Should show collaborator avatar
      cy.get('[data-testid="collaborator-avatars"]')
        .should('be.visible')
        .within(() => {
          cy.get('[data-testid="collaborator-jane"]').should('be.visible');
        });
    });

    it('should show real-time cursor positions', function() {
      cy.visit(`/documents/${this.sharedDocument.id}/edit`);

      // Simulate remote cursor update
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('cursor-update', {
          detail: {
            userId: 'user-2',
            userName: 'Jane Doe',
            position: 15,
            color: '#ff6b6b'
          }
        }));
      });

      // Should show remote cursor
      cy.get('[data-testid="remote-cursor-user-2"]')
        .should('be.visible')
        .and('have.css', 'border-color', 'rgb(255, 107, 107)');
    });

    it('should handle real-time content updates', function() {
      cy.visit(`/documents/${this.sharedDocument.id}/edit`);

      // Focus on editor
      cy.get('[data-testid="document-content-editor"]').click();

      // Simulate remote content change
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('content-update', {
          detail: {
            operation: {
              type: 'insert',
              position: 0,
              text: 'REMOTE EDIT: ',
            },
            userId: 'user-2'
          }
        }));
      });

      // Should show the remote edit
      cy.get('[data-testid="document-content-editor"]')
        .should('contain', 'REMOTE EDIT: Shared content');
    });
  });

  describe('Document Comments', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Document with Comments',
        content: 'This document has comments.',
        status: 'REVIEW'
      }).as('commentDocument');
    });

    it('should add comments to document', function() {
      cy.visit(`/documents/${this.commentDocument.id}`);

      // Open comments panel
      cy.get('[data-testid="comments-button"]').click();
      cy.get('[data-testid="comments-panel"]').should('be.visible');

      // Add a comment
      cy.get('[data-testid="comment-input"]').type('This is a great document!');
      cy.get('[data-testid="add-comment-button"]').click();

      cy.wait('@createComment');

      // Should show the comment
      cy.get('[data-testid="comment-list"]').within(() => {
        cy.get('[data-testid^="comment-"]').should('have.length', 1);
        cy.get('[data-testid^="comment-"]').first().within(() => {
          cy.get('[data-testid="comment-text"]').should('contain', 'This is a great document!');
          cy.get('[data-testid="comment-author"]').should('be.visible');
          cy.get('[data-testid="comment-timestamp"]').should('be.visible');
        });
      });
    });

    it('should reply to comments', function() {
      cy.visit(`/documents/${this.commentDocument.id}`);

      cy.get('[data-testid="comments-button"]').click();

      // Assume there's already a comment
      cy.get('[data-testid="comment-1"]').within(() => {
        cy.get('[data-testid="reply-button"]').click();
      });

      cy.get('[data-testid="reply-input"]').type('I agree with this comment.');
      cy.get('[data-testid="submit-reply-button"]').click();

      // Should show the reply
      cy.get('[data-testid="comment-1-replies"]').within(() => {
        cy.get('[data-testid^="reply-"]').should('have.length', 1);
        cy.get('[data-testid="reply-text"]').should('contain', 'I agree with this comment.');
      });
    });

    it('should resolve comments', function() {
      cy.visit(`/documents/${this.commentDocument.id}`);

      cy.get('[data-testid="comments-button"]').click();

      cy.get('[data-testid="comment-1"]').within(() => {
        cy.get('[data-testid="resolve-button"]').click();
      });

      // Should mark comment as resolved
      cy.get('[data-testid="comment-1"]')
        .should('have.class', 'resolved')
        .within(() => {
          cy.get('[data-testid="resolved-badge"]').should('be.visible');
        });
    });
  });

  describe('Document Sharing', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Shareable Document',
        content: 'This document can be shared.',
        status: 'PUBLISHED'
      }).as('shareDocument');
    });

    it('should generate shareable link', function() {
      cy.visit(`/documents/${this.shareDocument.id}`);

      cy.get('[data-testid="share-button"]').click();
      cy.get('[data-testid="share-modal"]').should('be.visible');

      // Generate public link
      cy.get('[data-testid="generate-public-link"]').click();

      cy.wait('@createShareLink');

      // Should display the shareable link
      cy.get('[data-testid="share-link"]')
        .should('be.visible')
        .and('contain', '/shared/');

      // Should have copy button
      cy.get('[data-testid="copy-link-button"]').click();

      // Should show success message
      cy.get('[data-testid="copy-success"]')
        .should('be.visible')
        .and('contain', 'Link copied to clipboard');
    });

    it('should set sharing permissions', function() {
      cy.visit(`/documents/${this.shareDocument.id}`);

      cy.get('[data-testid="share-button"]').click();

      // Set view-only permission
      cy.get('[data-testid="permission-select"]').select('view');
      cy.get('[data-testid="generate-public-link"]').click();

      // Set expiration date
      cy.get('[data-testid="expiration-date-input"]')
        .type('2024-12-31');

      cy.get('[data-testid="update-share-settings"]').click();

      cy.wait('@updateShareSettings');

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Share settings updated');
    });

    it('should revoke sharing access', function() {
      cy.visit(`/documents/${this.shareDocument.id}`);

      cy.get('[data-testid="share-button"]').click();

      // Assume link already exists
      cy.get('[data-testid="revoke-access-button"]').click();

      // Confirm revocation
      cy.get('[data-testid="confirm-revoke-dialog"]').within(() => {
        cy.get('[data-testid="confirm-button"]').click();
      });

      cy.wait('@revokeShareAccess');

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Sharing access revoked');
    });
  });

  describe('Document Deletion', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Document to Delete',
        content: 'This document will be deleted.',
        status: 'DRAFT'
      }).as('deleteDocument');
    });

    it('should delete document with confirmation', function() {
      cy.visit(`/documents/${this.deleteDocument.id}`);

      cy.get('[data-testid="document-menu"]').click();
      cy.get('[data-testid="delete-document-button"]').click();

      // Should show confirmation dialog
      cy.get('[data-testid="delete-confirmation-dialog"]').should('be.visible');

      // Type document title to confirm
      cy.get('[data-testid="confirm-title-input"]').type('Document to Delete');

      cy.get('[data-testid="confirm-delete-button"]').click();

      cy.wait('@deleteDocument');

      // Should redirect to documents list
      cy.url().should('include', '/documents');

      // Should show success message
      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Document deleted successfully');
    });

    it('should move document to trash instead of permanent deletion', function() {
      cy.visit(`/documents/${this.deleteDocument.id}`);

      cy.get('[data-testid="document-menu"]').click();
      cy.get('[data-testid="move-to-trash-button"]').click();

      cy.wait('@moveToTrash');

      // Should still be accessible in trash
      cy.visit('/documents/trash');

      cy.get('[data-testid="trash-list"]').should('contain', 'Document to Delete');
    });

    it('should restore document from trash', () => {
      cy.visit('/documents/trash');

      cy.get('[data-testid="trash-item-1"]').within(() => {
        cy.get('[data-testid="restore-button"]').click();
      });

      cy.wait('@restoreDocument');

      // Should return to documents list
      cy.visit('/documents');
      cy.get('[data-testid="document-list"]')
        .should('contain', 'Restored Document');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.createDocument({
        title: 'Accessible Document',
        content: 'This document follows accessibility guidelines.',
        status: 'PUBLISHED'
      }).as('accessibleDocument');
    });

    it('should be fully accessible', function() {
      cy.visit(`/documents/${this.accessibleDocument.id}`);

      // Check basic accessibility
      cy.checkA11y();

      // Check document editor accessibility
      cy.get('[data-testid="edit-button"]').click();
      cy.checkA11y('[data-testid="document-editor"]');
    });

    it('should support keyboard navigation in document list', () => {
      cy.visit('/documents');

      // Navigate through document list with keyboard
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'create-document-button');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'search-input');

      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'status-filter');
    });
  });

  describe('Mobile Document Management', () => {
    beforeEach(() => {
      cy.setMobileViewport();
      cy.createDocument({
        title: 'Mobile Document',
        content: 'This document is viewed on mobile.',
        status: 'PUBLISHED'
      }).as('mobileDocument');
    });

    it('should work on mobile devices', function() {
      cy.visit(`/documents/${this.mobileDocument.id}`);

      // Should show mobile-optimized layout
      cy.get('[data-testid="mobile-document-view"]').should('be.visible');

      // Touch interactions should work
      cy.get('[data-testid="mobile-menu-button"]').click();
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
    });

    it('should support mobile editing', function() {
      cy.visit(`/documents/${this.mobileDocument.id}/edit`);

      // Should show mobile editor
      cy.get('[data-testid="mobile-editor"]').should('be.visible');

      // Should have mobile-friendly toolbar
      cy.get('[data-testid="mobile-toolbar"]').should('be.visible');

      // Test touch editing
      cy.get('[data-testid="document-content-editor"]')
        .click()
        .type(' Additional mobile content.');

      cy.get('[data-testid="mobile-save-button"]').click();

      cy.wait('@updateDocument');
    });
  });
});
