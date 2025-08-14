'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useSubscription } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { DOCUMENT_CONTENT_CHANGED, DOCUMENT_PRESENCE_CHANGED, DOCUMENT_ACTIVITY_UPDATED } from '@/graphql/subscriptions/document';

interface CollaborationProviderProps {
  documentId: string;
  children: ReactNode;
}

export function CollaborationProvider({ documentId, children }: CollaborationProviderProps) {
  const {
    setDocumentId,
    setConnectionStatus,
    updateLastSyncTime,
    updateCollaborator,
    removeCollaborator,
    addActivity,
    initializeYDoc,
    setCurrentUser,
  } = useCollaborationStore();

  const isInitializedRef = useRef(false);

  // Initialize collaboration when component mounts
  useEffect(() => {
    if (!isInitializedRef.current) {
      setDocumentId(documentId);
      initializeYDoc(documentId);

      // Set mock current user (in real app this would come from auth)
      setCurrentUser({
        id: 'current-user',
        name: 'Current User',
        avatar: '',
        color: '#3b82f6',
        status: 'active',
        isTyping: false,
        lastSeen: new Date(),
      });

      setConnectionStatus(true, 'excellent');
      isInitializedRef.current = true;
    }
  }, [documentId, setDocumentId, initializeYDoc, setCurrentUser, setConnectionStatus]);

  // Subscribe to document content changes
  const { data: contentData, error: contentError } = useSubscription(
    DOCUMENT_CONTENT_CHANGED,
    {
      variables: { documentId },
      onData: ({ data }) => {
        if (data.data?.documentContentChanged) {
          const change = data.data.documentContentChanged;

          // Handle real-time content updates
          if (change.operations && change.operations.length > 0) {
            updateLastSyncTime();

            // Add activity for the change
            addActivity({
              id: `${change.timestamp}-${change.author.id}`,
              type: 'edit',
              action: 'content_change',
              description: `${change.author.name} edited the document`,
              actor: {
                id: change.author.id,
                name: change.author.name,
                avatar: change.author.avatar || '',
                color: '#3b82f6',
                status: 'active',
                isTyping: false,
                lastSeen: new Date(),
              },
              timestamp: new Date(change.timestamp),
              impact: {
                severity: 'info',
                scope: 'document',
              },
            });

            // Handle conflicts if detected
            if (change.conflictsDetected && change.conflictsDetected.length > 0) {
              toast.error(`${change.conflictsDetected.length} conflict${change.conflictsDetected.length > 1 ? 's' : ''} detected`);
            }
          }
        }
      },
      onError: (error) => {
        console.error('Content subscription error:', error);
        setConnectionStatus(false);
      },
    }
  );

  // Subscribe to presence changes
  const { data: presenceData, error: presenceError } = useSubscription(
    DOCUMENT_PRESENCE_CHANGED,
    {
      variables: { documentId },
      onData: ({ data }) => {
        if (data.data?.documentPresenceChanged) {
          const presenceChange = data.data.documentPresenceChanged;
          const session = presenceChange.session;

          if (session && session.user.id !== 'current-user') {
            const collaborator = {
              id: session.user.id,
              name: session.user.name,
              avatar: session.user.avatar || '',
              color: '#3b82f6', // Would be assigned based on user
              status: session.status as 'active' | 'away' | 'idle',
              cursor: session.cursor ? {
                blockId: session.cursor.blockId,
                offset: session.cursor.offset,
                x: session.cursor.x,
                y: session.cursor.y,
              } : undefined,
              selection: session.selection && !session.selection.isCollapsed ? {
                start: {
                  blockId: session.selection.start.blockId,
                  offset: session.selection.start.offset,
                },
                end: {
                  blockId: session.selection.end.blockId,
                  offset: session.selection.end.offset,
                },
                text: session.selection.text,
              } : undefined,
              isTyping: session.isTyping,
              currentAction: session.currentAction,
              lastSeen: new Date(session.lastSeenAt),
            };

            if (presenceChange.type === 'USER_JOINED' || presenceChange.type === 'USER_UPDATED') {
              updateCollaborator(session.user.id, collaborator);

              if (presenceChange.type === 'USER_JOINED') {
                toast.success(`${session.user.name} joined the document`);
              }
            } else if (presenceChange.type === 'USER_LEFT') {
              removeCollaborator(session.user.id);
              toast(`${session.user.name} left the document`);
            }
          }
        }
      },
      onError: (error) => {
        console.error('Presence subscription error:', error);
      },
    }
  );

  // Subscribe to activity updates
  const { data: activityData, error: activityError } = useSubscription(
    DOCUMENT_ACTIVITY_UPDATED,
    {
      variables: { documentId },
      onData: ({ data }) => {
        if (data.data?.documentActivityUpdated) {
          const activityUpdate = data.data.documentActivityUpdated;
          const activity = activityUpdate.activity;

          if (activity && activity.actor.id !== 'current-user') {
            addActivity({
              id: activity.id,
              type: activity.type as 'edit' | 'comment' | 'presence' | 'version' | 'share',
              action: activity.action,
              description: activity.description,
              actor: {
                id: activity.actor.id,
                name: activity.actor.name,
                avatar: activity.actor.avatar || '',
                color: '#3b82f6',
                status: 'active',
                isTyping: false,
                lastSeen: new Date(),
              },
              timestamp: new Date(activity.timestamp),
              impact: {
                severity: activity.impact.severity as 'info' | 'low' | 'medium' | 'high',
                scope: activity.impact.scope as 'personal' | 'document' | 'organization',
              },
            });
          }
        }
      },
      onError: (error) => {
        console.error('Activity subscription error:', error);
      },
    }
  );

  // Handle connection errors
  useEffect(() => {
    if (contentError || presenceError || activityError) {
      setConnectionStatus(false);
      toast.error('Connection lost. Retrying...');
    } else if (contentData || presenceData || activityData) {
      setConnectionStatus(true, 'excellent');
    }
  }, [contentError, presenceError, activityError, contentData, presenceData, activityData, setConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup would happen here
    };
  }, []);

  return <>{children}</>;
}
