import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface FileInfo {
  uri: string;
  size: number;
  mimeType?: string;
  filename: string;
}

export interface CompressionOptions {
  quality?: number; // 0-1 for JPEG quality
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png';
}

export class FileSystemService {
  private static readonly DOCUMENT_DIR = `${FileSystem.documentDirectory}documents/`;
  private static readonly TEMP_DIR = `${FileSystem.cacheDirectory}temp/`;
  private static readonly THUMBNAILS_DIR = `${FileSystem.cacheDirectory}thumbnails/`;

  /**
   * Initialize directory structure
   */
  static async initialize(): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(this.DOCUMENT_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(this.TEMP_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(this.THUMBNAILS_DIR, { intermediates: true });
    } catch (error) {
      console.error('Error initializing filesystem:', error);
    }
  }

  /**
   * Save a file to permanent storage
   */
  static async saveFile(uri: string, filename?: string): Promise<string> {
    try {
      await this.initialize();
      
      const finalFilename = filename || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const destinationUri = `${this.DOCUMENT_DIR}${finalFilename}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri,
      });

      return destinationUri;
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error('Failed to save file');
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(uri: string): Promise<FileInfo> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      
      if (!info.exists) {
        throw new Error('File does not exist');
      }

      const filename = uri.split('/').pop() || 'unknown';
      
      return {
        uri,
        size: info.size || 0,
        filename,
        mimeType: this.getMimeTypeFromFilename(filename),
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw new Error('Failed to get file information');
    }
  }

  /**
   * Compress an image file
   */
  static async compressImage(uri: string, options: CompressionOptions = {}): Promise<string> {
    try {
      const {
        quality = 0.8,
        maxWidth = 1920,
        maxHeight = 1080,
        format = 'jpeg',
      } = options;

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Generate a thumbnail for an image
   */
  static async generateThumbnail(uri: string, size: number = 200): Promise<string> {
    try {
      await this.initialize();
      
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.MD5,
        uri
      );
      
      const thumbnailUri = `${this.THUMBNAILS_DIR}thumb_${hash}.jpg`;
      
      // Check if thumbnail already exists
      const thumbnailInfo = await FileSystem.getInfoAsync(thumbnailUri);
      if (thumbnailInfo.exists) {
        return thumbnailUri;
      }

      // Generate new thumbnail
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: size,
              height: size,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Save thumbnail
      await FileSystem.copyAsync({
        from: result.uri,
        to: thumbnailUri,
      });

      return thumbnailUri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Share a file
   */
  static async shareFile(uri: string, filename?: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const options: Sharing.SharingOptions = {};
      
      if (filename) {
        options.UTI = this.getUTIFromFilename(filename);
      }

      await Sharing.shareAsync(uri, options);
    } catch (error) {
      console.error('Error sharing file:', error);
      throw new Error('Failed to share file');
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      
      if (info.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Clean up temporary files
   */
  static async cleanupTemp(): Promise<void> {
    try {
      const tempInfo = await FileSystem.getInfoAsync(this.TEMP_DIR);
      
      if (tempInfo.exists && tempInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(this.TEMP_DIR);
        
        for (const file of files) {
          const fileUri = `${this.TEMP_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          
          // Delete files older than 24 hours
          if (fileInfo.exists && fileInfo.modificationTime) {
            const ageHours = (Date.now() - fileInfo.modificationTime * 1000) / (1000 * 60 * 60);
            
            if (ageHours > 24) {
              await FileSystem.deleteAsync(fileUri);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageInfo(): Promise<{
    totalSize: number;
    documentsSize: number;
    thumbnailsSize: number;
    tempSize: number;
  }> {
    try {
      const [documentsSize, thumbnailsSize, tempSize] = await Promise.all([
        this.getDirectorySize(this.DOCUMENT_DIR),
        this.getDirectorySize(this.THUMBNAILS_DIR),
        this.getDirectorySize(this.TEMP_DIR),
      ]);

      const totalSize = documentsSize + thumbnailsSize + tempSize;

      return {
        totalSize,
        documentsSize,
        thumbnailsSize,
        tempSize,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalSize: 0,
        documentsSize: 0,
        thumbnailsSize: 0,
        tempSize: 0,
      };
    }
  }

  /**
   * Calculate directory size
   */
  private static async getDirectorySize(dirUri: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(dirUri);
      
      if (!info.exists || !info.isDirectory) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(dirUri);
      let totalSize = 0;

      for (const file of files) {
        const fileUri = `${dirUri}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        
        if (fileInfo.exists) {
          if (fileInfo.isDirectory) {
            totalSize += await this.getDirectorySize(`${fileUri}/`);
          } else {
            totalSize += fileInfo.size || 0;
          }
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get MIME type from filename extension
   */
  private static getMimeTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      json: 'application/json',
      xml: 'application/xml',
      zip: 'application/zip',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Get UTI (Uniform Type Identifier) for iOS sharing
   */
  private static getUTIFromFilename(filename: string): string {
    if (Platform.OS !== 'ios') {
      return '';
    }

    const extension = filename.toLowerCase().split('.').pop();
    
    const utis: Record<string, string> = {
      jpg: 'public.jpeg',
      jpeg: 'public.jpeg',
      png: 'public.png',
      gif: 'com.compuserve.gif',
      pdf: 'com.adobe.pdf',
      doc: 'com.microsoft.word.doc',
      docx: 'org.openxmlformats.wordprocessingml.document',
      txt: 'public.plain-text',
      mp4: 'public.mpeg-4',
      mov: 'com.apple.quicktime-movie',
      mp3: 'public.mp3',
    };

    return utis[extension || ''] || 'public.item';
  }
}