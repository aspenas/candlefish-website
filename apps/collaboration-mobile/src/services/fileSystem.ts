/**
 * File System Integration Service
 * Handles native file operations, document sharing, and file management
 */

import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import FileAccess from 'react-native-file-access';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { Document, DocumentType } from '@/types';
import Config from '@/constants/config';

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  uri: string;
  lastModified: number;
}

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'html' | 'md';
  includeComments?: boolean;
  includeVersionHistory?: boolean;
  includeMetadata?: boolean;
}

export interface ImportResult {
  success: boolean;
  document?: Partial<Document>;
  error?: string;
}

class FileSystemService {
  private readonly documentsPath: string;
  private readonly cachePath: string;
  private readonly tempPath: string;

  constructor() {
    this.documentsPath = RNFS.DocumentDirectoryPath + '/documents';
    this.cachePath = RNFS.CachesDirectoryPath + '/collaboration';
    this.tempPath = RNFS.TemporaryDirectoryPath + '/collaboration';
    
    this.initializeDirectories();
  }

  /**
   * Initialize required directories
   */
  private async initializeDirectories(): Promise<void> {
    try {
      const directories = [this.documentsPath, this.cachePath, this.tempPath];
      
      for (const dir of directories) {
        const exists = await RNFS.exists(dir);
        if (!exists) {
          await RNFS.mkdir(dir);
        }
      }
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  /**
   * Request storage permissions (Android)
   */
  private async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') return true;

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);

      return (
        granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Pick document from device
   */
  public async pickDocument(): Promise<FileMetadata | null> {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.plainText,
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
          'text/markdown',
          'application/rtf',
        ],
        copyTo: 'cachesDirectory',
      });

      if (result.fileCopyUri || result.uri) {
        const uri = result.fileCopyUri || result.uri;
        const stats = await RNFS.stat(uri);
        
        return {
          name: result.name || 'Unknown',
          size: result.size || stats.size,
          type: result.type || 'application/octet-stream',
          uri,
          lastModified: stats.mtime?.getTime() || Date.now(),
        };
      }

      return null;
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return null; // User cancelled
      }
      console.error('Document picker error:', error);
      throw error;
    }
  }

  /**
   * Import document from file
   */
  public async importDocument(file: FileMetadata): Promise<ImportResult> {
    try {
      const content = await RNFS.readFile(file.uri, 'utf8');
      const documentType = this.detectDocumentType(file);
      
      const document: Partial<Document> = {
        name: this.extractFileName(file.name),
        type: documentType,
        content: {
          format: this.getContentFormat(documentType),
          data: content,
          blocks: this.parseContentBlocks(content, documentType),
          length: content.length,
          plainText: this.extractPlainText(content, documentType),
          html: this.convertToHtml(content, documentType),
          markdown: this.convertToMarkdown(content, documentType),
          attachments: [],
        },
        status: 'DRAFT' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Import document error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      };
    }
  }

  /**
   * Export document to file
   */
  public async exportDocument(
    document: Document,
    options: ExportOptions = { format: 'txt' }
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestStoragePermissions();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const content = this.formatDocumentForExport(document, options);
      const fileName = this.generateFileName(document.name, options.format);
      const filePath = `${this.tempPath}/${fileName}`;

      await RNFS.writeFile(filePath, content, 'utf8');

      return filePath;
    } catch (error) {
      console.error('Export document error:', error);
      return null;
    }
  }

  /**
   * Share document
   */
  public async shareDocument(
    document: Document,
    options: ExportOptions = { format: 'txt' }
  ): Promise<boolean> {
    try {
      const filePath = await this.exportDocument(document, options);
      if (!filePath) {
        throw new Error('Export failed');
      }

      const shareOptions = {
        title: `Share ${document.name}`,
        message: `Sharing document: ${document.name}`,
        url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
        type: this.getMimeType(options.format),
        filename: this.generateFileName(document.name, options.format),
      };

      await Share.open(shareOptions);
      
      // Clean up temporary file after sharing
      setTimeout(async () => {
        try {
          await RNFS.unlink(filePath);
        } catch (error) {
          console.error('Failed to clean up temp file:', error);
        }
      }, 5000);

      return true;
    } catch (error) {
      console.error('Share document error:', error);
      return false;
    }
  }

  /**
   * Save document to device storage
   */
  public async saveToDevice(
    document: Document,
    options: ExportOptions = { format: 'txt' }
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestStoragePermissions();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }

      const content = this.formatDocumentForExport(document, options);
      const fileName = this.generateFileName(document.name, options.format);
      
      let savePath: string;
      if (Platform.OS === 'ios') {
        savePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      } else {
        savePath = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
      }

      await RNFS.writeFile(savePath, content, 'utf8');

      Alert.alert(
        'Document Saved',
        `Document saved to ${Platform.OS === 'ios' ? 'Files app' : 'Downloads folder'}`,
        [{ text: 'OK' }]
      );

      return true;
    } catch (error) {
      console.error('Save to device error:', error);
      Alert.alert('Error', 'Failed to save document to device');
      return false;
    }
  }

  /**
   * Get local document cache
   */
  public async getCachedDocument(documentId: string): Promise<string | null> {
    try {
      const filePath = `${this.cachePath}/${documentId}.json`;
      const exists = await RNFS.exists(filePath);
      
      if (exists) {
        return await RNFS.readFile(filePath, 'utf8');
      }
      
      return null;
    } catch (error) {
      console.error('Get cached document error:', error);
      return null;
    }
  }

  /**
   * Cache document locally
   */
  public async cacheDocument(document: Document): Promise<boolean> {
    try {
      const filePath = `${this.cachePath}/${document.id}.json`;
      const documentData = {
        ...document,
        cachedAt: Date.now(),
      };
      
      await RNFS.writeFile(filePath, JSON.stringify(documentData), 'utf8');
      return true;
    } catch (error) {
      console.error('Cache document error:', error);
      return false;
    }
  }

  /**
   * Clear document cache
   */
  public async clearCache(): Promise<boolean> {
    try {
      const files = await RNFS.readdir(this.cachePath);
      
      for (const file of files) {
        const filePath = `${this.cachePath}/${file}`;
        await RNFS.unlink(filePath);
      }
      
      return true;
    } catch (error) {
      console.error('Clear cache error:', error);
      return false;
    }
  }

  /**
   * Get cache size
   */
  public async getCacheSize(): Promise<number> {
    try {
      const files = await RNFS.readdir(this.cachePath);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = `${this.cachePath}/${file}`;
        const stats = await RNFS.stat(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Get cache size error:', error);
      return 0;
    }
  }

  /**
   * Detect document type from file
   */
  private detectDocumentType(file: FileMetadata): DocumentType {
    const extension = this.getFileExtension(file.name).toLowerCase();
    
    switch (extension) {
      case 'md':
      case 'markdown':
        return DocumentType.MARKDOWN;
      case 'html':
      case 'htm':
      case 'rtf':
        return DocumentType.RICH_TEXT;
      case 'txt':
      case 'text':
      default:
        return DocumentType.TEXT;
    }
  }

  /**
   * Get content format for document type
   */
  private getContentFormat(type: DocumentType): string {
    switch (type) {
      case DocumentType.MARKDOWN:
        return 'markdown';
      case DocumentType.RICH_TEXT:
        return 'html';
      case DocumentType.TEXT:
      default:
        return 'plaintext';
    }
  }

  /**
   * Parse content into blocks
   */
  private parseContentBlocks(content: string, type: DocumentType): any[] {
    // This is a simplified implementation
    // In a real app, you'd use proper parsers for each format
    
    const lines = content.split('\n');
    const blocks = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      let blockType = 'paragraph';
      let processedContent = line;
      
      if (type === DocumentType.MARKDOWN) {
        if (line.startsWith('#')) {
          blockType = 'heading';
          const level = line.match(/^#+/)?.[0].length || 1;
          processedContent = line.replace(/^#+\s*/, '');
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          blockType = 'list';
          processedContent = line.replace(/^[-*]\s*/, '');
        } else if (line.startsWith('> ')) {
          blockType = 'quote';
          processedContent = line.replace(/^>\s*/, '');
        }
      }
      
      blocks.push({
        id: `block_${i}`,
        type: blockType,
        content: processedContent,
        position: {
          index: i,
          offset: 0,
          length: processedContent.length,
          depth: 0,
        },
        styles: {},
        attributes: blockType === 'heading' ? { level: 1 } : {},
        authorId: 'imported',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    return blocks;
  }

  /**
   * Extract plain text from content
   */
  private extractPlainText(content: string, type: DocumentType): string {
    switch (type) {
      case DocumentType.MARKDOWN:
        return content
          .replace(/^#+\s*/gm, '') // Remove headers
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
          .replace(/^>\s*/gm, '') // Remove quotes
          .replace(/^[-*]\s*/gm, ''); // Remove lists
      
      case DocumentType.RICH_TEXT:
        return content.replace(/<[^>]*>/g, ''); // Strip HTML tags
      
      case DocumentType.TEXT:
      default:
        return content;
    }
  }

  /**
   * Convert content to HTML
   */
  private convertToHtml(content: string, type: DocumentType): string {
    if (type === DocumentType.RICH_TEXT) {
      return content; // Already HTML
    }
    
    // Simple conversion - in a real app, use proper markdown parser
    return content
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '')
      .join('\n');
  }

  /**
   * Convert content to Markdown
   */
  private convertToMarkdown(content: string, type: DocumentType): string {
    if (type === DocumentType.MARKDOWN) {
      return content; // Already Markdown
    }
    
    if (type === DocumentType.RICH_TEXT) {
      // Simple HTML to Markdown conversion
      return content
        .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, level, text) => '#'.repeat(parseInt(level)) + ' ' + text)
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<[^>]*>/g, ''); // Remove remaining tags
    }
    
    return content; // Plain text as-is
  }

  /**
   * Format document for export
   */
  private formatDocumentForExport(document: Document, options: ExportOptions): string {
    let content = '';
    
    // Add document metadata if requested
    if (options.includeMetadata) {
      content += `Title: ${document.name}\n`;
      content += `Created: ${new Date(document.createdAt).toLocaleDateString()}\n`;
      content += `Last Modified: ${new Date(document.updatedAt).toLocaleDateString()}\n`;
      content += `Author: ${document.owner.name}\n\n`;
      content += '---\n\n';
    }
    
    // Add main content based on format
    switch (options.format) {
      case 'html':
        content += document.content?.html || this.convertToHtml(document.content?.plainText || '', document.type);
        break;
      case 'md':
        content += document.content?.markdown || this.convertToMarkdown(document.content?.plainText || '', document.type);
        break;
      case 'txt':
      default:
        content += document.content?.plainText || '';
        break;
    }
    
    // Add comments if requested
    if (options.includeComments && document.metrics?.totalComments) {
      content += '\n\n---\n\n';
      content += 'Comments:\n\n';
      // This would be populated with actual comments in a real implementation
      content += '(Comments would be included here)\n';
    }
    
    return content;
  }

  /**
   * Generate filename for export
   */
  private generateFileName(documentName: string, format: string): string {
    const sanitizedName = documentName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedName}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'html':
        return 'text/html';
      case 'md':
        return 'text/markdown';
      case 'txt':
      default:
        return 'text/plain';
    }
  }

  /**
   * Extract file name without extension
   */
  private extractFileName(fullName: string): string {
    const lastDotIndex = fullName.lastIndexOf('.');
    return lastDotIndex > 0 ? fullName.substring(0, lastDotIndex) : fullName;
  }

  /**
   * Get file extension
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }
}

// Export singleton instance
export const fileSystemService = new FileSystemService();
export default fileSystemService;