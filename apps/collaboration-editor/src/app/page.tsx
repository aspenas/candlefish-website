'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CollaborationLayout } from '@/components/layout/CollaborationLayout';
import { DocumentLoading, CollaborationLoading } from '@/components/common/LoadingStates';
import { useCollaborationStore } from '@/stores/collaboration-store';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const { setCurrentUser } = useCollaborationStore();

  useEffect(() => {
    // Initialize demo user
    const demoUser = {
      id: 'demo-user-1',
      name: 'Demo User',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face&auto=format',
      color: '#3B82F6',
      status: 'active' as const,
      cursor: undefined,
      selection: undefined,
      isTyping: false,
      currentAction: undefined,
      lastSeen: new Date(),
    };

    setCurrentUser(demoUser);

    // Get project and document from URL params
    const urlProjectId = searchParams.get('project') || 'demo-project-1';
    const urlDocumentId = searchParams.get('document');

    setProjectId(urlProjectId);
    setDocumentId(urlDocumentId);

    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, [searchParams, setCurrentUser]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="space-y-6">
          <DocumentLoading message="Initializing collaborative editor..." />
          <CollaborationLoading />
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to Collaboration Editor</h1>
          <p className="text-muted-foreground">
            Please specify a project ID to get started.
          </p>
          <button
            onClick={() => router.push('/?project=demo-project-1')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Load Demo Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <CollaborationLayout
        projectId={projectId}
        documentId={documentId || undefined}
        className="h-screen"
      />
    </ErrorBoundary>
  );
}
