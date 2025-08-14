'use client';

import { ReactNode, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_DOCUMENT } from '@/graphql/queries/document';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { toast } from 'react-hot-toast';

interface DocumentProviderProps {
  documentId: string;
  children: ReactNode;
}

export function DocumentProvider({ documentId, children }: DocumentProviderProps) {
  const { addComment, addVersion } = useCollaborationStore();

  // Load document data
  const { data, loading, error, refetch } = useQuery(GET_DOCUMENT, {
    variables: { id: documentId },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    onCompleted: (data) => {
      if (data?.document) {
        // Load document comments
        if (data.document.comments) {
          data.document.comments.forEach((comment: any) => {
            addComment({
              id: comment.id,
              content: comment.content.text,
              author: {
                id: comment.author.id,
                name: comment.author.name,
                avatar: comment.author.avatar || '',
                color: '#3b82f6',
                status: 'active',
                isTyping: false,
                lastSeen: new Date(comment.createdAt),
              },
              position: comment.position ? {
                blockId: comment.position.blockId,
                startOffset: comment.position.startOffset,
                endOffset: comment.position.endOffset,
              } : undefined,
              thread: comment.thread ? {
                id: comment.thread.id,
                subject: comment.thread.subject,
                status: comment.thread.status,
              } : undefined,
              replies: comment.replies?.map((reply: any) => ({
                id: reply.id,
                content: reply.content.text,
                author: {
                  id: reply.author.id,
                  name: reply.author.name,
                  avatar: reply.author.avatar || '',
                  color: '#3b82f6',
                  status: 'active',
                  isTyping: false,
                  lastSeen: new Date(reply.createdAt),
                },
                replies: [],
                reactions: reply.reactions || [],
                status: reply.status,
                createdAt: new Date(reply.createdAt),
                updatedAt: new Date(reply.updatedAt),
              })) || [],
              reactions: comment.reactions?.map((reaction: any) => ({
                type: reaction.type,
                users: [reaction.user.id],
              })) || [],
              status: comment.status,
              createdAt: new Date(comment.createdAt),
              updatedAt: new Date(comment.updatedAt),
            });
          });
        }

        // Load document versions
        if (data.document.versions) {
          data.document.versions.forEach((version: any) => {
            addVersion({
              id: version.id,
              version: version.version,
              name: version.name,
              description: version.description,
              author: {
                id: version.author.id,
                name: version.author.name,
                avatar: version.author.avatar || '',
                color: '#3b82f6',
                status: 'active',
                isTyping: false,
                lastSeen: new Date(),
              },
              changes: version.changes?.map((change: any) => ({
                type: change.type.toLowerCase(),
                position: change.position?.index || 0,
                content: change.newContent,
                length: change.position?.length,
              })) || [],
              createdAt: new Date(version.createdAt),
              isCurrent: version.isCurrentVersion,
            });
          });
        }

        toast.success('Document loaded successfully');
      }
    },
    onError: (error) => {
      console.error('Document query error:', error);
      toast.error('Failed to load document');
    },
  });

  // Retry loading on error
  useEffect(() => {
    if (error && !loading) {
      const timer = setTimeout(() => {
        refetch();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, loading, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Failed to load document</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || 'An error occurred while loading the document.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
