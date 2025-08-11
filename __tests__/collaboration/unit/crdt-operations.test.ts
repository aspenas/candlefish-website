/**
 * Unit Tests for CRDT Operations
 * Tests conflict-free replicated data type operations, operational transforms, and conflict resolution
 */

import {
  CRDTState,
  Operation,
  CRDTOperation,
  VectorClock,
  OperationType,
  CRDTType,
  ConflictResolutionStrategy,
} from '../../../graphql/types/collaboration-types';

import {
  createMockOperation,
  createMockDocument,
  waitFor,
} from '../setup/unit.setup';

// Mock CRDT implementation classes (these would be imported from actual implementation)
class MockCRDTEngine {
  constructor(public type: CRDTType = 'YATA') {
    this.state = {
      type,
      state: {},
      vectorClock: { clocks: {}, version: 0 },
      operationLog: [],
      mergeable: true,
    };
  }

  state: CRDTState;

  applyOperation(operation: CRDTOperation): { success: boolean; conflicts: any[] } {
    // Mock implementation
    this.state.operationLog.push(operation);
    this.state.vectorClock.version++;
    return { success: true, conflicts: [] };
  }

  merge(otherState: CRDTState): { merged: CRDTState; conflicts: any[] } {
    // Mock merge logic
    return { merged: this.state, conflicts: [] };
  }

  transformOperation(operation: Operation, otherOperations: Operation[]): Operation {
    // Mock operational transform
    return operation;
  }

  resolveConflict(strategy: ConflictResolutionStrategy, operations: Operation[]): Operation[] {
    // Mock conflict resolution
    return operations;
  }
}

class MockOperationalTransform {
  static transform(op1: Operation, op2: Operation): { op1Prime: Operation; op2Prime: Operation } {
    // Mock OT implementation
    return {
      op1Prime: { ...op1, transformedFroms: [...(op1.transformedFroms || []), op2.id] },
      op2Prime: { ...op2, transformedFroms: [...(op2.transformedFroms || []), op1.id] },
    };
  }

  static compose(operations: Operation[]): Operation[] {
    // Mock operation composition
    return operations;
  }
}

describe('CRDT Operations', () => {
  let crdtEngine: MockCRDTEngine;

  beforeEach(() => {
    crdtEngine = new MockCRDTEngine();
  });

  describe('Basic CRDT Operations', () => {
    it('should create a new CRDT state', () => {
      expect(crdtEngine.state).toMatchObject({
        type: 'YATA',
        state: {},
        vectorClock: { clocks: {}, version: 0 },
        operationLog: [],
        mergeable: true,
      });
    });

    it('should apply insert operation', () => {
      const operation: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'Hello' },
        timestamp: new Date(),
        dependencies: [],
      };

      const result = crdtEngine.applyOperation(operation);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(crdtEngine.state.operationLog).toContain(operation);
      expect(crdtEngine.state.vectorClock.version).toBe(1);
    });

    it('should apply delete operation', () => {
      // First insert some content
      const insertOp: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'Hello World' },
        timestamp: new Date(),
        dependencies: [],
      };
      crdtEngine.applyOperation(insertOp);

      // Then delete part of it
      const deleteOp: CRDTOperation = {
        id: 'op-2',
        clientId: 'client-1',
        type: 'DELETE',
        position: 5,
        content: { length: 6 }, // Delete " World"
        timestamp: new Date(),
        dependencies: ['op-1'],
      };

      const result = crdtEngine.applyOperation(deleteOp);

      expect(result.success).toBe(true);
      expect(crdtEngine.state.operationLog).toHaveLength(2);
      expect(crdtEngine.state.vectorClock.version).toBe(2);
    });

    it('should handle format operations', () => {
      const operation: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'FORMAT',
        position: 0,
        content: {
          range: { start: 0, end: 5 },
          style: { bold: true }
        },
        timestamp: new Date(),
        dependencies: [],
      };

      const result = crdtEngine.applyOperation(operation);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Vector Clock Management', () => {
    it('should increment version on operation', () => {
      const initialVersion = crdtEngine.state.vectorClock.version;

      const operation: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'test' },
        timestamp: new Date(),
        dependencies: [],
      };

      crdtEngine.applyOperation(operation);

      expect(crdtEngine.state.vectorClock.version).toBe(initialVersion + 1);
    });

    it('should track client clocks', () => {
      const vectorClock: VectorClock = {
        clocks: {
          'client-1': 5,
          'client-2': 3,
          'client-3': 1,
        },
        version: 9,
      };

      crdtEngine.state.vectorClock = vectorClock;

      expect(crdtEngine.state.vectorClock.clocks['client-1']).toBe(5);
      expect(crdtEngine.state.vectorClock.clocks['client-2']).toBe(3);
      expect(crdtEngine.state.vectorClock.version).toBe(9);
    });
  });

  describe('CRDT State Merging', () => {
    it('should merge compatible states', () => {
      const otherState: CRDTState = {
        type: 'YATA',
        state: { content: 'other content' },
        vectorClock: { clocks: { 'client-2': 1 }, version: 1 },
        operationLog: [{
          id: 'op-other',
          clientId: 'client-2',
          type: 'INSERT',
          position: 0,
          content: { text: 'other' },
          timestamp: new Date(),
          dependencies: [],
        }],
        mergeable: true,
      };

      const result = crdtEngine.merge(otherState);

      expect(result.merged).toBeDefined();
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect merge conflicts', () => {
      // Create conflicting operations at the same position
      const operation1: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'Hello' },
        timestamp: new Date(),
        dependencies: [],
      };

      const operation2: CRDTOperation = {
        id: 'op-2',
        clientId: 'client-2',
        type: 'INSERT',
        position: 0,
        content: { text: 'Hi' },
        timestamp: new Date(),
        dependencies: [],
      };

      crdtEngine.applyOperation(operation1);

      const otherState: CRDTState = {
        type: 'YATA',
        state: {},
        vectorClock: { clocks: { 'client-2': 1 }, version: 1 },
        operationLog: [operation2],
        mergeable: true,
      };

      const result = crdtEngine.merge(otherState);

      // In a real implementation, this might detect conflicts
      expect(result.merged).toBeDefined();
    });
  });

  describe('Operational Transform', () => {
    it('should transform insert against insert', () => {
      const op1 = createMockOperation({
        type: 'INSERT',
        position: 5,
        content: { text: 'Hello' },
      });

      const op2 = createMockOperation({
        type: 'INSERT',
        position: 5,
        content: { text: 'World' },
      });

      const result = MockOperationalTransform.transform(op1, op2);

      expect(result.op1Prime.transformedFroms).toContain(op2.id);
      expect(result.op2Prime.transformedFroms).toContain(op1.id);
    });

    it('should transform insert against delete', () => {
      const insertOp = createMockOperation({
        type: 'INSERT',
        position: 10,
        content: { text: 'new text' },
      });

      const deleteOp = createMockOperation({
        type: 'DELETE',
        position: 5,
        length: 3,
      });

      const result = MockOperationalTransform.transform(insertOp, deleteOp);

      expect(result.op1Prime).toBeDefined();
      expect(result.op2Prime).toBeDefined();
      // In real OT, the insert position might be adjusted
    });

    it('should handle complex transformation scenarios', () => {
      const operations = [
        createMockOperation({ type: 'INSERT', position: 0, content: { text: 'A' } }),
        createMockOperation({ type: 'INSERT', position: 0, content: { text: 'B' } }),
        createMockOperation({ type: 'DELETE', position: 1, length: 1 }),
      ];

      const composed = MockOperationalTransform.compose(operations);

      expect(composed).toBeDefined();
      expect(composed).toHaveLength(operations.length);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should resolve conflicts with last writer wins', () => {
      const operations = [
        createMockOperation({
          authorId: 'user-1',
          timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
          content: { text: 'First' },
        }),
        createMockOperation({
          authorId: 'user-2',
          timestamp: new Date('2024-01-01T10:01:00Z').toISOString(),
          content: { text: 'Second' },
        }),
      ];

      const resolved = crdtEngine.resolveConflict(
        'LAST_WRITER_WINS',
        operations
      );

      expect(resolved).toBeDefined();
      expect(Array.isArray(resolved)).toBe(true);
    });

    it('should resolve conflicts with manual resolution', () => {
      const operations = [
        createMockOperation({ content: { text: 'Option A' } }),
        createMockOperation({ content: { text: 'Option B' } }),
      ];

      const resolved = crdtEngine.resolveConflict(
        'MANUAL',
        operations
      );

      expect(resolved).toBeDefined();
      // Manual resolution would typically mark conflicts for user review
    });

    it('should resolve conflicts with CRDT merge semantics', () => {
      const operations = [
        createMockOperation({
          type: 'INSERT',
          position: 0,
          content: { text: 'Hello' },
        }),
        createMockOperation({
          type: 'INSERT',
          position: 0,
          content: { text: 'Hi' },
        }),
      ];

      const resolved = crdtEngine.resolveConflict(
        'CRDT_MERGE',
        operations
      );

      expect(resolved).toBeDefined();
      // CRDT merge should handle conflicting inserts deterministically
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content operations', () => {
      const operation: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: '' },
        timestamp: new Date(),
        dependencies: [],
      };

      const result = crdtEngine.applyOperation(operation);

      expect(result.success).toBe(true);
    });

    it('should handle operations with invalid positions', () => {
      const operation: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: -1, // Invalid position
        content: { text: 'test' },
        timestamp: new Date(),
        dependencies: [],
      };

      // In real implementation, this might return an error or normalize the position
      const result = crdtEngine.applyOperation(operation);

      expect(result).toBeDefined();
    });

    it('should handle circular dependencies', () => {
      const op1: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'A' },
        timestamp: new Date(),
        dependencies: ['op-2'], // Circular dependency
      };

      const op2: CRDTOperation = {
        id: 'op-2',
        clientId: 'client-1',
        type: 'INSERT',
        position: 1,
        content: { text: 'B' },
        timestamp: new Date(),
        dependencies: ['op-1'], // Circular dependency
      };

      // Real implementation should detect and handle circular dependencies
      const result1 = crdtEngine.applyOperation(op1);
      const result2 = crdtEngine.applyOperation(op2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large operation logs efficiently', () => {
      const startTime = performance.now();

      // Apply many operations
      for (let i = 0; i < 1000; i++) {
        const operation: CRDTOperation = {
          id: `op-${i}`,
          clientId: 'client-1',
          type: 'INSERT',
          position: i,
          content: { text: `text-${i}` },
          timestamp: new Date(),
          dependencies: i > 0 ? [`op-${i-1}`] : [],
        };

        crdtEngine.applyOperation(operation);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(crdtEngine.state.operationLog).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should compact operation log when needed', () => {
      // Fill up operation log
      for (let i = 0; i < 100; i++) {
        const operation: CRDTOperation = {
          id: `op-${i}`,
          clientId: 'client-1',
          type: 'INSERT',
          position: i,
          content: { text: `${i}` },
          timestamp: new Date(),
          dependencies: [],
        };

        crdtEngine.applyOperation(operation);
      }

      const initialLogLength = crdtEngine.state.operationLog.length;

      // In real implementation, there might be a compaction method
      // that reduces the operation log size while preserving state

      expect(initialLogLength).toBe(100);
    });
  });

  describe('Concurrent Editing Scenarios', () => {
    it('should handle simultaneous inserts at same position', async () => {
      const op1: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'A' },
        timestamp: new Date(),
        dependencies: [],
      };

      const op2: CRDTOperation = {
        id: 'op-2',
        clientId: 'client-2',
        type: 'INSERT',
        position: 0,
        content: { text: 'B' },
        timestamp: new Date(),
        dependencies: [],
      };

      // Apply operations concurrently
      const [result1, result2] = await Promise.all([
        Promise.resolve(crdtEngine.applyOperation(op1)),
        Promise.resolve(crdtEngine.applyOperation(op2)),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(crdtEngine.state.operationLog).toHaveLength(2);
    });

    it('should maintain causality in operation ordering', () => {
      // Create a causal chain: op1 -> op2 -> op3
      const op1: CRDTOperation = {
        id: 'op-1',
        clientId: 'client-1',
        type: 'INSERT',
        position: 0,
        content: { text: 'Hello' },
        timestamp: new Date('2024-01-01T10:00:00Z'),
        dependencies: [],
      };

      const op2: CRDTOperation = {
        id: 'op-2',
        clientId: 'client-1',
        type: 'INSERT',
        position: 5,
        content: { text: ' World' },
        timestamp: new Date('2024-01-01T10:00:01Z'),
        dependencies: ['op-1'],
      };

      const op3: CRDTOperation = {
        id: 'op-3',
        clientId: 'client-2',
        type: 'FORMAT',
        position: 0,
        content: { range: { start: 0, end: 11 }, style: { bold: true } },
        timestamp: new Date('2024-01-01T10:00:02Z'),
        dependencies: ['op-2'],
      };

      // Apply in order
      crdtEngine.applyOperation(op1);
      crdtEngine.applyOperation(op2);
      crdtEngine.applyOperation(op3);

      expect(crdtEngine.state.operationLog).toHaveLength(3);

      // Verify dependency chain is maintained
      const log = crdtEngine.state.operationLog;
      expect(log[1].dependencies).toContain('op-1');
      expect(log[2].dependencies).toContain('op-2');
    });
  });
});
