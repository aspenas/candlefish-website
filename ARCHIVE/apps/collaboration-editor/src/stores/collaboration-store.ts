import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import * as Y from 'yjs';

// Types for collaboration state
export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  status: 'active' | 'away' | 'idle';
  cursor?: {
    blockId: string;
    offset: number;
    x?: number;
    y?: number;
  };
  selection?: {
    start: { blockId: string; offset: number };
    end: { blockId: string; offset: number };
    text?: string;
  };
  isTyping: boolean;
  currentAction?: string;
  lastSeen: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: CollaborationUser;
  position?: {
    blockId: string;
    startOffset: number;
    endOffset: number;
  };
  thread?: {
    id: string;
    subject?: string;
    status: 'open' | 'resolved' | 'closed';
  };
  replies: Comment[];
  reactions: {
    type: string;
    users: string[];
  }[];
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentVersion {
  id: string;
  version: string;
  name?: string;
  description?: string;
  author: CollaborationUser;
  changes: {
    type: 'insert' | 'delete' | 'format' | 'move';
    position: number;
    content?: any;
    length?: number;
  }[];
  createdAt: Date;
  isCurrent: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'edit' | 'comment' | 'presence' | 'version' | 'share';
  action: string;
  description: string;
  actor: CollaborationUser;
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  timestamp: Date;
  impact: {
    severity: 'info' | 'low' | 'medium' | 'high';
    scope: 'personal' | 'document' | 'organization';
  };
}

export interface ConflictResolution {
  id: string;
  type: 'content' | 'format' | 'structure';
  localChange: any;
  remoteChange: any;
  suggestedResolution: any;
  status: 'pending' | 'resolved' | 'declined';
  resolvedBy?: string;
  resolvedAt?: Date;
}

interface CollaborationState {
  // Document state
  documentId: string | null;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastSyncTime: Date | null;

  // CRDT state
  yDoc: Y.Doc | null;
  yText: Y.Text | null;

  // Users and presence
  currentUser: CollaborationUser | null;
  collaborators: Map<string, CollaborationUser>;

  // Comments and discussions
  comments: Map<string, Comment>;
  activeCommentThreads: string[];
  selectedComment: string | null;

  // Version control
  versions: DocumentVersion[];
  currentVersion: string | null;

  // Activity feed
  activities: ActivityEvent[];
  unreadActivities: number;

  // Conflicts and resolution
  conflicts: ConflictResolution[];

  // UI state
  showComments: boolean;
  showVersions: boolean;
  showActivity: boolean;
  sidebarWidth: number;

  // Offline state
  isOffline: boolean;
  pendingChanges: any[];
  conflictResolutionMode: boolean;
}

interface CollaborationActions {
  // Connection management
  setDocumentId: (id: string) => void;
  setConnectionStatus: (connected: boolean, quality?: 'excellent' | 'good' | 'poor' | 'offline') => void;
  updateLastSyncTime: () => void;

  // CRDT management
  initializeYDoc: (documentId: string) => void;
  getYText: () => Y.Text | null;
  applyYjsUpdate: (update: Uint8Array) => void;

  // User and presence management
  setCurrentUser: (user: CollaborationUser) => void;
  updateCollaborator: (userId: string, updates: Partial<CollaborationUser>) => void;
  removeCollaborator: (userId: string) => void;
  updateUserPresence: (userId: string, presence: Partial<CollaborationUser>) => void;

  // Comment management
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (commentId: string) => void;
  resolveComment: (commentId: string) => void;
  setSelectedComment: (commentId: string | null) => void;
  addCommentReply: (parentId: string, reply: Comment) => void;

  // Version control
  addVersion: (version: DocumentVersion) => void;
  setCurrentVersion: (versionId: string) => void;

  // Activity management
  addActivity: (activity: ActivityEvent) => void;
  markActivitiesRead: () => void;

  // Conflict resolution
  addConflict: (conflict: ConflictResolution) => void;
  resolveConflict: (conflictId: string, resolution: any) => void;

  // UI actions
  toggleComments: () => void;
  toggleVersions: () => void;
  toggleActivity: () => void;
  setSidebarWidth: (width: number) => void;

  // Offline actions
  setOfflineMode: (offline: boolean) => void;
  addPendingChange: (change: any) => void;
  clearPendingChanges: () => void;

  // Utility actions
  reset: () => void;
  cleanup: () => void;
}

const initialState: CollaborationState = {
  documentId: null,
  isConnected: false,
  connectionQuality: 'offline',
  lastSyncTime: null,
  yDoc: null,
  yText: null,
  currentUser: null,
  collaborators: new Map(),
  comments: new Map(),
  activeCommentThreads: [],
  selectedComment: null,
  versions: [],
  currentVersion: null,
  activities: [],
  unreadActivities: 0,
  conflicts: [],
  showComments: false,
  showVersions: false,
  showActivity: false,
  sidebarWidth: 320,
  isOffline: false,
  pendingChanges: [],
  conflictResolutionMode: false,
};

export const useCollaborationStore = create<CollaborationState & CollaborationActions>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          ...initialState,

          // Connection management
          setDocumentId: (id: string) =>
            set((state) => {
              state.documentId = id;
            }),

          setConnectionStatus: (connected: boolean, quality = 'offline') =>
            set((state) => {
              state.isConnected = connected;
              state.connectionQuality = connected ? quality : 'offline';
            }),

          updateLastSyncTime: () =>
            set((state) => {
              state.lastSyncTime = new Date();
            }),

          // CRDT management
          initializeYDoc: (documentId: string) =>
            set((state) => {
              if (state.yDoc) {
                state.yDoc.destroy();
              }

              state.yDoc = new Y.Doc();
              state.yText = state.yDoc.getText('content');
              state.documentId = documentId;

              // Set up Yjs observers for real-time collaboration
              state.yText.observe((event) => {
                // Handle text changes
                const { currentUser } = get();
                if (currentUser) {
                  get().addActivity({
                    id: Date.now().toString(),
                    type: 'edit',
                    action: 'text_change',
                    description: `${currentUser.name} edited the document`,
                    actor: currentUser,
                    timestamp: new Date(),
                    impact: {
                      severity: 'info',
                      scope: 'document',
                    },
                  });
                }
              });
            }),

          getYText: () => get().yText,

          applyYjsUpdate: (update: Uint8Array) => {
            const { yDoc } = get();
            if (yDoc) {
              Y.applyUpdate(yDoc, update);
            }
          },

          // User and presence management
          setCurrentUser: (user: CollaborationUser) =>
            set((state) => {
              state.currentUser = user;
            }),

          updateCollaborator: (userId: string, updates: Partial<CollaborationUser>) =>
            set((state) => {
              const existing = state.collaborators.get(userId);
              if (existing) {
                state.collaborators.set(userId, { ...existing, ...updates });
              } else {
                state.collaborators.set(userId, updates as CollaborationUser);
              }
            }),

          removeCollaborator: (userId: string) =>
            set((state) => {
              state.collaborators.delete(userId);
            }),

          updateUserPresence: (userId: string, presence: Partial<CollaborationUser>) =>
            set((state) => {
              const user = state.collaborators.get(userId);
              if (user) {
                state.collaborators.set(userId, {
                  ...user,
                  ...presence,
                  lastSeen: new Date()
                });
              }
            }),

          // Comment management
          addComment: (comment: Comment) =>
            set((state) => {
              state.comments.set(comment.id, comment);
              if (comment.thread?.id && !state.activeCommentThreads.includes(comment.thread.id)) {
                state.activeCommentThreads.push(comment.thread.id);
              }
            }),

          updateComment: (commentId: string, updates: Partial<Comment>) =>
            set((state) => {
              const comment = state.comments.get(commentId);
              if (comment) {
                state.comments.set(commentId, {
                  ...comment,
                  ...updates,
                  updatedAt: new Date()
                });
              }
            }),

          deleteComment: (commentId: string) =>
            set((state) => {
              state.comments.delete(commentId);
              if (state.selectedComment === commentId) {
                state.selectedComment = null;
              }
            }),

          resolveComment: (commentId: string) =>
            set((state) => {
              const comment = state.comments.get(commentId);
              if (comment) {
                state.comments.set(commentId, {
                  ...comment,
                  status: 'resolved',
                  updatedAt: new Date(),
                });
              }
            }),

          setSelectedComment: (commentId: string | null) =>
            set((state) => {
              state.selectedComment = commentId;
            }),

          addCommentReply: (parentId: string, reply: Comment) =>
            set((state) => {
              const parent = state.comments.get(parentId);
              if (parent) {
                parent.replies.push(reply);
                state.comments.set(parentId, { ...parent, updatedAt: new Date() });
              }
              state.comments.set(reply.id, reply);
            }),

          // Version control
          addVersion: (version: DocumentVersion) =>
            set((state) => {
              state.versions.push(version);
              if (version.isCurrent) {
                state.currentVersion = version.id;
              }
            }),

          setCurrentVersion: (versionId: string) =>
            set((state) => {
              state.currentVersion = versionId;
              state.versions.forEach((v) => {
                v.isCurrent = v.id === versionId;
              });
            }),

          // Activity management
          addActivity: (activity: ActivityEvent) =>
            set((state) => {
              state.activities.unshift(activity);
              if (state.activities.length > 1000) {
                state.activities = state.activities.slice(0, 1000);
              }
              state.unreadActivities += 1;
            }),

          markActivitiesRead: () =>
            set((state) => {
              state.unreadActivities = 0;
            }),

          // Conflict resolution
          addConflict: (conflict: ConflictResolution) =>
            set((state) => {
              state.conflicts.push(conflict);
              state.conflictResolutionMode = true;
            }),

          resolveConflict: (conflictId: string, resolution: any) =>
            set((state) => {
              const conflict = state.conflicts.find((c) => c.id === conflictId);
              if (conflict) {
                conflict.status = 'resolved';
                conflict.resolvedAt = new Date();
                conflict.resolvedBy = state.currentUser?.id;
              }

              // Check if all conflicts are resolved
              const hasUnresolvedConflicts = state.conflicts.some((c) => c.status === 'pending');
              state.conflictResolutionMode = hasUnresolvedConflicts;
            }),

          // UI actions
          toggleComments: () =>
            set((state) => {
              state.showComments = !state.showComments;
            }),

          toggleVersions: () =>
            set((state) => {
              state.showVersions = !state.showVersions;
            }),

          toggleActivity: () =>
            set((state) => {
              state.showActivity = !state.showActivity;
            }),

          setSidebarWidth: (width: number) =>
            set((state) => {
              state.sidebarWidth = Math.max(200, Math.min(600, width));
            }),

          // Offline actions
          setOfflineMode: (offline: boolean) =>
            set((state) => {
              state.isOffline = offline;
              if (!offline && state.pendingChanges.length > 0) {
                // Sync pending changes when coming back online
                // This would trigger a sync process
              }
            }),

          addPendingChange: (change: any) =>
            set((state) => {
              state.pendingChanges.push({
                ...change,
                timestamp: new Date(),
              });
            }),

          clearPendingChanges: () =>
            set((state) => {
              state.pendingChanges = [];
            }),

          // Utility actions
          reset: () =>
            set((state) => {
              // Reset to initial state but keep user preferences
              const { sidebarWidth, showComments, showVersions, showActivity } = state;
              Object.assign(state, {
                ...initialState,
                sidebarWidth,
                showComments,
                showVersions,
                showActivity,
                collaborators: new Map(),
                comments: new Map(),
              });
            }),

          cleanup: () =>
            set((state) => {
              if (state.yDoc) {
                state.yDoc.destroy();
                state.yDoc = null;
                state.yText = null;
              }
            }),
        }),
        {
          name: 'collaboration-state',
          partialize: (state) => ({
            sidebarWidth: state.sidebarWidth,
            showComments: state.showComments,
            showVersions: state.showVersions,
            showActivity: state.showActivity,
          }),
        }
      )
    )
  )
);

// Selector hooks for performance
export const useConnectionState = () =>
  useCollaborationStore((state) => ({
    isConnected: state.isConnected,
    connectionQuality: state.connectionQuality,
    lastSyncTime: state.lastSyncTime,
  }));

export const usePresenceUsers = () =>
  useCollaborationStore((state) => ({
    currentUser: state.currentUser,
    collaborators: Array.from(state.collaborators.values()),
  }));

export const useCommentState = () =>
  useCollaborationStore((state) => ({
    comments: Array.from(state.comments.values()),
    selectedComment: state.selectedComment,
    showComments: state.showComments,
  }));

export const useVersionState = () =>
  useCollaborationStore((state) => ({
    versions: state.versions,
    currentVersion: state.currentVersion,
    showVersions: state.showVersions,
  }));

export const useActivityState = () =>
  useCollaborationStore((state) => ({
    activities: state.activities,
    unreadActivities: state.unreadActivities,
    showActivity: state.showActivity,
  }));

export const useConflictState = () =>
  useCollaborationStore((state) => ({
    conflicts: state.conflicts,
    conflictResolutionMode: state.conflictResolutionMode,
  }));
