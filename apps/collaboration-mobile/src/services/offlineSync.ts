/**
 * Offline Sync Service
 * Handles offline operations, conflict resolution, and data synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import { apolloClient } from './apollo';
import { SyncOperation, ConflictResolution, Document, ContentBlock } from '@/types';
import Config from '@/constants/config';

// MMKV storage for fast offline operations
const storage = new MMKV();

// Storage keys
const OFFLINE_QUEUE_KEY = 'offline_operations_queue';
const CONFLICT_QUEUE_KEY = 'conflict_resolutions_queue';
const DOCUMENT_CACHE_KEY = 'cached_documents';
const YDOC_CACHE_KEY = 'ydoc_cache';

class OfflineSyncService {
  private isOnline = true;
  private syncInProgress = false;
  private ydocs = new Map<string, Y.Doc>();
  private syncQueue: SyncOperation[] = [];
  private conflictQueue: ConflictResolution[] = [];

  constructor() {
    this.initializeNetworkListener();
    this.loadOfflineQueue();
    this.loadConflictQueue();
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // When coming back online, start sync
      if (!wasOnline && this.isOnline && this.syncQueue.length > 0) {
        this.startSync();
      }
    });
  }

  /**
   * Load offline operations from storage
   */
  private async loadOfflineQueue() {
    try {
      const queueData = storage.getString(OFFLINE_QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save offline operations to storage
   */
  private async saveOfflineQueue() {
    try {
      storage.set(OFFLINE_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load conflict resolutions from storage
   */
  private async loadConflictQueue() {
    try {
      const conflictData = storage.getString(CONFLICT_QUEUE_KEY);
      if (conflictData) {
        this.conflictQueue = JSON.parse(conflictData);
      }
    } catch (error) {
      console.error('Failed to load conflict queue:', error);
      this.conflictQueue = [];
    }
  }

  /**
   * Save conflict resolutions to storage
   */
  private async saveConflictQueue() {
    try {
      storage.set(CONFLICT_QUEUE_KEY, JSON.stringify(this.conflictQueue));
    } catch (error) {
      console.error('Failed to save conflict queue:', error);
    }
  }

  /**
   * Get or create Yjs document for collaborative editing
   */
  public getYDoc(documentId: string): Y.Doc {
    if (!this.ydocs.has(documentId)) {
      const ydoc = new Y.Doc();
      
      // Try to load from cache
      const cachedState = storage.getString(`${YDOC_CACHE_KEY}_${documentId}`);
      if (cachedState) {
        try {
          const state = new Uint8Array(JSON.parse(cachedState));
          Y.applyUpdate(ydoc, state);
        } catch (error) {
          console.error('Failed to load cached Y.Doc:', error);
        }
      }

      // Set up auto-save
      ydoc.on('update', (update) => {
        this.saveYDocToCache(documentId, ydoc);
      });

      this.ydocs.set(documentId, ydoc);
    }

    return this.ydocs.get(documentId)!;
  }

  /**
   * Save Yjs document state to cache
   */
  private saveYDocToCache(documentId: string, ydoc: Y.Doc) {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      storage.set(`${YDOC_CACHE_KEY}_${documentId}`, JSON.stringify(Array.from(state)));
    } catch (error) {
      console.error('Failed to cache Y.Doc:', error);
    }
  }

  /**
   * Add operation to offline queue
   */
  public async addOfflineOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>) {
    const syncOperation: SyncOperation = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'PENDING',
      ...operation,
    };

    this.syncQueue.push(syncOperation);
    await this.saveOfflineQueue();

    // Try immediate sync if online
    if (this.isOnline && !this.syncInProgress) {
      this.startSync();
    }

    return syncOperation.id;
  }

  /**
   * Start synchronization process
   */
  public async startSync() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingOperations = this.syncQueue.filter(op => op.status === 'PENDING' || op.status === 'ERROR');
      
      for (const operation of pendingOperations) {
        await this.syncOperation(operation);
      }

      // Remove successful operations
      this.syncQueue = this.syncQueue.filter(op => op.status !== 'SUCCESS');
      await this.saveOfflineQueue();

    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'SYNCING';
    
    try {
      switch (operation.type) {
        case 'CREATE':
          await this.syncCreateOperation(operation);
          break;
        case 'UPDATE':
          await this.syncUpdateOperation(operation);
          break;
        case 'DELETE':
          await this.syncDeleteOperation(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      operation.status = 'SUCCESS';
    } catch (error) {
      operation.status = 'ERROR';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.retryCount++;

      // Remove operation if max retries exceeded
      if (operation.retryCount >= Config.SYNC_RETRY_ATTEMPTS) {
        console.error(`Operation ${operation.id} failed after ${operation.retryCount} retries:`, error);
      }
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreateOperation(operation: SyncOperation): Promise<void> {
    // Implementation depends on the entity type
    // This is a simplified example for document creation
    if (operation.entityType === 'Document') {
      // Use Apollo client to execute create mutation
      // Implementation would include proper GraphQL mutations
    }
  }

  /**
   * Sync update operation
   */
  private async syncUpdateOperation(operation: SyncOperation): Promise<void> {
    if (operation.entityType === 'DocumentContent') {
      await this.syncDocumentContentUpdate(operation);
    }
  }

  /**
   * Sync document content update with CRDT
   */
  private async syncDocumentContentUpdate(operation: SyncOperation): Promise<void> {
    const { entityId: documentId, data } = operation;
    
    try {
      // Get the local Y.Doc
      const ydoc = this.getYDoc(documentId);
      const localState = Y.encodeStateAsUpdate(ydoc);

      // Send update to server
      const result = await apolloClient.mutate({
        mutation: UPDATE_DOCUMENT_CONTENT_MUTATION,
        variables: {
          input: {
            documentId,
            operations: data.operations,
            crdtUpdate: Array.from(localState),
          },
        },
      });

      if (result.data?.updateDocumentContent?.conflicts?.length > 0) {
        // Handle conflicts
        await this.handleConflicts(documentId, result.data.updateDocumentContent.conflicts);
      }

      // Apply remote changes if any
      if (result.data?.updateDocumentContent?.newCrdtState?.state) {
        const remoteUpdate = new Uint8Array(result.data.updateDocumentContent.newCrdtState.state);
        Y.applyUpdate(ydoc, remoteUpdate);
      }

    } catch (error) {
      throw new Error(`Failed to sync document content: ${error}`);
    }
  }

  /**
   * Sync delete operation
   */
  private async syncDeleteOperation(operation: SyncOperation): Promise<void> {
    // Implementation for delete operations
  }

  /**
   * Handle conflicts during synchronization
   */
  private async handleConflicts(documentId: string, conflicts: any[]): Promise<void> {
    for (const conflict of conflicts) {
      const resolution: ConflictResolution = {
        id: uuidv4(),
        type: conflict.type,
        position: conflict.position,
        localOperation: conflict.localOperation,
        remoteOperation: conflict.remoteOperation,
        autoResolved: false,
        resolution: null,
      };

      // Try automatic resolution
      const autoResolution = this.attemptAutoResolution(conflict);
      if (autoResolution) {
        resolution.autoResolved = true;
        resolution.resolution = autoResolution;
        await this.applyConflictResolution(documentId, resolution);
      } else {
        // Queue for manual resolution
        this.conflictQueue.push(resolution);
        await this.saveConflictQueue();
      }
    }
  }

  /**
   * Attempt automatic conflict resolution
   */
  private attemptAutoResolution(conflict: any): any | null {
    // Implement conflict resolution strategies
    switch (conflict.type) {
      case 'INSERT_CONFLICT':
        // Last-write-wins strategy
        return {
          strategy: 'LAST_WRITE_WINS',
          content: conflict.remoteOperation.content,
        };
      
      case 'DELETE_CONFLICT':
        // Keep deletion (conservative approach)
        return {
          strategy: 'KEEP_DELETION',
          content: null,
        };
      
      case 'EDIT_CONFLICT':
        // Merge changes if possible
        return this.attemptMergeResolution(conflict);
      
      default:
        return null;
    }
  }

  /**
   * Attempt to merge conflicting edits
   */
  private attemptMergeResolution(conflict: any): any | null {
    // Simple merge strategy - in a real implementation, 
    // this would use more sophisticated algorithms
    try {
      const localContent = conflict.localOperation.content;
      const remoteContent = conflict.remoteOperation.content;
      
      // If changes don't overlap, merge them
      if (this.canMergeNonOverlapping(localContent, remoteContent)) {
        return {
          strategy: 'MERGE',
          content: this.mergeContent(localContent, remoteContent),
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if content changes can be merged
   */
  private canMergeNonOverlapping(local: string, remote: string): boolean {
    // Simplified check - in practice, this would analyze the diff
    return local !== remote && local.length > 0 && remote.length > 0;
  }

  /**
   * Merge content changes
   */
  private mergeContent(local: string, remote: string): string {
    // Simple merge - in practice, this would use diff algorithms
    return `${local}\n${remote}`;
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(documentId: string, resolution: ConflictResolution): Promise<void> {
    if (!resolution.resolution) return;

    const ydoc = this.getYDoc(documentId);
    const ytext = ydoc.getText('content');

    // Apply resolution to Y.Doc
    switch (resolution.resolution.strategy) {
      case 'LAST_WRITE_WINS':
        ytext.delete(resolution.position.offset, resolution.position.length);
        if (resolution.resolution.content) {
          ytext.insert(resolution.position.offset, resolution.resolution.content);
        }
        break;
      
      case 'KEEP_DELETION':
        ytext.delete(resolution.position.offset, resolution.position.length);
        break;
      
      case 'MERGE':
        ytext.delete(resolution.position.offset, resolution.position.length);
        ytext.insert(resolution.position.offset, resolution.resolution.content);
        break;
    }
  }

  /**
   * Get pending conflicts for manual resolution
   */
  public getPendingConflicts(): ConflictResolution[] {
    return this.conflictQueue.filter(c => !c.autoResolved && !c.resolution);
  }

  /**
   * Resolve conflict manually
   */
  public async resolveConflict(conflictId: string, resolution: any): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (!conflict) return;

    conflict.resolution = resolution;
    await this.saveConflictQueue();
    
    // Apply resolution if we have the document ID context
    // In a real implementation, we'd need to track which document each conflict belongs to
  }

  /**
   * Cache document for offline access
   */
  public async cacheDocument(document: Document): Promise<void> {
    try {
      const cached = storage.getString(DOCUMENT_CACHE_KEY) || '{}';
      const cache = JSON.parse(cached);
      
      cache[document.id] = {
        ...document,
        cachedAt: Date.now(),
      };
      
      storage.set(DOCUMENT_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache document:', error);
    }
  }

  /**
   * Get cached document
   */
  public getCachedDocument(documentId: string): Document | null {
    try {
      const cached = storage.getString(DOCUMENT_CACHE_KEY) || '{}';
      const cache = JSON.parse(cached);
      return cache[documentId] || null;
    } catch (error) {
      console.error('Failed to get cached document:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    try {
      storage.delete(OFFLINE_QUEUE_KEY);
      storage.delete(CONFLICT_QUEUE_KEY);
      storage.delete(DOCUMENT_CACHE_KEY);
      
      // Clear Y.Doc caches
      this.ydocs.forEach((_, documentId) => {
        storage.delete(`${YDOC_CACHE_KEY}_${documentId}`);
      });
      
      this.ydocs.clear();
      this.syncQueue = [];
      this.conflictQueue = [];
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    isOnline: boolean;
    pendingOperations: number;
    pendingConflicts: number;
    syncInProgress: boolean;
  } {
    return {
      isOnline: this.isOnline,
      pendingOperations: this.syncQueue.filter(op => op.status !== 'SUCCESS').length,
      pendingConflicts: this.getPendingConflicts().length,
      syncInProgress: this.syncInProgress,
    };
  }
}

// GraphQL mutations (would be imported from generated types)
const UPDATE_DOCUMENT_CONTENT_MUTATION = `
  mutation UpdateDocumentContent($input: UpdateDocumentContentInput!) {
    updateDocumentContent(input: $input) {
      success
      appliedOperations {
        id
        type
        position
        content
        authorId
        timestamp
        applied
      }
      conflicts {
        id
        type
        position {
          index
          offset
          length
          depth
        }
        localOperation {
          id
          type
          content
        }
        remoteOperation {
          id
          type
          content
        }
        suggested {
          strategy
          resolution
        }
      }
      newCrdtState {
        state
        vectorClock {
          clocks
          version
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;