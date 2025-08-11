/**
 * Test Data Factories for Collaboration Entities
 * Creates mock data for users, documents, comments, operations, and presence sessions
 */

import { faker } from '@faker-js/faker';

// Types for test data (would be imported from actual types in real implementation)
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  organizationId: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  maxUsers: number;
  currentUsers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  name: string;
  type: 'TEXT_DOCUMENT' | 'SPREADSHEET' | 'PRESENTATION';
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  content: DocumentContent;
  crdtState: CRDTState;
  ownerId: string;
  organizationId: string;
  permissions: DocumentPermissions;
  sharing?: DocumentSharing;
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
}

interface DocumentContent {
  format: 'PLAIN_TEXT' | 'RICH_TEXT' | 'MARKDOWN' | 'HTML';
  data: any;
  blocks: ContentBlock[];
  length: number;
}

interface ContentBlock {
  id: string;
  type: 'PARAGRAPH' | 'HEADING' | 'LIST_ITEM' | 'CODE_BLOCK';
  content: any;
  position: BlockPosition;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

interface BlockPosition {
  index: number;
  offset: number;
  length: number;
  depth: number;
}

interface CRDTState {
  type: 'YATA' | 'RGA' | 'LSEQ';
  state: any;
  vectorClock: VectorClock;
  operationLog: CRDTOperation[];
  mergeable: boolean;
}

interface VectorClock {
  clocks: Record<string, number>;
  version: number;
}

interface CRDTOperation {
  id: string;
  clientId: string;
  type: 'INSERT' | 'DELETE' | 'FORMAT' | 'MOVE';
  position: number;
  content: any;
  timestamp: string;
  dependencies: string[];
}

interface Operation {
  id: string;
  type: 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
  position: number;
  length?: number;
  content?: any;
  authorId: string;
  timestamp: string;
  transformedFroms: string[];
  applied: boolean;
}

interface Comment {
  id: string;
  documentId: string;
  content: CommentContent;
  authorId: string;
  parentId?: string;
  position?: CommentPosition;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  type: 'GENERAL' | 'SUGGESTION' | 'QUESTION' | 'ISSUE';
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface CommentContent {
  text: string;
  format: 'PLAIN_TEXT' | 'RICH_TEXT' | 'MARKDOWN';
  mentions: string[];
}

interface CommentPosition {
  blockId?: string;
  startOffset?: number;
  endOffset?: number;
  x?: number;
  y?: number;
}

interface Reaction {
  id: string;
  type: 'LIKE' | 'DISLIKE' | 'LOVE' | 'LAUGH';
  userId: string;
  createdAt: string;
}

interface PresenceSession {
  id: string;
  userId: string;
  documentId: string;
  status: 'ACTIVE' | 'AWAY' | 'IDLE' | 'OFFLINE';
  cursor?: CursorPosition;
  selection?: TextSelection;
  isTyping: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

interface CursorPosition {
  blockId: string;
  offset: number;
  x?: number;
  y?: number;
}

interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text?: string;
  isCollapsed: boolean;
}

interface DocumentPermissions {
  canRead: boolean;
  canWrite: boolean;
  canComment: boolean;
  canShare: boolean;
  canManage: boolean;
  canDelete: boolean;
}

interface DocumentSharing {
  id: string;
  isPublic: boolean;
  shareUrl?: string;
  allowAnonymous: boolean;
  allowComments: boolean;
  expiresAt?: string;
  maxViews?: number;
  currentViews: number;
}

/**
 * Test Data Factory Class
 * Provides methods to create mock data with realistic relationships
 */
export class CollaborationTestFactory {
  private static instance: CollaborationTestFactory;
  private organizations: Organization[] = [];
  private users: User[] = [];
  private documents: Document[] = [];
  private comments: Comment[] = [];
  private operations: Operation[] = [];
  private presenceSessions: PresenceSession[] = [];

  public static getInstance(): CollaborationTestFactory {
    if (!CollaborationTestFactory.instance) {
      CollaborationTestFactory.instance = new CollaborationTestFactory();
    }
    return CollaborationTestFactory.instance;
  }

  /**
   * Reset all test data
   */
  public reset(): void {
    this.organizations = [];
    this.users = [];
    this.documents = [];
    this.comments = [];
    this.operations = [];
    this.presenceSessions = [];
  }

  // Organization Factories
  public createOrganization(overrides: Partial<Organization> = {}): Organization {
    const organization: Organization = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
      plan: faker.helpers.arrayElement(['FREE', 'PREMIUM', 'ENTERPRISE']),
      maxUsers: faker.helpers.arrayElement([10, 50, 100, 500]),
      currentUsers: faker.number.int({ min: 1, max: 50 }),
      isActive: true,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    };

    this.organizations.push(organization);
    return organization;
  }

  public createOrganizations(count: number, overrides: Partial<Organization> = {}): Organization[] {
    return Array.from({ length: count }, () => this.createOrganization(overrides));
  }

  // User Factories
  public createUser(overrides: Partial<User> = {}): User {
    const organizationId = overrides.organizationId ||
      (this.organizations.length > 0 ? faker.helpers.arrayElement(this.organizations).id : this.createOrganization().id);

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    const user: User = {
      id: faker.string.uuid(),
      email: faker.internet.email({ firstName, lastName }),
      name: `${firstName} ${lastName}`,
      avatar: faker.helpers.maybe(() => faker.image.avatar()) || undefined,
      organizationId,
      role: faker.helpers.arrayElement(['ADMIN', 'USER', 'VIEWER']),
      isActive: faker.datatype.boolean(0.95), // 95% active
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    };

    this.users.push(user);
    return user;
  }

  public createUsers(count: number, organizationId?: string): User[] {
    return Array.from({ length: count }, () =>
      this.createUser(organizationId ? { organizationId } : {})
    );
  }

  public createCollaborationTeam(size: number = 5): { organization: Organization; users: User[] } {
    const organization = this.createOrganization();
    const users = this.createUsers(size, organization.id);

    // Ensure at least one admin
    users[0].role = 'ADMIN';

    return { organization, users };
  }

  // Document Factories
  public createDocument(overrides: Partial<Document> = {}): Document {
    const organizationId = overrides.organizationId ||
      (this.organizations.length > 0 ? faker.helpers.arrayElement(this.organizations).id : this.createOrganization().id);

    const ownerId = overrides.ownerId ||
      (this.users.length > 0 ? faker.helpers.arrayElement(this.users.filter(u => u.organizationId === organizationId)).id : this.createUser({ organizationId }).id);

    const blocks = this.createContentBlocks(faker.number.int({ min: 1, max: 5 }), ownerId);

    const document: Document = {
      id: faker.string.uuid(),
      name: faker.lorem.sentence({ min: 2, max: 6 }),
      type: faker.helpers.arrayElement(['TEXT_DOCUMENT', 'SPREADSHEET', 'PRESENTATION']),
      status: faker.helpers.arrayElement(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']),
      content: {
        format: 'RICH_TEXT',
        data: { version: '1.0' },
        blocks,
        length: blocks.reduce((total, block) => total + (block.content.text?.length || 0), 0),
      },
      crdtState: this.createCRDTState(),
      ownerId,
      organizationId,
      permissions: this.createDocumentPermissions(),
      sharing: faker.helpers.maybe(() => this.createDocumentSharing()) || undefined,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      lastEditedAt: faker.helpers.maybe(() => faker.date.recent().toISOString()) || undefined,
      ...overrides,
    };

    this.documents.push(document);
    return document;
  }

  public createDocuments(count: number, organizationId?: string): Document[] {
    return Array.from({ length: count }, () =>
      this.createDocument(organizationId ? { organizationId } : {})
    );
  }

  public createContentBlocks(count: number, authorId?: string): ContentBlock[] {
    return Array.from({ length: count }, (_, index) => ({
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['PARAGRAPH', 'HEADING', 'LIST_ITEM', 'CODE_BLOCK']),
      content: {
        text: faker.lorem.paragraph(),
        style: faker.helpers.maybe(() => ({ bold: faker.datatype.boolean() })) || {},
      },
      position: {
        index,
        offset: 0,
        length: faker.number.int({ min: 50, max: 200 }),
        depth: 0,
      },
      authorId: authorId || faker.string.uuid(),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
    }));
  }

  public createCRDTState(overrides: Partial<CRDTState> = {}): CRDTState {
    return {
      type: faker.helpers.arrayElement(['YATA', 'RGA', 'LSEQ']),
      state: { content: faker.lorem.text() },
      vectorClock: {
        clocks: Object.fromEntries(
          Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => [
            faker.string.uuid(),
            faker.number.int({ min: 0, max: 100 }),
          ])
        ),
        version: faker.number.int({ min: 0, max: 100 }),
      },
      operationLog: this.createCRDTOperations(faker.number.int({ min: 0, max: 10 })),
      mergeable: true,
      ...overrides,
    };
  }

  public createDocumentPermissions(overrides: Partial<DocumentPermissions> = {}): DocumentPermissions {
    return {
      canRead: true,
      canWrite: faker.datatype.boolean(0.8),
      canComment: faker.datatype.boolean(0.9),
      canShare: faker.datatype.boolean(0.6),
      canManage: faker.datatype.boolean(0.3),
      canDelete: faker.datatype.boolean(0.2),
      ...overrides,
    };
  }

  public createDocumentSharing(overrides: Partial<DocumentSharing> = {}): DocumentSharing {
    return {
      id: faker.string.uuid(),
      isPublic: faker.datatype.boolean(0.3),
      shareUrl: faker.helpers.maybe(() => faker.internet.url()) || undefined,
      allowAnonymous: faker.datatype.boolean(0.5),
      allowComments: faker.datatype.boolean(0.7),
      expiresAt: faker.helpers.maybe(() => faker.date.future().toISOString()) || undefined,
      maxViews: faker.helpers.maybe(() => faker.number.int({ min: 10, max: 1000 })) || undefined,
      currentViews: faker.number.int({ min: 0, max: 50 }),
      ...overrides,
    };
  }

  // Operation Factories
  public createOperation(overrides: Partial<Operation> = {}): Operation {
    const authorId = overrides.authorId ||
      (this.users.length > 0 ? faker.helpers.arrayElement(this.users).id : this.createUser().id);

    const operation: Operation = {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['INSERT', 'DELETE', 'REPLACE', 'FORMAT']),
      position: faker.number.int({ min: 0, max: 1000 }),
      length: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 50 })),
      content: {
        text: faker.lorem.words({ min: 1, max: 10 }),
        style: faker.helpers.maybe(() => ({ bold: faker.datatype.boolean() })),
      },
      authorId,
      timestamp: faker.date.recent().toISOString(),
      transformedFroms: [],
      applied: faker.datatype.boolean(0.9),
      ...overrides,
    };

    this.operations.push(operation);
    return operation;
  }

  public createOperations(count: number, documentId?: string): Operation[] {
    return Array.from({ length: count }, () =>
      this.createOperation(documentId ? { documentId } : {})
    );
  }

  public createCRDTOperation(overrides: Partial<CRDTOperation> = {}): CRDTOperation {
    return {
      id: faker.string.uuid(),
      clientId: faker.string.uuid(),
      type: faker.helpers.arrayElement(['INSERT', 'DELETE', 'FORMAT', 'MOVE']),
      position: faker.number.int({ min: 0, max: 1000 }),
      content: {
        text: faker.lorem.words({ min: 1, max: 5 }),
      },
      timestamp: faker.date.recent().toISOString(),
      dependencies: [],
      ...overrides,
    };
  }

  public createCRDTOperations(count: number): CRDTOperation[] {
    return Array.from({ length: count }, () => this.createCRDTOperation());
  }

  public createOperationSequence(count: number, documentId: string, userIds: string[]): Operation[] {
    const operations: Operation[] = [];
    let position = 0;

    for (let i = 0; i < count; i++) {
      const authorId = faker.helpers.arrayElement(userIds);
      const type = faker.helpers.arrayElement(['INSERT', 'DELETE', 'REPLACE']);

      let operation: Operation;

      if (type === 'INSERT') {
        const text = faker.lorem.words({ min: 1, max: 5 });
        operation = this.createOperation({
          type: 'INSERT',
          position,
          content: { text },
          authorId,
          length: text.length,
        });
        position += text.length;
      } else if (type === 'DELETE') {
        const deleteLength = Math.min(faker.number.int({ min: 1, max: 10 }), position);
        operation = this.createOperation({
          type: 'DELETE',
          position: Math.max(0, position - deleteLength),
          length: deleteLength,
          authorId,
        });
        position = Math.max(0, position - deleteLength);
      } else { // REPLACE
        const text = faker.lorem.words({ min: 1, max: 3 });
        const replaceLength = Math.min(faker.number.int({ min: 1, max: 5 }), position);
        operation = this.createOperation({
          type: 'REPLACE',
          position: Math.max(0, position - replaceLength),
          length: replaceLength,
          content: { text },
          authorId,
        });
        position = position - replaceLength + text.length;
      }

      operations.push(operation);
    }

    return operations;
  }

  // Comment Factories
  public createComment(overrides: Partial<Comment> = {}): Comment {
    const documentId = overrides.documentId ||
      (this.documents.length > 0 ? faker.helpers.arrayElement(this.documents).id : this.createDocument().id);

    const authorId = overrides.authorId ||
      (this.users.length > 0 ? faker.helpers.arrayElement(this.users).id : this.createUser().id);

    const comment: Comment = {
      id: faker.string.uuid(),
      documentId,
      content: {
        text: faker.lorem.paragraph(),
        format: 'PLAIN_TEXT',
        mentions: faker.helpers.maybe(() =>
          faker.helpers.arrayElements(this.users.map(u => u.id), { min: 0, max: 3 })
        ) || [],
      },
      authorId,
      parentId: faker.helpers.maybe(() => faker.string.uuid()) || undefined,
      position: faker.helpers.maybe(() => ({
        blockId: faker.string.uuid(),
        startOffset: faker.number.int({ min: 0, max: 100 }),
        endOffset: faker.number.int({ min: 100, max: 200 }),
      })) || undefined,
      status: faker.helpers.arrayElement(['ACTIVE', 'RESOLVED', 'DISMISSED']),
      priority: faker.helpers.arrayElement(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
      type: faker.helpers.arrayElement(['GENERAL', 'SUGGESTION', 'QUESTION', 'ISSUE']),
      reactions: this.createReactions(faker.number.int({ min: 0, max: 5 })),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      resolvedAt: faker.helpers.maybe(() => faker.date.recent().toISOString()) || undefined,
      resolvedBy: faker.helpers.maybe(() => faker.string.uuid()) || undefined,
      ...overrides,
    };

    this.comments.push(comment);
    return comment;
  }

  public createComments(count: number, documentId?: string): Comment[] {
    return Array.from({ length: count }, () =>
      this.createComment(documentId ? { documentId } : {})
    );
  }

  public createCommentThread(depth: number = 3, documentId?: string): Comment[] {
    const rootComment = this.createComment({ documentId, parentId: undefined });
    const thread = [rootComment];

    let parentId = rootComment.id;
    for (let i = 1; i < depth; i++) {
      const reply = this.createComment({ documentId, parentId });
      thread.push(reply);
      parentId = reply.id;
    }

    return thread;
  }

  public createReactions(count: number): Reaction[] {
    return Array.from({ length: count }, () => ({
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['LIKE', 'DISLIKE', 'LOVE', 'LAUGH']),
      userId: this.users.length > 0 ? faker.helpers.arrayElement(this.users).id : faker.string.uuid(),
      createdAt: faker.date.recent().toISOString(),
    }));
  }

  // Presence Factories
  public createPresenceSession(overrides: Partial<PresenceSession> = {}): PresenceSession {
    const userId = overrides.userId ||
      (this.users.length > 0 ? faker.helpers.arrayElement(this.users).id : this.createUser().id);

    const documentId = overrides.documentId ||
      (this.documents.length > 0 ? faker.helpers.arrayElement(this.documents).id : this.createDocument().id);

    const session: PresenceSession = {
      id: faker.string.uuid(),
      userId,
      documentId,
      status: faker.helpers.arrayElement(['ACTIVE', 'AWAY', 'IDLE', 'OFFLINE']),
      cursor: faker.helpers.maybe(() => ({
        blockId: faker.string.uuid(),
        offset: faker.number.int({ min: 0, max: 100 }),
        x: faker.number.float({ min: 0, max: 1000 }),
        y: faker.number.float({ min: 0, max: 600 }),
      })) || undefined,
      selection: faker.helpers.maybe(() => {
        const startOffset = faker.number.int({ min: 0, max: 50 });
        const endOffset = startOffset + faker.number.int({ min: 0, max: 50 });
        return {
          start: {
            blockId: faker.string.uuid(),
            offset: startOffset,
          },
          end: {
            blockId: faker.string.uuid(),
            offset: endOffset,
          },
          text: faker.lorem.words({ min: 1, max: 5 }),
          isCollapsed: startOffset === endOffset,
        };
      }) || undefined,
      isTyping: faker.datatype.boolean(0.3),
      joinedAt: faker.date.recent().toISOString(),
      lastSeenAt: faker.date.recent().toISOString(),
      ...overrides,
    };

    this.presenceSessions.push(session);
    return session;
  }

  public createPresenceSessions(count: number, documentId?: string): PresenceSession[] {
    return Array.from({ length: count }, () =>
      this.createPresenceSession(documentId ? { documentId } : {})
    );
  }

  public createActiveCollaborationSession(documentId: string, userIds: string[]): PresenceSession[] {
    return userIds.map(userId => this.createPresenceSession({
      userId,
      documentId,
      status: 'ACTIVE',
      joinedAt: faker.date.recent({ days: 1 }).toISOString(),
      lastSeenAt: faker.date.recent({ days: 0.1 }).toISOString(),
    }));
  }

  // Complex Scenario Factories
  public createCollaborationScenario(options: {
    userCount?: number;
    documentCount?: number;
    commentCount?: number;
    operationCount?: number;
  } = {}): {
    organization: Organization;
    users: User[];
    documents: Document[];
    comments: Comment[];
    operations: Operation[];
    presenceSessions: PresenceSession[];
  } {
    const {
      userCount = 5,
      documentCount = 3,
      commentCount = 10,
      operationCount = 20,
    } = options;

    // Create organization and users
    const organization = this.createOrganization();
    const users = this.createUsers(userCount, organization.id);

    // Create documents
    const documents = Array.from({ length: documentCount }, () =>
      this.createDocument({
        organizationId: organization.id,
        ownerId: faker.helpers.arrayElement(users).id,
      })
    );

    // Create comments distributed across documents
    const comments = Array.from({ length: commentCount }, () =>
      this.createComment({
        documentId: faker.helpers.arrayElement(documents).id,
        authorId: faker.helpers.arrayElement(users).id,
      })
    );

    // Create operations distributed across documents
    const operations = Array.from({ length: operationCount }, () =>
      this.createOperation({
        authorId: faker.helpers.arrayElement(users).id,
      })
    );

    // Create presence sessions for active collaboration
    const presenceSessions = documents.flatMap(document =>
      faker.helpers.arrayElements(users, { min: 1, max: 3 }).map(user =>
        this.createPresenceSession({
          userId: user.id,
          documentId: document.id,
          status: 'ACTIVE',
        })
      )
    );

    return {
      organization,
      users,
      documents,
      comments,
      operations,
      presenceSessions,
    };
  }

  public createConflictScenario(documentId: string, userIds: string[]): Operation[] {
    // Create conflicting operations at the same position
    const position = faker.number.int({ min: 0, max: 100 });

    return userIds.map(userId => this.createOperation({
      type: 'INSERT',
      position,
      content: { text: faker.lorem.words({ min: 1, max: 3 }) },
      authorId: userId,
      timestamp: faker.date.recent().toISOString(),
    }));
  }

  public createOfflineOperations(userId: string, count: number): Operation[] {
    return Array.from({ length: count }, (_, index) =>
      this.createOperation({
        authorId: userId,
        applied: false, // Not yet synced
        timestamp: faker.date.recent().toISOString(),
        clientId: `offline-${userId}-${index}`,
      })
    );
  }

  // Getters for created data
  public getOrganizations(): Organization[] { return [...this.organizations]; }
  public getUsers(): User[] { return [...this.users]; }
  public getDocuments(): Document[] { return [...this.documents]; }
  public getComments(): Comment[] { return [...this.comments]; }
  public getOperations(): Operation[] { return [...this.operations]; }
  public getPresenceSessions(): PresenceSession[] { return [...this.presenceSessions]; }

  // Find methods
  public findUsersByOrganization(organizationId: string): User[] {
    return this.users.filter(user => user.organizationId === organizationId);
  }

  public findDocumentsByOrganization(organizationId: string): Document[] {
    return this.documents.filter(doc => doc.organizationId === organizationId);
  }

  public findCommentsByDocument(documentId: string): Comment[] {
    return this.comments.filter(comment => comment.documentId === documentId);
  }

  public findPresenceByDocument(documentId: string): PresenceSession[] {
    return this.presenceSessions.filter(session => session.documentId === documentId);
  }
}

// Export singleton instance
export const testFactory = CollaborationTestFactory.getInstance();

// Export individual factory functions for convenience
export const createOrganization = (overrides?: Partial<Organization>) => testFactory.createOrganization(overrides);
export const createUser = (overrides?: Partial<User>) => testFactory.createUser(overrides);
export const createDocument = (overrides?: Partial<Document>) => testFactory.createDocument(overrides);
export const createComment = (overrides?: Partial<Comment>) => testFactory.createComment(overrides);
export const createOperation = (overrides?: Partial<Operation>) => testFactory.createOperation(overrides);
export const createPresenceSession = (overrides?: Partial<PresenceSession>) => testFactory.createPresenceSession(overrides);
export const createCollaborationScenario = (options?: any) => testFactory.createCollaborationScenario(options);
export const createConflictScenario = (documentId: string, userIds: string[]) => testFactory.createConflictScenario(documentId, userIds);

// Export reset function
export const resetTestData = () => testFactory.reset();
