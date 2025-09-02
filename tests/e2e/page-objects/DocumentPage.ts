import { Page, Locator, expect } from '@playwright/test';

export class DocumentPage {
  readonly page: Page;
  readonly editor: Locator;
  readonly titleInput: Locator;
  readonly saveButton: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.locator('[data-testid="collaborative-editor"]');
    this.titleInput = page.locator('[data-testid="document-title-input"]');
    this.saveButton = page.locator('[data-testid="save-button"]');
    this.loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto(documentId: string) {
    await this.page.goto(`/documents/${documentId}`);
  }

  async waitForLoad() {
    // Wait for loading indicator to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    
    // Wait for editor to be visible and ready
    await this.editor.waitFor({ state: 'visible' });
    
    // Wait for any initial WebSocket connections to establish
    await this.page.waitForTimeout(1000);
  }

  async getTitle(): Promise<string> {
    return await this.titleInput.inputValue();
  }

  async setTitle(title: string) {
    await this.titleInput.clear();
    await this.titleInput.fill(title);
  }

  async clickInEditor(position: number = 0) {
    // Click in the editor at a specific character position
    const editorElement = await this.editor.elementHandle();
    if (!editorElement) throw new Error('Editor element not found');

    // Get the text content and calculate click position
    const textContent = await this.getEditorContent();
    const lines = textContent.split('\n');
    let currentPosition = 0;
    let targetLine = 0;
    let targetColumn = 0;

    for (let i = 0; i < lines.length; i++) {
      if (currentPosition + lines[i].length >= position) {
        targetLine = i;
        targetColumn = position - currentPosition;
        break;
      }
      currentPosition += lines[i].length + 1; // +1 for newline
    }

    // Click at the calculated position (simplified - in real implementation would need more precise positioning)
    const editorBox = await this.editor.boundingBox();
    if (!editorBox) throw new Error('Editor bounding box not found');

    const x = editorBox.x + 10 + (targetColumn * 8); // Approximate character width
    const y = editorBox.y + 10 + (targetLine * 20); // Approximate line height

    await this.page.mouse.click(x, y);
  }

  async typeText(text: string) {
    await this.editor.focus();
    await this.page.keyboard.type(text, { delay: 50 });
  }

  async selectText(start: number, end: number) {
    // Select text between start and end positions
    await this.clickInEditor(start);
    
    // Hold shift and click at end position
    await this.page.keyboard.down('Shift');
    await this.clickInEditor(end);
    await this.page.keyboard.up('Shift');
  }

  async selectAll() {
    await this.editor.focus();
    await this.page.keyboard.press('Control+a');
  }

  async deleteSelectedText() {
    await this.page.keyboard.press('Delete');
  }

  async getEditorContent(): Promise<string> {
    // Get the plain text content from the editor
    return await this.editor.innerText();
  }

  async getEditorHTML(): Promise<string> {
    // Get the HTML content from the editor
    return await this.editor.innerHTML();
  }

  async applyFormatting(style: 'bold' | 'italic' | 'underline') {
    const shortcuts = {
      bold: 'Control+b',
      italic: 'Control+i',
      underline: 'Control+u'
    };

    await this.page.keyboard.press(shortcuts[style]);
  }

  async insertLink(url: string, text?: string) {
    await this.page.keyboard.press('Control+k');
    
    // Wait for link dialog
    const linkDialog = this.page.locator('[data-testid="link-dialog"]');
    await linkDialog.waitFor({ state: 'visible' });
    
    // Fill URL
    await this.page.locator('[data-testid="link-url-input"]').fill(url);
    
    if (text) {
      await this.page.locator('[data-testid="link-text-input"]').fill(text);
    }
    
    // Confirm link insertion
    await this.page.locator('[data-testid="insert-link-button"]').click();
  }

  async insertImage(src: string, alt?: string) {
    await this.page.keyboard.press('Control+Shift+i');
    
    const imageDialog = this.page.locator('[data-testid="image-dialog"]');
    await imageDialog.waitFor({ state: 'visible' });
    
    await this.page.locator('[data-testid="image-src-input"]').fill(src);
    
    if (alt) {
      await this.page.locator('[data-testid="image-alt-input"]').fill(alt);
    }
    
    await this.page.locator('[data-testid="insert-image-button"]').click();
  }

  async createTable(rows: number, cols: number) {
    await this.page.keyboard.press('Control+Shift+t');
    
    const tableDialog = this.page.locator('[data-testid="table-dialog"]');
    await tableDialog.waitFor({ state: 'visible' });
    
    await this.page.locator('[data-testid="table-rows-input"]').fill(rows.toString());
    await this.page.locator('[data-testid="table-cols-input"]').fill(cols.toString());
    
    await this.page.locator('[data-testid="create-table-button"]').click();
  }

  async addComment(text: string) {
    // Right-click to open context menu
    await this.editor.click({ button: 'right' });
    
    // Click add comment
    await this.page.locator('[data-testid="add-comment-menu-item"]').click();
    
    // Fill comment text
    const commentInput = this.page.locator('[data-testid="comment-input"]');
    await commentInput.waitFor({ state: 'visible' });
    await commentInput.fill(text);
    
    // Submit comment
    await this.page.locator('[data-testid="submit-comment-button"]').click();
  }

  async save() {
    await this.saveButton.click();
    
    // Wait for save confirmation
    await this.page.waitForSelector('[data-testid="save-success"]', { timeout: 5000 });
  }

  async undo() {
    await this.page.keyboard.press('Control+z');
  }

  async redo() {
    await this.page.keyboard.press('Control+y');
  }

  async copy() {
    await this.page.keyboard.press('Control+c');
  }

  async paste() {
    await this.page.keyboard.press('Control+v');
  }

  async cut() {
    await this.page.keyboard.press('Control+x');
  }

  async find(searchText: string) {
    await this.page.keyboard.press('Control+f');
    
    const searchInput = this.page.locator('[data-testid="search-input"]');
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(searchText);
  }

  async replace(searchText: string, replaceText: string) {
    await this.page.keyboard.press('Control+h');
    
    const searchInput = this.page.locator('[data-testid="search-input"]');
    const replaceInput = this.page.locator('[data-testid="replace-input"]');
    
    await searchInput.waitFor({ state: 'visible' });
    await searchInput.fill(searchText);
    await replaceInput.fill(replaceText);
    
    // Replace all
    await this.page.locator('[data-testid="replace-all-button"]').click();
  }

  async getWordCount(): Promise<number> {
    const wordCountElement = this.page.locator('[data-testid="word-count"]');
    const text = await wordCountElement.textContent();
    return parseInt(text?.match(/\d+/)?.[0] || '0');
  }

  async getCharacterCount(): Promise<number> {
    const text = await this.getEditorContent();
    return text.length;
  }

  async toggleFullscreen() {
    await this.page.keyboard.press('F11');
  }

  async exportDocument(format: 'pdf' | 'docx' | 'markdown' | 'html') {
    // Open export menu
    await this.page.locator('[data-testid="export-button"]').click();
    
    // Select format
    await this.page.locator(`[data-testid="export-${format}"]`).click();
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('[data-testid="confirm-export"]').click();
    
    return await downloadPromise;
  }

  async printDocument() {
    const printPromise = this.page.waitForEvent('print');
    await this.page.keyboard.press('Control+p');
    return await printPromise;
  }

  async zoomIn() {
    await this.page.keyboard.press('Control+Plus');
  }

  async zoomOut() {
    await this.page.keyboard.press('Control+Minus');
  }

  async resetZoom() {
    await this.page.keyboard.press('Control+0');
  }

  async toggleSpellcheck() {
    await this.page.locator('[data-testid="spellcheck-toggle"]').click();
  }

  async getSpellingErrors(): Promise<string[]> {
    const errors = await this.page.locator('.spelling-error').allTextContents();
    return errors;
  }

  async acceptSpellingSuggestion(word: string) {
    // Right-click on the misspelled word
    const errorElement = this.page.locator('.spelling-error').filter({ hasText: word });
    await errorElement.click({ button: 'right' });
    
    // Click first suggestion
    await this.page.locator('[data-testid="spelling-suggestion"]').first().click();
  }

  async insertEmoji(emoji: string) {
    await this.page.keyboard.press('Control+Shift+e');
    
    const emojiPicker = this.page.locator('[data-testid="emoji-picker"]');
    await emojiPicker.waitFor({ state: 'visible' });
    
    // Search for emoji
    const searchInput = this.page.locator('[data-testid="emoji-search"]');
    await searchInput.fill(emoji);
    
    // Click first result
    await this.page.locator('[data-testid="emoji-option"]').first().click();
  }

  async insertCodeBlock(language?: string) {
    await this.page.keyboard.press('Control+Shift+c');
    
    if (language) {
      const languageSelect = this.page.locator('[data-testid="code-language-select"]');
      await languageSelect.selectOption(language);
    }
  }

  async insertMath(latex: string) {
    await this.page.keyboard.press('Control+Shift+m');
    
    const mathInput = this.page.locator('[data-testid="math-input"]');
    await mathInput.waitFor({ state: 'visible' });
    await mathInput.fill(latex);
    
    await this.page.locator('[data-testid="insert-math"]').click();
  }

  async toggleReadOnlyMode() {
    await this.page.locator('[data-testid="readonly-toggle"]').click();
  }

  async isReadOnly(): Promise<boolean> {
    return await this.editor.getAttribute('contenteditable') === 'false';
  }

  async waitForSave() {
    // Wait for the save indicator to appear and disappear
    await this.page.waitForSelector('[data-testid="saving-indicator"]', { timeout: 1000 });
    await this.page.waitForSelector('[data-testid="saving-indicator"]', { 
      state: 'hidden', 
      timeout: 10000 
    });
  }

  async hasUnsavedChanges(): Promise<boolean> {
    const indicator = this.page.locator('[data-testid="unsaved-changes-indicator"]');
    return await indicator.isVisible();
  }

  async getDocumentStatus(): Promise<'saved' | 'saving' | 'error' | 'offline'> {
    const statusElement = this.page.locator('[data-testid="document-status"]');
    const status = await statusElement.getAttribute('data-status');
    return status as 'saved' | 'saving' | 'error' | 'offline';
  }

  async waitForOnline() {
    await this.page.waitForSelector('[data-testid="online-indicator"]', { timeout: 30000 });
  }

  async waitForOffline() {
    await this.page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 30000 });
  }

  async getLastModified(): Promise<Date> {
    const element = this.page.locator('[data-testid="last-modified"]');
    const dateStr = await element.getAttribute('datetime');
    return new Date(dateStr || '');
  }

  async getDocumentVersion(): Promise<number> {
    const element = this.page.locator('[data-testid="document-version"]');
    const version = await element.textContent();
    return parseInt(version || '0');
  }

  // Accessibility methods
  async getAriaLabel(): Promise<string | null> {
    return await this.editor.getAttribute('aria-label');
  }

  async getAriaDescription(): Promise<string | null> {
    return await this.editor.getAttribute('aria-describedby');
  }

  async isAccessibilityCompliant(): Promise<boolean> {
    // Check for required accessibility attributes
    const hasAriaLabel = await this.getAriaLabel() !== null;
    const hasRole = await this.editor.getAttribute('role') !== null;
    const hasTabIndex = await this.editor.getAttribute('tabindex') !== null;
    
    return hasAriaLabel && hasRole && hasTabIndex;
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    renderTime: number;
    interactionDelay: number;
    memoryUsage: number;
  }> {
    return await this.page.evaluate(() => {
      const performance = window.performance;
      const memory = (window as any).performance?.memory;
      
      return {
        renderTime: performance.now(),
        interactionDelay: 0, // Would need to measure actual interaction
        memoryUsage: memory ? memory.usedJSHeapSize : 0
      };
    });
  }

  async measureTypingLatency(): Promise<number> {
    const startTime = Date.now();
    await this.typeText('test');
    const endTime = Date.now();
    
    return endTime - startTime;
  }
}