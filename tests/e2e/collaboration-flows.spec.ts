import { test, expect, Page, BrowserContext } from '@playwright/test';
import { DocumentPage } from './page-objects/DocumentPage';
import { CollaborationPage } from './page-objects/CollaborationPage';
import { TestDataManager } from './helpers/TestDataManager';
import { WebSocketHelper } from './helpers/WebSocketHelper';

// Test configuration
test.describe.configure({ mode: 'parallel' });

test.describe('Real-time Collaboration Flows', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let documentPage1: DocumentPage;
  let documentPage2: DocumentPage;
  let collaborationPage1: CollaborationPage;
  let collaborationPage2: CollaborationPage;
  let testDataManager: TestDataManager;
  let wsHelper: WebSocketHelper;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for each user to simulate real collaboration
    context1 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: 'tests/e2e/auth-states/user1.json'
    });
    
    context2 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: 'tests/e2e/auth-states/user2.json'
    });

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    documentPage1 = new DocumentPage(page1);
    documentPage2 = new DocumentPage(page2);
    collaborationPage1 = new CollaborationPage(page1);
    collaborationPage2 = new CollaborationPage(page2);

    testDataManager = new TestDataManager();
    wsHelper = new WebSocketHelper();
  });

  test.beforeEach(async () => {
    // Create a fresh test document for each test
    const testDocument = await testDataManager.createDocument({
      title: 'Real-time Collaboration Test',
      content: 'Initial document content for collaboration testing.',
      type: 'MARKDOWN'
    });

    // Both users navigate to the same document
    await Promise.all([
      documentPage1.goto(testDocument.id),
      documentPage2.goto(testDocument.id)
    ]);

    // Wait for both pages to load
    await Promise.all([
      documentPage1.waitForLoad(),
      documentPage2.waitForLoad()
    ]);
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test.afterAll(async () => {
    await context1.close();
    await context2.close();
  });

  test('should show real-time cursor positions', async () => {
    // User 1 clicks in the editor to position cursor
    await documentPage1.clickInEditor(10);
    
    // User 2 should see User 1's cursor
    await expect(collaborationPage2.getUserCursor('user1')).toBeVisible();
    
    // Verify cursor position is approximately correct
    const cursorPosition = await collaborationPage2.getCursorPosition('user1');
    expect(cursorPosition.x).toBeGreaterThan(0);
    expect(cursorPosition.y).toBeGreaterThan(0);
    
    // User 2 positions their cursor elsewhere
    await documentPage2.clickInEditor(25);
    
    // User 1 should see User 2's cursor
    await expect(collaborationPage1.getUserCursor('user2')).toBeVisible();
    
    // Cursors should be at different positions
    const cursor1Pos = await collaborationPage1.getCursorPosition('user2');
    const cursor2Pos = await collaborationPage2.getCursorPosition('user1');
    expect(Math.abs(cursor1Pos.x - cursor2Pos.x)).toBeGreaterThan(10);
  });

  test('should synchronize text insertions in real-time', async () => {
    // User 1 types text
    await documentPage1.clickInEditor(0);
    await documentPage1.typeText('Hello from User 1! ');
    
    // User 2 should see the text appear in real-time
    await expect(documentPage2.getEditorContent()).toContain('Hello from User 1!');
    
    // User 2 types text at a different position
    await documentPage2.clickInEditor(50);
    await documentPage2.typeText('Hello from User 2!');
    
    // User 1 should see User 2's text
    await expect(documentPage1.getEditorContent()).toContain('Hello from User 2!');
    
    // Final content should contain both contributions
    const finalContent1 = await documentPage1.getEditorContent();
    const finalContent2 = await documentPage2.getEditorContent();
    
    expect(finalContent1).toBe(finalContent2);
    expect(finalContent1).toContain('Hello from User 1!');
    expect(finalContent1).toContain('Hello from User 2!');
  });

  test('should handle concurrent text insertions at same position', async () => {
    // Both users position cursors at the same location
    await Promise.all([
      documentPage1.clickInEditor(20),
      documentPage2.clickInEditor(20)
    ]);
    
    // Both users type simultaneously
    await Promise.all([
      documentPage1.typeText('A'),
      documentPage2.typeText('B')
    ]);
    
    // Wait for operations to propagate
    await page1.waitForTimeout(500);
    
    // Content should be consistent between both users
    const content1 = await documentPage1.getEditorContent();
    const content2 = await documentPage2.getEditorContent();
    
    expect(content1).toBe(content2);
    expect(content1).toMatch(/[AB][AB]/); // Should contain both A and B
  });

  test('should synchronize text deletions', async () => {
    // User 1 selects and deletes text
    await documentPage1.selectText(0, 10);
    await documentPage1.deleteSelectedText();
    
    // User 2 should see the deletion
    const content2 = await documentPage2.getEditorContent();
    expect(content2.length).toBeLessThan(50); // Original content was longer
    
    // User 2 deletes different text
    await documentPage2.selectText(5, 15);
    await documentPage2.deleteSelectedText();
    
    // User 1 should see User 2's deletion
    const finalContent1 = await documentPage1.getEditorContent();
    const finalContent2 = await documentPage2.getEditorContent();
    
    expect(finalContent1).toBe(finalContent2);
  });

  test('should handle complex editing operations', async () => {
    const operations = [
      { user: 1, action: 'type', position: 0, text: 'TITLE: ' },
      { user: 2, action: 'type', position: 50, text: '\n\nNew paragraph' },
      { user: 1, action: 'select', start: 0, end: 6 },
      { user: 1, action: 'format', style: 'bold' },
      { user: 2, action: 'type', position: 30, text: ' (edited by user 2)' },
      { user: 1, action: 'type', position: 100, text: '\n- List item 1\n- List item 2' },
    ];

    // Execute operations sequentially
    for (const op of operations) {
      const page = op.user === 1 ? documentPage1 : documentPage2;
      
      switch (op.action) {
        case 'type':
          await page.clickInEditor(op.position);
          await page.typeText(op.text);
          break;
        case 'select':
          await page.selectText(op.start, op.end);
          break;
        case 'format':
          await page.applyFormatting(op.style);
          break;
      }
      
      // Small delay between operations
      await page1.waitForTimeout(200);
    }
    
    // Wait for all operations to propagate
    await page1.waitForTimeout(1000);
    
    // Both users should see the same final result
    const content1 = await documentPage1.getEditorContent();
    const content2 = await documentPage2.getEditorContent();
    
    expect(content1).toBe(content2);
    expect(content1).toContain('TITLE:');
    expect(content1).toContain('New paragraph');
    expect(content1).toContain('(edited by user 2)');
    expect(content1).toContain('List item 1');
  });

  test('should show presence indicators in sidebar', async () => {
    // Both users should see each other in the collaboration sidebar
    await expect(collaborationPage1.getPresenceIndicator('user2')).toBeVisible();
    await expect(collaborationPage2.getPresenceIndicator('user1')).toBeVisible();
    
    // Check presence details
    const user2Presence = await collaborationPage1.getPresenceDetails('user2');
    expect(user2Presence.status).toBe('active');
    expect(user2Presence.name).toContain('User 2');
    
    // User 1 goes idle (no activity for a period)
    await page1.waitForTimeout(30000); // 30 seconds
    
    // User 2 should see User 1 as idle
    const user1Presence = await collaborationPage2.getPresenceDetails('user1');
    expect(user1Presence.status).toBe('idle');
  });

  test('should handle user disconnection and reconnection', async () => {
    // User 2 disconnects (simulate network issue)
    await page2.context().setOffline(true);
    
    // User 1 should see User 2 as disconnected
    await expect(collaborationPage1.getPresenceIndicator('user2')).toHaveClass(/offline/);
    
    // User 1 makes changes while User 2 is offline
    await documentPage1.typeText('Changed while offline: ');
    
    // User 2 reconnects
    await page2.context().setOffline(false);
    await page2.reload();
    await documentPage2.waitForLoad();
    
    // User 2 should see the changes made while offline
    await expect(documentPage2.getEditorContent()).toContain('Changed while offline:');
    
    // User 2 should appear online again to User 1
    await expect(collaborationPage1.getPresenceIndicator('user2')).not.toHaveClass(/offline/);
  });

  test('should display conflict resolution dialog', async () => {
    // Create a conflict scenario by having both users edit the same text
    await documentPage1.selectText(0, 10);
    await documentPage2.selectText(0, 10);
    
    // Simulate network interruption for one user
    await page1.context().setOffline(true);
    
    // Both users make conflicting changes
    await documentPage1.typeText('User 1 version');
    await documentPage2.typeText('User 2 version');
    
    // User 1 comes back online
    await page1.context().setOffline(false);
    
    // Should show conflict resolution dialog
    await expect(collaborationPage1.getConflictDialog()).toBeVisible();
    
    // User can choose resolution strategy
    await collaborationPage1.selectConflictResolution('keep-both');
    
    // Final document should contain both versions
    const finalContent = await documentPage1.getEditorContent();
    expect(finalContent).toContain('User 1 version');
    expect(finalContent).toContain('User 2 version');
  });

  test('should handle rapid successive operations', async () => {
    // User 1 rapidly types multiple characters
    const rapidText = 'RapidTyping';
    for (let i = 0; i < rapidText.length; i++) {
      await documentPage1.typeText(rapidText[i]);
      // Very short delay to simulate rapid typing
      await page1.waitForTimeout(50);
    }
    
    // User 2 should see all characters appear
    await expect(documentPage2.getEditorContent()).toContain(rapidText);
    
    // User 2 makes rapid changes at different positions
    for (let i = 0; i < 5; i++) {
      await documentPage2.clickInEditor(i * 10);
      await documentPage2.typeText(`${i}`);
      await page2.waitForTimeout(50);
    }
    
    // Final content should be consistent
    await page1.waitForTimeout(1000);
    const content1 = await documentPage1.getEditorContent();
    const content2 = await documentPage2.getEditorContent();
    
    expect(content1).toBe(content2);
  });

  test('should maintain version history during collaboration', async () => {
    // Open version history sidebar
    await collaborationPage1.openVersionHistory();
    
    // Check initial version
    const initialVersions = await collaborationPage1.getVersionCount();
    expect(initialVersions).toBe(1);
    
    // User 1 makes a significant change
    await documentPage1.selectAll();
    await documentPage1.typeText('Complete rewrite of the document');
    
    // Wait for version to be saved
    await page1.waitForTimeout(2000);
    
    // User 2 makes another change
    await documentPage2.typeText(' with additional content from User 2');
    
    // Wait for another version
    await page2.waitForTimeout(2000);
    
    // Check version count increased
    const finalVersions = await collaborationPage1.getVersionCount();
    expect(finalVersions).toBeGreaterThan(initialVersions);
    
    // Can restore previous version
    await collaborationPage1.restoreVersion(0); // Restore initial version
    await expect(documentPage1.getEditorContent()).toContain('Initial document content');
  });

  test('should handle large document collaboration', async () => {
    // Create a large document
    const largeContent = 'Large document content. '.repeat(1000);
    await documentPage1.selectAll();
    await documentPage1.typeText(largeContent);
    
    // User 2 should receive the content (may be chunked)
    await page2.waitForTimeout(5000); // Allow time for large content sync
    
    const receivedContent = await documentPage2.getEditorContent();
    expect(receivedContent.length).toBeGreaterThan(10000);
    
    // Both users can continue editing
    await documentPage1.clickInEditor(100);
    await documentPage1.typeText(' [User 1 addition] ');
    
    await documentPage2.clickInEditor(500);
    await documentPage2.typeText(' [User 2 addition] ');
    
    // Additions should propagate
    await page1.waitForTimeout(2000);
    
    const finalContent1 = await documentPage1.getEditorContent();
    const finalContent2 = await documentPage2.getEditorContent();
    
    expect(finalContent1).toBe(finalContent2);
    expect(finalContent1).toContain('[User 1 addition]');
    expect(finalContent1).toContain('[User 2 addition]');
  });

  test('should support real-time commenting', async () => {
    // User 1 selects text and adds a comment
    await documentPage1.selectText(10, 25);
    await documentPage1.addComment('This needs clarification');
    
    // User 2 should see the comment
    await expect(collaborationPage2.getComment()).toBeVisible();
    await expect(collaborationPage2.getComment()).toContainText('This needs clarification');
    
    // User 2 replies to the comment
    await collaborationPage2.replyToComment('I agree, let me clarify this section');
    
    // User 1 should see the reply
    await expect(collaborationPage1.getCommentReplies()).toContainText('let me clarify');
    
    // User 1 resolves the comment
    await collaborationPage1.resolveComment();
    
    // Comment should be marked as resolved for both users
    await expect(collaborationPage2.getComment()).toHaveClass(/resolved/);
  });

  test('should handle WebSocket reconnection gracefully', async () => {
    // Monitor WebSocket connections
    const wsConnections1 = wsHelper.monitorConnections(page1);
    const wsConnections2 = wsHelper.monitorConnections(page2);
    
    // Verify initial connections
    expect(wsConnections1.length).toBeGreaterThan(0);
    expect(wsConnections2.length).toBeGreaterThan(0);
    
    // Force WebSocket disconnection by blocking WebSocket requests
    await page1.route('ws://**', route => route.abort());
    
    // Should show connection lost indicator
    await expect(collaborationPage1.getConnectionStatus()).toContainText('Disconnected');
    
    // Re-enable WebSocket connections
    await page1.unroute('ws://**');
    
    // Should automatically reconnect
    await expect(collaborationPage1.getConnectionStatus()).toContainText('Connected');
    
    // Collaboration should resume working
    await documentPage1.typeText('After reconnection');
    await expect(documentPage2.getEditorContent()).toContain('After reconnection');
  });

  test('should maintain data integrity under stress', async () => {
    const stressOperations = [];
    
    // Generate many concurrent operations
    for (let i = 0; i < 50; i++) {
      stressOperations.push(
        documentPage1.typeText(`A${i} `),
        documentPage2.typeText(`B${i} `)
      );
    }
    
    // Execute all operations concurrently
    await Promise.all(stressOperations);
    
    // Wait for all operations to propagate
    await page1.waitForTimeout(3000);
    
    // Both documents should have identical content
    const content1 = await documentPage1.getEditorContent();
    const content2 = await documentPage2.getEditorContent();
    
    expect(content1).toBe(content2);
    
    // Content should contain elements from both users
    expect(content1).toContain('A0');
    expect(content1).toContain('B0');
    expect(content1).toContain('A49');
    expect(content1).toContain('B49');
  });
});

test.describe('Document Sharing and Permissions', () => {
  let documentPage: DocumentPage;
  let collaborationPage: CollaborationPage;
  let testDataManager: TestDataManager;

  test.beforeEach(async ({ page }) => {
    documentPage = new DocumentPage(page);
    collaborationPage = new CollaborationPage(page);
    testDataManager = new TestDataManager();

    // Create test document as owner
    const document = await testDataManager.createDocument({
      title: 'Sharing Test Document',
      content: 'This document will be shared with others.',
      permissions: { isPrivate: false }
    });

    await documentPage.goto(document.id);
    await documentPage.waitForLoad();
  });

  test.afterEach(async () => {
    await testDataManager.cleanup();
  });

  test('should share document with specific users', async () => {
    // Open sharing dialog
    await collaborationPage.openSharingDialog();
    
    // Add user with editor permissions
    await collaborationPage.addCollaborator('user2@example.com', 'editor');
    
    // Add user with viewer permissions
    await collaborationPage.addCollaborator('user3@example.com', 'viewer');
    
    // Save sharing settings
    await collaborationPage.saveSharing();
    
    // Verify collaborators are listed
    const collaborators = await collaborationPage.getCollaborators();
    expect(collaborators).toHaveLength(2);
    expect(collaborators[0].email).toBe('user2@example.com');
    expect(collaborators[0].role).toBe('editor');
    expect(collaborators[1].role).toBe('viewer');
  });

  test('should enforce editor permissions correctly', async () => {
    // TODO: This would require setting up a viewer context and testing read-only access
    // For now, we'll test the UI elements
    
    await collaborationPage.openSharingDialog();
    await collaborationPage.addCollaborator('viewer@example.com', 'viewer');
    await collaborationPage.saveSharing();
    
    // Verify permission levels are displayed
    const viewerPermissions = await collaborationPage.getCollaboratorPermissions('viewer@example.com');
    expect(viewerPermissions.canEdit).toBe(false);
    expect(viewerPermissions.canComment).toBe(true);
    expect(viewerPermissions.canView).toBe(true);
  });

  test('should generate shareable links', async () => {
    await collaborationPage.openSharingDialog();
    
    // Generate public link
    await collaborationPage.enablePublicLink();
    const publicLink = await collaborationPage.getPublicLink();
    
    expect(publicLink).toContain('share/');
    expect(publicLink).toMatch(/^https?:\/\//);
    
    // Set link expiration
    await collaborationPage.setLinkExpiration('7-days');
    
    // Copy link to clipboard
    await collaborationPage.copyLinkToClipboard();
    
    // Verify link was copied (would need to check clipboard in real test)
    const copiedText = await collaborationPage.page.evaluate(() => 
      navigator.clipboard.readText()
    );
    expect(copiedText).toBe(publicLink);
  });
});