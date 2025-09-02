/**
 * Global types for the Collaboration Mobile App
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  organizationRole?: string;
}

export interface Document {
  id: string;
  name: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  content?: DocumentContent;
  crdtState?: CRDTState;
  owner: User;
  organization?: Organization;
  permissions: DocumentPermissions;
  sharing?: DocumentSharing;
  currentVersion?: DocumentVersion;
  presenceInfo?: PresenceInfo;
  lockInfo?: LockInfo;
  metrics?: DocumentMetrics;
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  lastViewedAt?: string;
}

export interface DocumentContent {
  format: string;
  data: any;
  blocks: ContentBlock[];
  length: number;
  html?: string;
  markdown?: string;
  plainText?: string;
  attachments?: Attachment[];
}

export interface ContentBlock {
  id: string;
  type: string;
  content: any;
  position: BlockPosition;
  styles?: any;
  attributes?: any;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockPosition {
  index: number;
  offset: number;
  length: number;
  depth: number;
}

export interface CRDTState {
  type: string;
  state: any;
  vectorClock: VectorClock;
  mergeable: boolean;
}

export interface VectorClock {
  clocks: Record<string, number>;
  version: number;
}

export interface DocumentPermissions {
  canRead: boolean;
  canWrite: boolean;
  canComment: boolean;
  canShare: boolean;
  canManage: boolean;
  canDelete: boolean;
  collaborators?: Collaborator[];
}

export interface Collaborator {
  user: User;
  permission: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface DocumentSharing {
  id: string;
  isPublic: boolean;
  shareUrl?: string;
  embedUrl?: string;
  allowAnonymous: boolean;
  allowComments: boolean;
  expiresAt?: string;
  maxViews?: number;
  currentViews: number;
}

export interface DocumentVersion {
  id: string;
  version: number;
  name?: string;
  description?: string;
  author: User;
  createdAt: string;
}

export interface PresenceInfo {
  totalUsers: number;
  activeUsers: number;
  viewers: number;
  editors: number;
}

export interface LockInfo {
  id: string;
  type: string;
  holder: User;
  blocks: string[];
  acquiredAt: string;
  expiresAt: string;
  waitingUsers: User[];
}

export interface DocumentMetrics {
  totalViews: number;
  uniqueViewers: number;
  totalEdits: number;
  uniqueEditors: number;
  totalComments: number;
  resolvedComments: number;
  activeThreads: number;
  averageLoadTime: number;
  averageSaveTime: number;
  timeInCollaboration: number;
  lastActivityAt: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  uploadedBy: User;
}

export interface PresenceSession {
  id: string;
  user: User;
  status: PresenceStatus;
  joinedAt: string;
  lastSeenAt: string;
  cursor?: Cursor;
  selection?: Selection;
  viewport?: Viewport;
  isTyping: boolean;
  isIdle: boolean;
  currentAction?: string;
  device?: DeviceInfo;
  connectionQuality?: ConnectionQuality;
  permissions: string[];
}

export interface Cursor {
  blockId: string;
  offset: number;
  x: number;
  y: number;
  height: number;
}

export interface Selection {
  start: SelectionPoint;
  end: SelectionPoint;
  text?: string;
  isCollapsed: boolean;
}

export interface SelectionPoint {
  blockId: string;
  offset: number;
  x: number;
  y: number;
}

export interface Viewport {
  scrollTop: number;
  scrollLeft: number;
  visibleBlocks: string[];
  zoom: number;
}

export interface DeviceInfo {
  type: string;
  os: string;
  browser: string;
  screenResolution: string;
  timezone: string;
  locale: string;
}

export interface ConnectionQuality {
  latency: number;
  bandwidth: number;
  connectionType: string;
  isStable: boolean;
}

export interface Activity {
  id: string;
  type: string;
  action: string;
  description: string;
  actor: User;
  actorType: string;
  targetType: string;
  targetId: string;
  target?: any;
  context?: any;
  metadata?: any;
  impact?: ActivityImpact;
  timestamp: string;
}

export interface ActivityImpact {
  severity: string;
  scope: string;
  affectedUsers: User[];
  changesCount: number;
}

export interface Comment {
  id: string;
  content: CommentContent;
  author: User;
  parentId?: string;
  replies?: Comment[];
  position?: BlockPosition;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentContent {
  text: string;
  html?: string;
  markdown?: string;
}

// Enums
export enum DocumentType {
  TEXT = 'TEXT',
  MARKDOWN = 'MARKDOWN',
  RICH_TEXT = 'RICH_TEXT',
  PRESENTATION = 'PRESENTATION',
  SPREADSHEET = 'SPREADSHEET',
  DIAGRAM = 'DIAGRAM',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export enum PresenceStatus {
  ONLINE = 'ONLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

// API Related Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  errors?: ApiError[];
  message?: string;
}

export interface ApiError {
  field?: string;
  message: string;
  code: string;
}

export interface PaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Connection<T> {
  nodes: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

// Offline Sync Types
export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  data: any;
  timestamp: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  error?: string;
}

export interface ConflictResolution {
  id: string;
  type: string;
  position: BlockPosition;
  localOperation: any;
  remoteOperation: any;
  suggested?: {
    strategy: string;
    resolution: any;
  };
  autoResolved: boolean;
  resolution?: any;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Document: { documentId: string };
  DocumentList: undefined;
  Search: { query?: string };
  Settings: undefined;
  Profile: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  Documents: undefined;
  Recent: undefined;
  Search: undefined;
  Profile: undefined;
};

export type DocumentStackParamList = {
  DocumentViewer: { documentId: string };
  DocumentEditor: { documentId: string };
  DocumentVersions: { documentId: string };
  DocumentShare: { documentId: string };
  DocumentSettings: { documentId: string };
};

// App State Types
export interface AppState {
  user?: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
  documents: Document[];
  currentDocument?: Document;
  offlineOperations: SyncOperation[];
  presenceSessions: PresenceSession[];
  networkStatus: NetworkStatus;
}

export interface NetworkStatus {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: any;
    h2: any;
    h3: any;
    body: any;
    caption: any;
  };
  borderRadius: number;
  shadows: {
    small: any;
    medium: any;
    large: any;
  };
}