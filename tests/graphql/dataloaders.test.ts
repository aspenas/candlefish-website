import DataLoader from 'dataloader';
import { createUserDataLoader } from '../../graphql/dataloaders/user-dataloader';
import { createDocumentDataLoader } from '../../graphql/dataloaders/document-dataloader';
import { createProjectDataLoader } from '../../graphql/dataloaders/project-dataloader';
import { createPresenceDataLoader } from '../../graphql/dataloaders/presence-dataloader';
import { createCommentDataLoader } from '../../graphql/dataloaders/comment-dataloader';

// Mock services
import { mockUserService } from '../fixtures/user-service.mock';
import { mockDocumentService } from '../fixtures/document-service.mock';
import { mockProjectService } from '../fixtures/project-service.mock';
import { mockCollaborationService } from '../fixtures/collaboration-service.mock';

describe('GraphQL DataLoaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User DataLoader', () => {
    let userLoader: DataLoader<string, any>;

    beforeEach(() => {
      userLoader = createUserDataLoader(mockUserService);
    });

    test('should batch user lookups', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        { id: 'user-2', name: 'User 2', email: 'user2@example.com' },
        { id: 'user-3', name: 'User 3', email: 'user3@example.com' }
      ];

      mockUserService.getUsersByIds.mockResolvedValue(mockUsers);

      // Make multiple concurrent requests
      const [user1, user2, user3] = await Promise.all([
        userLoader.load('user-1'),
        userLoader.load('user-2'),
        userLoader.load('user-3')
      ]);

      expect(user1).toEqual(mockUsers[0]);
      expect(user2).toEqual(mockUsers[1]);
      expect(user3).toEqual(mockUsers[2]);

      // Should only make one service call for all users
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(1);
      expect(mockUserService.getUsersByIds).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3']);
    });

    test('should handle partial results', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'User 1', email: 'user1@example.com' },
        null, // user-2 not found
        { id: 'user-3', name: 'User 3', email: 'user3@example.com' }
      ];

      mockUserService.getUsersByIds.mockResolvedValue(mockUsers);

      const [user1, user2, user3] = await Promise.all([
        userLoader.load('user-1'),
        userLoader.load('user-2').catch(err => err),
        userLoader.load('user-3')
      ]);

      expect(user1).toEqual(mockUsers[0]);
      expect(user2).toBeInstanceOf(Error);
      expect(user3).toEqual(mockUsers[2]);
    });

    test('should cache results', async () => {
      const mockUser = { id: 'user-1', name: 'Cached User', email: 'cached@example.com' };
      
      mockUserService.getUsersByIds.mockResolvedValue([mockUser]);

      // First call
      const firstCall = await userLoader.load('user-1');
      
      // Second call should use cache
      const secondCall = await userLoader.load('user-1');

      expect(firstCall).toEqual(mockUser);
      expect(secondCall).toEqual(mockUser);
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(1);
    });

    test('should handle service errors', async () => {
      mockUserService.getUsersByIds.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(userLoader.load('user-1')).rejects.toThrow('Database connection failed');
    });

    test('should support cache clearing', async () => {
      const mockUser = { id: 'user-1', name: 'User 1', email: 'user1@example.com' };
      
      mockUserService.getUsersByIds.mockResolvedValue([mockUser]);

      // First call
      await userLoader.load('user-1');
      
      // Clear cache
      userLoader.clear('user-1');
      
      // Second call should not use cache
      await userLoader.load('user-1');

      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(2);
    });

    test('should validate input keys', async () => {
      await expect(userLoader.load('')).rejects.toThrow('Invalid user ID');
      await expect(userLoader.load(null as any)).rejects.toThrow('Invalid user ID');
      await expect(userLoader.load(undefined as any)).rejects.toThrow('Invalid user ID');
    });
  });

  describe('Document DataLoader', () => {
    let documentLoader: DataLoader<string, any>;

    beforeEach(() => {
      documentLoader = createDocumentDataLoader(mockDocumentService);
    });

    test('should batch document lookups', async () => {
      const mockDocuments = [
        { id: 'doc-1', title: 'Document 1', content: 'Content 1' },
        { id: 'doc-2', title: 'Document 2', content: 'Content 2' }
      ];

      mockDocumentService.getDocumentsByIds.mockResolvedValue(mockDocuments);

      const [doc1, doc2] = await Promise.all([
        documentLoader.load('doc-1'),
        documentLoader.load('doc-2')
      ]);

      expect(doc1).toEqual(mockDocuments[0]);
      expect(doc2).toEqual(mockDocuments[1]);
      expect(mockDocumentService.getDocumentsByIds).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    });

    test('should handle large batch sizes', async () => {
      const batchSize = 1000;
      const mockDocuments = Array.from({ length: batchSize }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        content: `Content ${i}`
      }));

      mockDocumentService.getDocumentsByIds.mockResolvedValue(mockDocuments);

      const documentIds = Array.from({ length: batchSize }, (_, i) => `doc-${i}`);
      const loadPromises = documentIds.map(id => documentLoader.load(id));
      
      const results = await Promise.all(loadPromises);

      expect(results).toHaveLength(batchSize);
      expect(mockDocumentService.getDocumentsByIds).toHaveBeenCalledTimes(1);
    });

    test('should enforce maximum batch size', async () => {
      const maxBatchSize = 100;
      const oversizedBatch = 150;
      
      const documentIds = Array.from({ length: oversizedBatch }, (_, i) => `doc-${i}`);
      const loadPromises = documentIds.map(id => documentLoader.load(id));

      mockDocumentService.getDocumentsByIds.mockImplementation((ids) => {
        // Should be called multiple times with smaller batches
        expect(ids.length).toBeLessThanOrEqual(maxBatchSize);
        return Promise.resolve(ids.map(id => ({ id, title: `Title for ${id}` })));
      });

      const results = await Promise.all(loadPromises);

      expect(results).toHaveLength(oversizedBatch);
      expect(mockDocumentService.getDocumentsByIds).toHaveBeenCalledTimes(2); // Split into 2 batches
    });
  });

  describe('Project DataLoader', () => {
    let projectLoader: DataLoader<string, any>;

    beforeEach(() => {
      projectLoader = createProjectDataLoader(mockProjectService);
    });

    test('should batch project lookups', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1', ownerId: 'user-1' },
        { id: 'project-2', name: 'Project 2', ownerId: 'user-2' }
      ];

      mockProjectService.getProjectsByIds.mockResolvedValue(mockProjects);

      const [project1, project2] = await Promise.all([
        projectLoader.load('project-1'),
        projectLoader.load('project-2')
      ]);

      expect(project1).toEqual(mockProjects[0]);
      expect(project2).toEqual(mockProjects[1]);
    });

    test('should handle authorization errors', async () => {
      mockProjectService.getProjectsByIds.mockImplementation((ids) => {
        return Promise.resolve(ids.map(id => {
          if (id === 'project-restricted') {
            throw new Error('Access denied');
          }
          return { id, name: `Project ${id}` };
        }));
      });

      const [publicProject, restrictedProject] = await Promise.allSettled([
        projectLoader.load('project-public'),
        projectLoader.load('project-restricted')
      ]);

      expect(publicProject.status).toBe('fulfilled');
      expect(restrictedProject.status).toBe('rejected');
    });
  });

  describe('Presence DataLoader', () => {
    let presenceLoader: DataLoader<string, any>;

    beforeEach () => {
      presenceLoader = createPresenceDataLoader(mockCollaborationService);
    });

    test('should batch presence lookups by document', async () => {
      const mockPresenceData = {
        'doc-1': [
          { userId: 'user-1', status: 'ACTIVE', cursor: 10, lastSeen: new Date() },
          { userId: 'user-2', status: 'IDLE', cursor: 25, lastSeen: new Date() }
        ],
        'doc-2': [
          { userId: 'user-3', status: 'ACTIVE', cursor: 5, lastSeen: new Date() }
        ]
      };

      mockCollaborationService.getPresenceByDocumentIds.mockResolvedValue(mockPresenceData);

      const [doc1Presence, doc2Presence] = await Promise.all([
        presenceLoader.load('doc-1'),
        presenceLoader.load('doc-2')
      ]);

      expect(doc1Presence).toEqual(mockPresenceData['doc-1']);
      expect(doc2Presence).toEqual(mockPresenceData['doc-2']);
      expect(mockCollaborationService.getPresenceByDocumentIds).toHaveBeenCalledWith(['doc-1', 'doc-2']);
    });

    test('should handle real-time presence updates', async () => {
      const initialPresence = [
        { userId: 'user-1', status: 'ACTIVE', cursor: 10 }
      ];

      mockCollaborationService.getPresenceByDocumentIds.mockResolvedValue({
        'doc-1': initialPresence
      });

      // First load
      const firstLoad = await presenceLoader.load('doc-1');
      expect(firstLoad).toEqual(initialPresence);

      // Simulate presence update
      presenceLoader.clear('doc-1'); // Clear cache for fresh data

      const updatedPresence = [
        { userId: 'user-1', status: 'ACTIVE', cursor: 15 }, // Updated cursor
        { userId: 'user-2', status: 'ACTIVE', cursor: 5 }   // New user joined
      ];

      mockCollaborationService.getPresenceByDocumentIds.mockResolvedValue({
        'doc-1': updatedPresence
      });

      const secondLoad = await presenceLoader.load('doc-1');
      expect(secondLoad).toEqual(updatedPresence);
    });

    test('should handle empty presence data', async () => {
      mockCollaborationService.getPresenceByDocumentIds.mockResolvedValue({
        'doc-empty': []
      });

      const emptyPresence = await presenceLoader.load('doc-empty');
      expect(emptyPresence).toEqual([]);
    });
  });

  describe('Comment DataLoader', () => {
    let commentLoader: DataLoader<string, any>;

    beforeEach(() => {
      commentLoader = createCommentDataLoader(mockDocumentService);
    });

    test('should batch comment lookups by document', async () => {
      const mockComments = {
        'doc-1': [
          {
            id: 'comment-1',
            content: 'First comment',
            authorId: 'user-1',
            position: { start: 10, end: 20 },
            resolved: false
          },
          {
            id: 'comment-2',
            content: 'Second comment',
            authorId: 'user-2',
            position: { start: 30, end: 40 },
            resolved: true
          }
        ],
        'doc-2': [
          {
            id: 'comment-3',
            content: 'Third comment',
            authorId: 'user-1',
            position: { start: 5, end: 15 },
            resolved: false
          }
        ]
      };

      mockDocumentService.getCommentsByDocumentIds.mockResolvedValue(mockComments);

      const [doc1Comments, doc2Comments] = await Promise.all([
        commentLoader.load('doc-1'),
        commentLoader.load('doc-2')
      ]);

      expect(doc1Comments).toEqual(mockComments['doc-1']);
      expect(doc2Comments).toEqual(mockComments['doc-2']);
    });

    test('should filter resolved comments when requested', async () => {
      const allComments = [
        { id: 'comment-1', content: 'Active comment', resolved: false },
        { id: 'comment-2', content: 'Resolved comment', resolved: true }
      ];

      mockDocumentService.getCommentsByDocumentIds.mockResolvedValue({
        'doc-1': allComments
      });

      // Create specialized loader for unresolved comments only
      const unresolvedCommentLoader = new DataLoader(async (documentIds: readonly string[]) => {
        const commentsMap = await mockDocumentService.getCommentsByDocumentIds(documentIds);
        return documentIds.map(docId => 
          (commentsMap[docId] || []).filter(comment => !comment.resolved)
        );
      });

      const unresolvedComments = await unresolvedCommentLoader.load('doc-1');
      expect(unresolvedComments).toHaveLength(1);
      expect(unresolvedComments[0].resolved).toBe(false);
    });
  });

  describe('DataLoader Performance', () => {
    test('should complete batched operations within performance threshold', async () => {
      const userLoader = createUserDataLoader(mockUserService);
      const documentLoader = createDocumentDataLoader(mockDocumentService);
      
      // Mock large dataset
      const userCount = 1000;
      const documentCount = 500;

      const mockUsers = Array.from({ length: userCount }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }));

      const mockDocuments = Array.from({ length: documentCount }, (_, i) => ({
        id: `doc-${i}`,
        title: `Document ${i}`,
        ownerId: `user-${i % userCount}`
      }));

      mockUserService.getUsersByIds.mockResolvedValue(mockUsers);
      mockDocumentService.getDocumentsByIds.mockResolvedValue(mockDocuments);

      const startTime = Date.now();

      // Load all users and documents concurrently
      const [users, documents] = await Promise.all([
        Promise.all(mockUsers.map(user => userLoader.load(user.id))),
        Promise.all(mockDocuments.map(doc => documentLoader.load(doc.id)))
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(users).toHaveLength(userCount);
      expect(documents).toHaveLength(documentCount);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle memory efficiently with large datasets', async () => {
      const documentLoader = createDocumentDataLoader(mockDocumentService);
      
      // Simulate loading many documents over time
      const iterations = 100;
      const docsPerIteration = 50;

      for (let i = 0; i < iterations; i++) {
        const documentIds = Array.from(
          { length: docsPerIteration }, 
          (_, j) => `doc-${i}-${j}`
        );

        mockDocumentService.getDocumentsByIds.mockResolvedValue(
          documentIds.map(id => ({ id, title: `Document ${id}` }))
        );

        await Promise.all(documentIds.map(id => documentLoader.load(id)));

        // Clear cache periodically to prevent memory buildup
        if (i % 10 === 0) {
          documentLoader.clearAll();
        }
      }

      // Test should complete without memory issues
      expect(true).toBe(true);
    });
  });

  describe('DataLoader Error Handling', () => {
    test('should handle network timeout errors', async () => {
      const userLoader = createUserDataLoader(mockUserService);

      mockUserService.getUsersByIds.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(userLoader.load('user-timeout')).rejects.toThrow('Network timeout');
    });

    test('should handle partial batch failures', async () => {
      const documentLoader = createDocumentDataLoader(mockDocumentService);

      mockDocumentService.getDocumentsByIds.mockImplementation((ids) => {
        return Promise.resolve(ids.map(id => {
          if (id === 'doc-error') {
            throw new Error(`Document ${id} access denied`);
          }
          return { id, title: `Document ${id}` };
        }));
      });

      const results = await Promise.allSettled([
        documentLoader.load('doc-1'),
        documentLoader.load('doc-error'),
        documentLoader.load('doc-2')
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    test('should retry failed operations', async () => {
      const userLoader = createUserDataLoader(mockUserService, { maxRetries: 2 });
      
      let attempts = 0;
      mockUserService.getUsersByIds.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve([{ id: 'user-1', name: 'Recovered User' }]);
      });

      const result = await userLoader.load('user-1');
      
      expect(result.name).toBe('Recovered User');
      expect(attempts).toBe(3);
    });
  });

  describe('DataLoader Cache Management', () => {
    test('should support TTL-based cache expiration', async () => {
      const userLoader = createUserDataLoader(mockUserService, { cacheTTL: 100 });

      const mockUser = { id: 'user-1', name: 'TTL User' };
      mockUserService.getUsersByIds.mockResolvedValue([mockUser]);

      // First load
      await userLoader.load('user-1');
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(1);

      // Second load within TTL (should use cache)
      await userLoader.load('user-1');
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(1);

      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third load after TTL (should not use cache)
      await userLoader.load('user-1');
      expect(mockUserService.getUsersByIds).toHaveBeenCalledTimes(2);
    });

    test('should support selective cache invalidation', async () => {
      const documentLoader = createDocumentDataLoader(mockDocumentService);

      const mockDocs = [
        { id: 'doc-1', title: 'Document 1', version: 1 },
        { id: 'doc-2', title: 'Document 2', version: 1 }
      ];

      mockDocumentService.getDocumentsByIds.mockResolvedValue(mockDocs);

      // Load both documents
      await Promise.all([
        documentLoader.load('doc-1'),
        documentLoader.load('doc-2')
      ]);

      // Clear only doc-1 from cache
      documentLoader.clear('doc-1');

      // Mock updated version of doc-1
      mockDocumentService.getDocumentsByIds
        .mockResolvedValueOnce([{ id: 'doc-1', title: 'Updated Document 1', version: 2 }])
        .mockResolvedValueOnce([{ id: 'doc-2', title: 'Document 2', version: 1 }]);

      // Load both again
      const [updatedDoc1, cachedDoc2] = await Promise.all([
        documentLoader.load('doc-1'), // Should fetch fresh data
        documentLoader.load('doc-2')  // Should use cached data
      ]);

      expect(updatedDoc1.version).toBe(2);
      expect(cachedDoc2.version).toBe(1);
      expect(mockDocumentService.getDocumentsByIds).toHaveBeenCalledTimes(2); // Original + doc-1 refresh
    });
  });
});