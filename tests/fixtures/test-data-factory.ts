import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

// Base interfaces
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'editor' | 'viewer';
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'rich-text' | 'plain-text';
  status: 'draft' | 'active' | 'archived' | 'deleted';
  ownerId: string;
  projectId?: string;
  permissions: DocumentPermissions;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
  version: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings: ProjectSettings;
  members: ProjectMember[];
  createdAt: Date;
  updatedAt: Date;
}

interface Operation {
  id: string;
  type: 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
  documentId: string;
  userId: string;
  position: number;
  length?: number;
  content?: string;
  attributes?: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

interface Comment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  position: CommentPosition;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  replies: CommentReply[];
  createdAt: Date;
  updatedAt: Date;
}

// Supporting interfaces
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  editor: EditorSettings;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  comments: boolean;
  documents: boolean;
}

interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  tabSize: number;
  wordWrap: boolean;
  spellcheck: boolean;
  vim: boolean;
}

interface DocumentPermissions {
  isPublic: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  requireAuth: boolean;
}

interface DocumentMetadata {
  wordCount: number;
  characterCount: number;
  readingTime: number;
  tags: string[];
  language?: string;
}

interface ProjectSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  autoSave: boolean;
  versionLimit: number;
  collaborationMode: 'real-time' | 'turn-based' | 'asynchronous';
}

interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: string;
}

interface CommentPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

interface CommentReply {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
}

// Test Data Factory Class
export class TestDataFactory {
  private users: User[] = [];
  private documents: Document[] = [];
  private projects: Project[] = [];
  private operations: Operation[] = [];
  private comments: Comment[] = [];

  // User factory methods
  createUser(overrides: Partial<User> = {}): User {
    const user: User = {
      id: uuidv4(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      role: faker.helpers.arrayElement(['user', 'admin', 'editor', 'viewer']),
      preferences: this.createUserPreferences(),
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent({ days: 30 }),
      ...overrides
    };
    
    this.users.push(user);
    return user;
  }

  createUserBatch(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  createAdminUser(overrides: Partial<User> = {}): User {
    return this.createUser({ role: 'admin', ...overrides });
  }

  createTestUsers(): { admin: User; editor: User; viewer: User; regular: User } {
    return {
      admin: this.createUser({ 
        role: 'admin', 
        email: 'admin@test.com',
        name: 'Test Admin'
      }),
      editor: this.createUser({ 
        role: 'editor', 
        email: 'editor@test.com',
        name: 'Test Editor'
      }),
      viewer: this.createUser({ 
        role: 'viewer', 
        email: 'viewer@test.com',
        name: 'Test Viewer'
      }),
      regular: this.createUser({ 
        role: 'user', 
        email: 'user@test.com',
        name: 'Test User'
      })
    };
  }

  private createUserPreferences(): UserPreferences {
    return {
      theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
      language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'ja']),
      notifications: {
        email: faker.datatype.boolean(),
        push: faker.datatype.boolean(),
        mentions: faker.datatype.boolean(),
        comments: faker.datatype.boolean(),
        documents: faker.datatype.boolean()
      },
      editor: {
        fontSize: faker.helpers.arrayElement([12, 14, 16, 18]),
        lineHeight: faker.number.float({ min: 1.2, max: 2.0, multipleOf: 0.1 }),
        tabSize: faker.helpers.arrayElement([2, 4, 8]),
        wordWrap: faker.datatype.boolean(),
        spellcheck: faker.datatype.boolean(),
        vim: faker.datatype.boolean()
      }
    };
  }

  // Document factory methods
  createDocument(overrides: Partial<Document> = {}): Document {
    const wordCount = faker.number.int({ min: 50, max: 5000 });
    const characterCount = wordCount * faker.number.int({ min: 4, max: 8 });
    
    const document: Document = {
      id: uuidv4(),
      title: faker.lorem.sentence({ min: 2, max: 8 }),
      content: this.generateDocumentContent(overrides.type || 'markdown'),
      type: faker.helpers.arrayElement(['markdown', 'rich-text', 'plain-text']),
      status: faker.helpers.arrayElement(['draft', 'active', 'archived']),
      ownerId: this.getRandomUserId(),
      projectId: Math.random() > 0.3 ? this.getRandomProjectId() : undefined,
      permissions: this.createDocumentPermissions(),
      metadata: {
        wordCount,
        characterCount,
        readingTime: Math.ceil(wordCount / 200), // ~200 words per minute
        tags: faker.lorem.words({ min: 1, max: 5 }).split(' '),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de'])
      },
      version: faker.number.int({ min: 1, max: 50 }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 7 }),
      lastModified: faker.date.recent({ days: 3 }),
      ...overrides
    };
    
    this.documents.push(document);
    return document;
  }

  createDocumentBatch(count: number, overrides: Partial<Document> = {}): Document[] {
    return Array.from({ length: count }, () => this.createDocument(overrides));
  }

  createCollaborativeDocument(users: User[]): Document {
    const owner = faker.helpers.arrayElement(users);
    return this.createDocument({
      ownerId: owner.id,
      permissions: { isPublic: true, allowComments: true, allowDownload: true, requireAuth: false },
      status: 'active'
    });
  }

  private generateDocumentContent(type: 'markdown' | 'rich-text' | 'plain-text'): string {
    const paragraphs = faker.number.int({ min: 2, max: 10 });
    
    switch (type) {
      case 'markdown':
        return this.generateMarkdownContent(paragraphs);
      case 'rich-text':
        return JSON.stringify(this.generateRichTextContent(paragraphs));
      case 'plain-text':
      default:
        return faker.lorem.paragraphs(paragraphs, '\n\n');
    }
  }

  private generateMarkdownContent(paragraphs: number): string {
    let content = `# ${faker.lorem.sentence()}\n\n`;
    
    for (let i = 0; i < paragraphs; i++) {
      if (Math.random() > 0.7) {
        content += `## ${faker.lorem.sentence({ min: 2, max: 5 })}\n\n`;
      }
      
      content += faker.lorem.paragraph() + '\n\n';
      
      if (Math.random() > 0.8) {
        content += '```javascript\n';
        content += `function ${faker.hacker.noun()}() {\n`;
        content += `  return "${faker.hacker.phrase()}";\n`;
        content += '}\n```\n\n';
      }
      
      if (Math.random() > 0.9) {
        content += '- ' + faker.lorem.sentences(3, '\n- ') + '\n\n';
      }
    }
    
    return content;
  }

  private generateRichTextContent(paragraphs: number): any {
    const blocks = [];
    
    blocks.push({
      key: uuidv4().substring(0, 5),
      text: faker.lorem.sentence(),
      type: 'header-one',
      depth: 0,
      inlineStyleRanges: [],
      entityRanges: [],
      data: {}
    });
    
    for (let i = 0; i < paragraphs; i++) {
      const text = faker.lorem.paragraph();
      const block = {
        key: uuidv4().substring(0, 5),
        text,
        type: faker.helpers.arrayElement(['paragraph', 'blockquote', 'unordered-list-item']),
        depth: 0,
        inlineStyleRanges: this.generateInlineStyles(text),
        entityRanges: [],
        data: {}
      };
      
      blocks.push(block);
    }
    
    return { blocks, entityMap: {} };
  }

  private generateInlineStyles(text: string): any[] {
    const styles = [];
    const words = text.split(' ');
    
    // Add some random bold/italic styling
    for (let i = 0; i < Math.min(3, words.length); i++) {
      const wordIndex = faker.number.int({ min: 0, max: words.length - 1 });
      const word = words[wordIndex];
      const offset = text.indexOf(word);
      
      if (offset >= 0) {
        styles.push({
          offset,
          length: word.length,
          style: faker.helpers.arrayElement(['BOLD', 'ITALIC', 'UNDERLINE'])
        });
      }
    }
    
    return styles;
  }

  private createDocumentPermissions(): DocumentPermissions {
    return {
      isPublic: faker.datatype.boolean({ probability: 0.3 }),
      allowComments: faker.datatype.boolean({ probability: 0.8 }),
      allowDownload: faker.datatype.boolean({ probability: 0.7 }),
      requireAuth: faker.datatype.boolean({ probability: 0.6 })
    };
  }

  // Project factory methods
  createProject(overrides: Partial<Project> = {}): Project {
    const project: Project = {
      id: uuidv4(),
      name: faker.company.name() + ' Project',
      description: faker.company.catchPhrase(),
      ownerId: this.getRandomUserId(),
      settings: this.createProjectSettings(),
      members: [],
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 14 }),
      ...overrides
    };
    
    // Add some random members
    const memberCount = faker.number.int({ min: 1, max: 8 });
    for (let i = 0; i < memberCount; i++) {
      project.members.push({
        userId: this.getRandomUserId(),
        role: faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
        addedAt: faker.date.recent({ days: 30 }),
        addedBy: project.ownerId
      });
    }
    
    this.projects.push(project);
    return project;
  }

  createProjectBatch(count: number, overrides: Partial<Project> = {}): Project[] {
    return Array.from({ length: count }, () => this.createProject(overrides));
  }

  private createProjectSettings(): ProjectSettings {
    return {
      isPublic: faker.datatype.boolean({ probability: 0.2 }),
      allowInvitations: faker.datatype.boolean({ probability: 0.8 }),
      autoSave: faker.datatype.boolean({ probability: 0.9 }),
      versionLimit: faker.helpers.arrayElement([10, 25, 50, 100]),
      collaborationMode: faker.helpers.arrayElement(['real-time', 'turn-based', 'asynchronous'])
    };
  }

  // Operation factory methods
  createOperation(overrides: Partial<Operation> = {}): Operation {
    const operation: Operation = {
      id: uuidv4(),
      type: faker.helpers.arrayElement(['INSERT', 'DELETE', 'REPLACE', 'FORMAT']),
      documentId: this.getRandomDocumentId(),
      userId: this.getRandomUserId(),
      position: faker.number.int({ min: 0, max: 1000 }),
      timestamp: faker.date.recent({ days: 1 }),
      acknowledged: faker.datatype.boolean({ probability: 0.9 }),
      ...overrides
    };
    
    // Add type-specific properties
    switch (operation.type) {
      case 'INSERT':
        operation.content = faker.lorem.words({ min: 1, max: 10 });
        break;
      case 'DELETE':
        operation.length = faker.number.int({ min: 1, max: 50 });
        break;
      case 'REPLACE':
        operation.length = faker.number.int({ min: 1, max: 20 });
        operation.content = faker.lorem.words({ min: 1, max: 15 });
        break;
      case 'FORMAT':
        operation.length = faker.number.int({ min: 1, max: 30 });
        operation.attributes = {
          style: faker.helpers.arrayElement(['bold', 'italic', 'underline']),
          color: faker.color.rgb()
        };
        break;
    }
    
    this.operations.push(operation);
    return operation;
  }

  createOperationSequence(documentId: string, count: number): Operation[] {
    const operations = [];
    let position = 0;
    
    for (let i = 0; i < count; i++) {
      const operation = this.createOperation({
        documentId,
        timestamp: new Date(Date.now() + i * 1000) // 1 second apart
      });
      
      // Adjust position based on previous operations
      operation.position = position;
      
      if (operation.type === 'INSERT' && operation.content) {
        position += operation.content.length;
      } else if (operation.type === 'DELETE' && operation.length) {
        position = Math.max(0, position - operation.length);
      }
      
      operations.push(operation);
    }
    
    return operations;
  }

  // Comment factory methods
  createComment(overrides: Partial<Comment> = {}): Comment {
    const comment: Comment = {
      id: uuidv4(),
      documentId: this.getRandomDocumentId(),
      userId: this.getRandomUserId(),
      content: faker.lorem.sentences({ min: 1, max: 3 }),
      position: {
        start: faker.number.int({ min: 0, max: 500 }),
        end: faker.number.int({ min: 501, max: 1000 })
      },
      resolved: faker.datatype.boolean({ probability: 0.3 }),
      replies: [],
      createdAt: faker.date.recent({ days: 7 }),
      updatedAt: faker.date.recent({ days: 3 }),
      ...overrides
    };
    
    // Add resolved metadata if resolved
    if (comment.resolved) {
      comment.resolvedBy = this.getRandomUserId();
      comment.resolvedAt = faker.date.recent({ days: 2 });
    }
    
    // Add some replies
    const replyCount = faker.number.int({ min: 0, max: 5 });
    for (let i = 0; i < replyCount; i++) {
      comment.replies.push({
        id: uuidv4(),
        userId: this.getRandomUserId(),
        content: faker.lorem.sentence(),
        createdAt: faker.date.recent({ days: 5 })
      });
    }
    
    this.comments.push(comment);
    return comment;
  }

  // Utility methods
  private getRandomUserId(): string {
    if (this.users.length === 0) {
      return this.createUser().id;
    }
    return faker.helpers.arrayElement(this.users).id;
  }

  private getRandomDocumentId(): string {
    if (this.documents.length === 0) {
      return this.createDocument().id;
    }
    return faker.helpers.arrayElement(this.documents).id;
  }

  private getRandomProjectId(): string {
    if (this.projects.length === 0) {
      return this.createProject().id;
    }
    return faker.helpers.arrayElement(this.projects).id;
  }

  // Scenario builders
  createCollaborationScenario(): {
    users: User[];
    project: Project;
    document: Document;
    operations: Operation[];
    comments: Comment[];
  } {
    const users = this.createUserBatch(5);
    const owner = users[0];
    
    const project = this.createProject({
      ownerId: owner.id,
      members: users.slice(1).map(user => ({
        userId: user.id,
        role: faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
        addedAt: faker.date.recent({ days: 30 }),
        addedBy: owner.id
      }))
    });
    
    const document = this.createDocument({
      ownerId: owner.id,
      projectId: project.id,
      status: 'active',
      permissions: { isPublic: false, allowComments: true, allowDownload: true, requireAuth: true }
    });
    
    const operations = this.createOperationSequence(document.id, 20);
    
    const comments = Array.from({ length: 5 }, () => 
      this.createComment({ documentId: document.id })
    );
    
    return { users, project, document, operations, comments };
  }

  createLoadTestData(userCount: number, documentCount: number): {
    users: User[];
    documents: Document[];
    operations: Operation[][];
  } {
    const users = this.createUserBatch(userCount);
    const documents = this.createDocumentBatch(documentCount, { status: 'active' });
    
    const operations = documents.map(doc => 
      this.createOperationSequence(doc.id, faker.number.int({ min: 10, max: 100 }))
    );
    
    return { users, documents, operations };
  }

  // Data access methods
  getUsers(): User[] {
    return [...this.users];
  }

  getDocuments(): Document[] {
    return [...this.documents];
  }

  getProjects(): Project[] {
    return [...this.projects];
  }

  getOperations(): Operation[] {
    return [...this.operations];
  }

  getComments(): Comment[] {
    return [...this.comments];
  }

  // Cleanup
  reset(): void {
    this.users = [];
    this.documents = [];
    this.projects = [];
    this.operations = [];
    this.comments = [];
  }

  // Export for seeding
  exportData(): {
    users: User[];
    documents: Document[];
    projects: Project[];
    operations: Operation[];
    comments: Comment[];
  } {
    return {
      users: this.getUsers(),
      documents: this.getDocuments(),
      projects: this.getProjects(),
      operations: this.getOperations(),
      comments: this.getComments()
    };
  }

  // Import for testing
  importData(data: {
    users?: User[];
    documents?: Document[];
    projects?: Project[];
    operations?: Operation[];
    comments?: Comment[];
  }): void {
    if (data.users) this.users = [...data.users];
    if (data.documents) this.documents = [...data.documents];
    if (data.projects) this.projects = [...data.projects];
    if (data.operations) this.operations = [...data.operations];
    if (data.comments) this.comments = [...data.comments];
  }
}

// Export singleton instance
export const testDataFactory = new TestDataFactory();