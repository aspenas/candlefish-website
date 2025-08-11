import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import { apolloClient } from './apollo';
import { store } from '@/stores';
import { setOfflineStatus, addPendingOperation, removePendingOperation } from '@/stores/slices/offlineSlice';
import { logError, logInfo } from '@/utils/logger';

// Storage keys
const STORAGE_KEYS = {
  DOCUMENTS: '@candlefish/documents',
  COMMENTS: '@candlefish/comments',
  PRESENCE: '@candlefish/presence',
  PENDING_OPERATIONS: '@candlefish/pending_operations',
  OFFLINE_QUEUE: '@candlefish/offline_queue',
  CACHE_METADATA: '@candlefish/cache_metadata',
  USER_PREFERENCES: '@candlefish/user_preferences',
  ENCRYPTION_KEY: '@candlefish/encryption_key',
} as const;

interface CacheMetadata {
  lastSyncTimestamp: number;
  version: string;
  documentVersions: Record<string, number>;
  compactionNeeded: boolean;
}

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'DOCUMENT' | 'COMMENT' | 'OPERATION';
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineDocument {
  id: string;
  name: string;
  content: any;
  crdtState: any;
  lastModified: number;
  version: number;
  encryptionEnabled: boolean;
}

interface OfflineComment {
  id: string;
  documentId: string;
  content: string;
  author: any;
  position?: any;
  createdAt: string;
  localOnly?: boolean;
}

class OfflineManager {
  private encryptionKey: string | null = null;
  private syncInProgress = false;
  private cacheSize = 0;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize encryption key
      await this.initializeEncryption();

      // Start network monitoring
      this.startNetworkMonitoring();

      // Schedule periodic cleanup
      this.scheduleCleanup();

      logInfo('Offline manager initialized');
    } catch (error) {
      logError('Failed to initialize offline manager:', error);
    }
  }

  private async initializeEncryption() {
    try {
      let key = await SecureStore.getItemAsync(STORAGE_KEYS.ENCRYPTION_KEY);

      if (!key) {
        // Generate new encryption key
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `candlefish_${Date.now()}_${Math.random()}`,
          { encoding: Crypto.CryptoEncoding.HEX }
        );

        await SecureStore.setItemAsync(STORAGE_KEYS.ENCRYPTION_KEY, key);
      }

      this.encryptionKey = key;
    } catch (error) {
      logError('Failed to initialize encryption:', error);
    }
  }

  private startNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const isOnline = state.isConnected && state.isInternetReachable;

      store.dispatch(setOfflineStatus({
        isOnline,
        networkType: state.type,
        isWiFi: state.type === 'wifi',
      }));

      if (isOnline && !this.syncInProgress) {
        this.syncPendingOperations();
      }
    });
  }

  private scheduleCleanup() {
    // Run cleanup every 30 minutes
    setInterval(() => {
      this.performMaintenance();
    }, 30 * 60 * 1000);
  }

  // Document Management
  async saveDocument(document: any): Promise<void> {
    try {
      const documents = await this.getDocuments();

      const offlineDocument: OfflineDocument = {
        id: document.id,
        name: document.name,
        content: document.content,
        crdtState: document.crdtState,
        lastModified: Date.now(),
        version: (documents[document.id]?.version || 0) + 1,
        encryptionEnabled: false, // TODO: Add encryption support
      };

      documents[document.id] = offlineDocument;

      await this.setStorageItem(STORAGE_KEYS.DOCUMENTS, documents);
      await this.updateCacheMetadata();

      logInfo(`Document ${document.id} saved offline`);
    } catch (error) {
      logError('Failed to save document offline:', error);
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<OfflineDocument | null> {
    try {
      const documents = await this.getDocuments();
      return documents[documentId] || null;
    } catch (error) {
      logError('Failed to get offline document:', error);
      return null;
    }
  }

  async getDocuments(): Promise<Record<string, OfflineDocument>> {
    try {
      const data = await this.getStorageItem(STORAGE_KEYS.DOCUMENTS);
      return data || {};
    } catch (error) {
      logError('Failed to get offline documents:', error);
      return {};
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const documents = await this.getDocuments();
      delete documents[documentId];

      await this.setStorageItem(STORAGE_KEYS.DOCUMENTS, documents);
      await this.updateCacheMetadata();

      logInfo(`Document ${documentId} deleted offline`);
    } catch (error) {
      logError('Failed to delete offline document:', error);
      throw error;
    }
  }

  // Comment Management
  async saveComment(comment: any, documentId: string): Promise<void> {
    try {
      const comments = await this.getComments();

      const offlineComment: OfflineComment = {
        id: comment.id,
        documentId,
        content: comment.content.text,
        author: comment.author,
        position: comment.position,
        createdAt: comment.createdAt || new Date().toISOString(),
        localOnly: !comment.id.startsWith('server_'), // Mark local-only comments
      };

      if (!comments[documentId]) {
        comments[documentId] = [];
      }

      const existingIndex = comments[documentId].findIndex(c => c.id === comment.id);
      if (existingIndex >= 0) {
        comments[documentId][existingIndex] = offlineComment;
      } else {
        comments[documentId].push(offlineComment);
      }

      await this.setStorageItem(STORAGE_KEYS.COMMENTS, comments);

      logInfo(`Comment ${comment.id} saved offline`);
    } catch (error) {
      logError('Failed to save comment offline:', error);
      throw error;
    }
  }

  async getComments(documentId?: string): Promise<Record<string, OfflineComment[]> | OfflineComment[]> {
    try {
      const data = await this.getStorageItem(STORAGE_KEYS.COMMENTS) || {};

      if (documentId) {
        return data[documentId] || [];
      }

      return data;
    } catch (error) {
      logError('Failed to get offline comments:', error);
      return documentId ? [] : {};
    }
  }

  // Pending Operations Queue
  async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingOperation: PendingOperation = {
        ...operation,
        id: `pending_${Date.now()}_${Math.random().toString(36)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      const operations = await this.getPendingOperations();
      operations.push(pendingOperation);

      await this.setStorageItem(STORAGE_KEYS.PENDING_OPERATIONS, operations);

      store.dispatch(addPendingOperation(pendingOperation));

      logInfo(`Pending operation ${pendingOperation.id} added`);
    } catch (error) {
      logError('Failed to add pending operation:', error);
      throw error;
    }
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    try {
      return await this.getStorageItem(STORAGE_KEYS.PENDING_OPERATIONS) || [];
    } catch (error) {
      logError('Failed to get pending operations:', error);
      return [];
    }
  }

  async removePendingOperation(operationId: string): Promise<void> {
    try {
      const operations = await this.getPendingOperations();
      const filtered = operations.filter(op => op.id !== operationId);

      await this.setStorageItem(STORAGE_KEYS.PENDING_OPERATIONS, filtered);

      store.dispatch(removePendingOperation(operationId));

      logInfo(`Pending operation ${operationId} removed`);
    } catch (error) {
      logError('Failed to remove pending operation:', error);
      throw error;
    }
  }

  // Sync Management
  async syncPendingOperations(): Promise<void> {
    if (this.syncInProgress) {
      logInfo('Sync already in progress, skipping');
      return;
    }

    try {
      this.syncInProgress = true;
      const operations = await this.getPendingOperations();

      if (operations.length === 0) {
        logInfo('No pending operations to sync');
        return;
      }

      logInfo(`Syncing ${operations.length} pending operations`);

      for (const operation of operations) {
        try {
          await this.executePendingOperation(operation);
          await this.removePendingOperation(operation.id);
        } catch (error) {
          logError(`Failed to sync operation ${operation.id}:`, error);

          // Increment retry count
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            // Remove failed operation after max retries
            await this.removePendingOperation(operation.id);
            logError(`Operation ${operation.id} failed after ${operation.maxRetries} retries`);
          } else {
            // Update operation with new retry count
            const allOperations = await this.getPendingOperations();
            const index = allOperations.findIndex(op => op.id === operation.id);
            if (index >= 0) {
              allOperations[index] = operation;
              await this.setStorageItem(STORAGE_KEYS.PENDING_OPERATIONS, allOperations);
            }
          }
        }
      }

      logInfo('Sync completed');
    } catch (error) {
      logError('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executePendingOperation(operation: PendingOperation): Promise<void> {
    switch (operation.entity) {
      case 'DOCUMENT':
        await this.syncDocumentOperation(operation);
        break;
      case 'COMMENT':
        await this.syncCommentOperation(operation);
        break;
      case 'OPERATION':
        await this.syncCRDTOperation(operation);
        break;
      default:
        throw new Error(`Unknown operation entity: ${operation.entity}`);
    }
  }

  private async syncDocumentOperation(operation: PendingOperation): Promise<void> {
    const { type, entityId, data } = operation;

    switch (type) {
      case 'CREATE':
        // Create document via GraphQL
        // Implementation depends on your GraphQL mutations
        break;
      case 'UPDATE':
        // Update document via GraphQL
        // Implementation depends on your GraphQL mutations
        break;
      case 'DELETE':
        // Delete document via GraphQL
        // Implementation depends on your GraphQL mutations
        break;
    }
  }

  private async syncCommentOperation(operation: PendingOperation): Promise<void> {
    // Similar implementation for comments
    // Implementation depends on your GraphQL mutations
  }

  private async syncCRDTOperation(operation: PendingOperation): Promise<void> {
    // Sync CRDT operations
    // Implementation depends on your CRDT sync mechanism
  }

  // Cache Management
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.removeItem(STORAGE_KEYS.COMMENTS),
        AsyncStorage.removeItem(STORAGE_KEYS.PRESENCE),
        AsyncStorage.removeItem(STORAGE_KEYS.CACHE_METADATA),
      ]);

      this.cacheSize = 0;
      logInfo('Cache cleared');
    } catch (error) {
      logError('Failed to clear cache:', error);
      throw error;
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const candlefishKeys = keys.filter(key => key.startsWith('@candlefish/'));

      let totalSize = 0;

      for (const key of candlefishKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      this.cacheSize = totalSize;
      return totalSize;
    } catch (error) {
      logError('Failed to calculate cache size:', error);
      return 0;
    }
  }

  private async performMaintenance(): Promise<void> {
    try {
      logInfo('Starting cache maintenance');

      // Check cache size
      const cacheSize = await this.getCacheSize();

      if (cacheSize > this.maxCacheSize) {
        logInfo(`Cache size (${cacheSize}) exceeds limit (${this.maxCacheSize}), compacting...`);
        await this.compactCache();
      }

      // Clean expired items
      await this.cleanExpiredItems();

      // Update metadata
      await this.updateCacheMetadata();

      logInfo('Cache maintenance completed');
    } catch (error) {
      logError('Cache maintenance failed:', error);
    }
  }

  private async compactCache(): Promise<void> {
    try {
      // Remove old document versions
      const documents = await this.getDocuments();
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      let compacted = false;

      for (const [documentId, document] of Object.entries(documents)) {
        if (now - document.lastModified > maxAge) {
          delete documents[documentId];
          compacted = true;
        }
      }

      if (compacted) {
        await this.setStorageItem(STORAGE_KEYS.DOCUMENTS, documents);
      }

      // Remove old comments
      const comments = await this.getComments() as Record<string, OfflineComment[]>;

      for (const [documentId, documentComments] of Object.entries(comments)) {
        const filtered = documentComments.filter(comment => {
          const commentAge = now - new Date(comment.createdAt).getTime();
          return commentAge <= maxAge;
        });

        if (filtered.length !== documentComments.length) {
          comments[documentId] = filtered;
          compacted = true;
        }
      }

      if (compacted) {
        await this.setStorageItem(STORAGE_KEYS.COMMENTS, comments);
      }

      logInfo('Cache compaction completed');
    } catch (error) {
      logError('Cache compaction failed:', error);
    }
  }

  private async cleanExpiredItems(): Promise<void> {
    // Remove expired pending operations
    const operations = await this.getPendingOperations();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    const validOperations = operations.filter(op => now - op.timestamp <= maxAge);

    if (validOperations.length !== operations.length) {
      await this.setStorageItem(STORAGE_KEYS.PENDING_OPERATIONS, validOperations);
    }
  }

  private async updateCacheMetadata(): Promise<void> {
    try {
      const documents = await this.getDocuments();

      const metadata: CacheMetadata = {
        lastSyncTimestamp: Date.now(),
        version: '1.0.0',
        documentVersions: Object.fromEntries(
          Object.entries(documents).map(([id, doc]) => [id, doc.version])
        ),
        compactionNeeded: this.cacheSize > this.maxCacheSize * 0.8,
      };

      await this.setStorageItem(STORAGE_KEYS.CACHE_METADATA, metadata);
    } catch (error) {
      logError('Failed to update cache metadata:', error);
    }
  }

  // Storage utilities
  private async getStorageItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logError(`Failed to get storage item ${key}:`, error);
      return null;
    }
  }

  private async setStorageItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logError(`Failed to set storage item ${key}:`, error);
      throw error;
    }
  }

  // Encryption utilities (for future implementation)
  private async encrypt(data: string): Promise<string> {
    // TODO: Implement encryption
    return data;
  }

  private async decrypt(encryptedData: string): Promise<string> {
    // TODO: Implement decryption
    return encryptedData;
  }
}

export const offlineManager = new OfflineManager();
export default offlineManager;
