'use client';

import { useEffect, useState } from 'react';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'react-hot-toast';
import { apolloClient } from '@/lib/apollo-client';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { CollaborationProvider } from '@/components/providers/CollaborationProvider';
import { DocumentProvider } from '@/components/providers/DocumentProvider';
import { EditorLayout } from '@/components/layout/EditorLayout';

export default function HomePage() {
  const [documentId, setDocumentId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Get document ID from URL params or create new document
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('document') || 'demo-document-1';
    setDocumentId(docId);
  }, []);

  if (!isClient || !documentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ApolloProvider client={apolloClient}>
      <DocumentProvider documentId={documentId}>
        <CollaborationProvider documentId={documentId}>
          <EditorLayout>
            <CollaborativeEditor
              documentId={documentId}
              placeholder="Start writing your collaborative document..."
              className="h-full"
            />
          </EditorLayout>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </CollaborationProvider>
      </DocumentProvider>
    </ApolloProvider>
  );
}
