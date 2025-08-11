/**
 * Optimized CRDT Implementation with Operation Batching and Compression
 * Target: <10ms merge time for complex operations
 */

import { performance } from 'perf_hooks';
import * as msgpack from 'msgpack-lite';
import { createHash } from 'crypto';

// CRDT Operation types
export enum OpType {
  INSERT = 0,
  DELETE = 1,
  FORMAT = 2,
  MOVE = 3,
}

export interface CRDTOperation {
  id: string;
  type: OpType;
  position: number;
  content?: any;
  length?: number;
  attributes?: Record<string, any>;
  timestamp: number;
  author: string;
  dependencies: string[];
}

// Optimized CRDT document with efficient merging
export class OptimizedCRDT {
  private operations: Map<string, CRDTOperation> = new Map();
  private operationLog: CRDTOperation[] = [];
  private content: any[] = [];
  private versionVector: Map<string, number> = new Map();
  private operationCache: Map<string, any> = new Map();
  private mergeBuffer: CRDTOperation[] = [];
  private mergeTimer: NodeJS.Timeout | null = null;

  // Performance optimizations
  private readonly MERGE_BATCH_SIZE = 100;
  private readonly MERGE_DELAY_MS = 5;
  private readonly CACHE_SIZE = 1000;
  private readonly COMPRESSION_THRESHOLD = 50;

  constructor(private siteId: string) {}

  // Optimized operation application with batching
  applyOperation(op: CRDTOperation): void {
    const startTime = performance.now();

    // Check if operation already applied (idempotency)
    if (this.operations.has(op.id)) {
      return;
    }

    // Add to merge buffer for batched processing
    this.mergeBuffer.push(op);

    // Process immediately if buffer is full
    if (this.mergeBuffer.length >= this.MERGE_BATCH_SIZE) {
      this.processMergeBuffer();
    } else if (!this.mergeTimer) {
      // Schedule batch processing
      this.mergeTimer = setTimeout(() => {
        this.processMergeBuffer();
      }, this.MERGE_DELAY_MS);
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 10) {
      console.warn(`Slow CRDT operation: ${elapsed}ms`);
    }
  }

  // Batch process operations for efficiency
  private processMergeBuffer(): void {
    if (this.mergeBuffer.length === 0) return;

    const startTime = performance.now();

    // Sort operations by timestamp and dependencies
    const sortedOps = this.topologicalSort(this.mergeBuffer);

    // Apply operations in batch
    for (const op of sortedOps) {
      this.applyOperationInternal(op);
    }

    // Clear buffer and timer
    this.mergeBuffer = [];
    if (this.mergeTimer) {
      clearTimeout(this.mergeTimer);
      this.mergeTimer = null;
    }

    // Update version vector
    this.updateVersionVector(sortedOps);

    // Compress operation log if needed
    if (this.operationLog.length > this.COMPRESSION_THRESHOLD) {
      this.compressOperationLog();
    }

    const elapsed = performance.now() - startTime;
    console.log(`Batch processed ${sortedOps.length} operations in ${elapsed}ms`);
  }

  // Internal operation application
  private applyOperationInternal(op: CRDTOperation): void {
    // Store operation
    this.operations.set(op.id, op);
    this.operationLog.push(op);

    // Apply based on type
    switch (op.type) {
      case OpType.INSERT:
        this.applyInsert(op);
        break;
      case OpType.DELETE:
        this.applyDelete(op);
        break;
      case OpType.FORMAT:
        this.applyFormat(op);
        break;
      case OpType.MOVE:
        this.applyMove(op);
        break;
    }

    // Cache result for fast retrieval
    this.updateCache(op);
  }

  // Optimized insert with position caching
  private applyInsert(op: CRDTOperation): void {
    const position = this.findInsertPosition(op);
    this.content.splice(position, 0, {
      id: op.id,
      content: op.content,
      attributes: op.attributes || {},
      deleted: false,
    });
  }

  // Optimized delete with tombstoning
  private applyDelete(op: CRDTOperation): void {
    const item = this.findItem(op.position);
    if (item) {
      item.deleted = true; // Tombstone instead of removal
    }
  }

  // Format operation with attribute merging
  private applyFormat(op: CRDTOperation): void {
    const start = op.position;
    const end = start + (op.length || 1);

    for (let i = start; i < end && i < this.content.length; i++) {
      const item = this.content[i];
      if (!item.deleted) {
        item.attributes = { ...item.attributes, ...op.attributes };
      }
    }
  }

  // Move operation with efficient repositioning
  private applyMove(op: CRDTOperation): void {
    const source = op.position;
    const target = op.attributes?.target || 0;
    const length = op.length || 1;

    const items = this.content.splice(source, length);
    this.content.splice(target, 0, ...items);
  }

  // Find insertion position using binary search
  private findInsertPosition(op: CRDTOperation): number {
    if (this.content.length === 0) return 0;

    let left = 0;
    let right = this.content.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = this.compareOperations(op, this.content[mid]);

      if (comparison < 0) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return left;
  }

  // Compare operations for ordering
  private compareOperations(a: any, b: any): number {
    // Compare by timestamp first
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    // Break ties with author ID
    return a.author.localeCompare(b.author);
  }

  // Find item by position
  private findItem(position: number): any {
    let visibleIndex = 0;
    for (const item of this.content) {
      if (!item.deleted) {
        if (visibleIndex === position) {
          return item;
        }
        visibleIndex++;
      }
    }
    return null;
  }

  // Topological sort for dependency resolution
  private topologicalSort(ops: CRDTOperation[]): CRDTOperation[] {
    const sorted: CRDTOperation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (op: CRDTOperation) => {
      if (visited.has(op.id)) return;
      if (visiting.has(op.id)) {
        console.warn('Cycle detected in dependencies');
        return;
      }

      visiting.add(op.id);

      // Visit dependencies first
      for (const depId of op.dependencies) {
        const dep = ops.find(o => o.id === depId);
        if (dep) visit(dep);
      }

      visiting.delete(op.id);
      visited.add(op.id);
      sorted.push(op);
    };

    for (const op of ops) {
      visit(op);
    }

    return sorted;
  }

  // Update version vector for causality tracking
  private updateVersionVector(ops: CRDTOperation[]): void {
    for (const op of ops) {
      const current = this.versionVector.get(op.author) || 0;
      this.versionVector.set(op.author, Math.max(current, op.timestamp));
    }
  }

  // Compress operation log to reduce memory
  private compressOperationLog(): void {
    const startTime = performance.now();

    // Group consecutive operations by author
    const compressed: CRDTOperation[] = [];
    let current: CRDTOperation | null = null;

    for (const op of this.operationLog) {
      if (current &&
          current.author === op.author &&
          current.type === op.type &&
          Math.abs(current.timestamp - op.timestamp) < 100) {
        // Merge operations
        if (op.type === OpType.INSERT && current.content) {
          current.content += op.content;
        } else if (op.type === OpType.DELETE && current.length) {
          current.length += op.length || 1;
        }
      } else {
        if (current) compressed.push(current);
        current = { ...op };
      }
    }

    if (current) compressed.push(current);

    this.operationLog = compressed;

    const elapsed = performance.now() - startTime;
    console.log(`Compressed ${this.operationLog.length} operations in ${elapsed}ms`);
  }

  // Update cache for fast retrieval
  private updateCache(op: CRDTOperation): void {
    const cacheKey = this.getCacheKey(op);
    this.operationCache.set(cacheKey, this.serializeState());

    // Evict old cache entries
    if (this.operationCache.size > this.CACHE_SIZE) {
      const firstKey = this.operationCache.keys().next().value;
      this.operationCache.delete(firstKey);
    }
  }

  // Generate cache key
  private getCacheKey(op: CRDTOperation): string {
    return createHash('md5')
      .update(`${op.id}:${op.timestamp}`)
      .digest('hex');
  }

  // Serialize state for transmission
  serializeState(): Buffer {
    const state = {
      operations: Array.from(this.operations.values()),
      versionVector: Array.from(this.versionVector.entries()),
      content: this.getVisibleContent(),
    };

    // Use MessagePack for efficient serialization
    return msgpack.encode(state);
  }

  // Deserialize state from buffer
  static deserializeState(buffer: Buffer): OptimizedCRDT {
    const state = msgpack.decode(buffer);
    const crdt = new OptimizedCRDT('temp');

    // Restore operations
    for (const op of state.operations) {
      crdt.operations.set(op.id, op);
      crdt.operationLog.push(op);
    }

    // Restore version vector
    crdt.versionVector = new Map(state.versionVector);

    // Restore content
    crdt.content = state.content;

    return crdt;
  }

  // Get visible content (excluding deleted items)
  getVisibleContent(): any[] {
    return this.content
      .filter(item => !item.deleted)
      .map(item => ({
        content: item.content,
        attributes: item.attributes,
      }));
  }

  // Merge with another CRDT instance
  merge(other: OptimizedCRDT): void {
    const startTime = performance.now();

    // Get operations not in our set
    const newOps: CRDTOperation[] = [];
    for (const [id, op] of other.operations) {
      if (!this.operations.has(id)) {
        newOps.push(op);
      }
    }

    // Apply new operations in batch
    if (newOps.length > 0) {
      this.mergeBuffer.push(...newOps);
      this.processMergeBuffer();
    }

    const elapsed = performance.now() - startTime;
    console.log(`Merged ${newOps.length} operations in ${elapsed}ms`);
  }

  // Generate operation ID
  generateOperationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${this.siteId}-${timestamp}-${random}`;
  }

  // Create insert operation
  createInsertOp(position: number, content: any, attributes?: any): CRDTOperation {
    return {
      id: this.generateOperationId(),
      type: OpType.INSERT,
      position,
      content,
      attributes,
      timestamp: Date.now(),
      author: this.siteId,
      dependencies: this.getLatestOperationIds(3),
    };
  }

  // Create delete operation
  createDeleteOp(position: number, length: number = 1): CRDTOperation {
    return {
      id: this.generateOperationId(),
      type: OpType.DELETE,
      position,
      length,
      timestamp: Date.now(),
      author: this.siteId,
      dependencies: this.getLatestOperationIds(3),
    };
  }

  // Get latest operation IDs for dependencies
  private getLatestOperationIds(count: number): string[] {
    const ids: string[] = [];
    const start = Math.max(0, this.operationLog.length - count);

    for (let i = start; i < this.operationLog.length; i++) {
      ids.push(this.operationLog[i].id);
    }

    return ids;
  }

  // Get metrics for monitoring
  getMetrics(): any {
    return {
      operationCount: this.operations.size,
      logSize: this.operationLog.length,
      contentSize: this.content.length,
      visibleContent: this.getVisibleContent().length,
      cacheSize: this.operationCache.size,
      versionVector: Array.from(this.versionVector.entries()),
    };
  }
}

// CRDT Manager for document-level operations
export class CRDTManager {
  private documents = new Map<string, OptimizedCRDT>();
  private syncQueue = new Map<string, any[]>();

  getDocument(documentId: string): OptimizedCRDT {
    if (!this.documents.has(documentId)) {
      this.documents.set(documentId, new OptimizedCRDT(documentId));
    }
    return this.documents.get(documentId)!;
  }

  // Apply operation to document
  applyOperation(documentId: string, operation: CRDTOperation): void {
    const doc = this.getDocument(documentId);
    doc.applyOperation(operation);

    // Add to sync queue
    if (!this.syncQueue.has(documentId)) {
      this.syncQueue.set(documentId, []);
    }
    this.syncQueue.get(documentId)!.push(operation);
  }

  // Get operations to sync
  getSyncOperations(documentId: string): any[] {
    const ops = this.syncQueue.get(documentId) || [];
    this.syncQueue.delete(documentId);
    return ops;
  }

  // Merge documents
  mergeDocuments(documentId: string, remoteState: Buffer): void {
    const localDoc = this.getDocument(documentId);
    const remoteDoc = OptimizedCRDT.deserializeState(remoteState);
    localDoc.merge(remoteDoc);
  }

  // Get document state
  getDocumentState(documentId: string): Buffer {
    const doc = this.getDocument(documentId);
    return doc.serializeState();
  }

  // Get all metrics
  getAllMetrics(): any {
    const metrics: any = {};
    for (const [id, doc] of this.documents) {
      metrics[id] = doc.getMetrics();
    }
    return metrics;
  }
}
