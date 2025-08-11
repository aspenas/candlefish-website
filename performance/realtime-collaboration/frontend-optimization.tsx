/**
 * Frontend Performance Optimizations for Real-time Collaboration
 * Target: <500KB bundle size, <100ms interaction latency
 */

import React, { lazy, Suspense, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useVirtualizer } from '@tanstack/react-virtual';
import { debounce, throttle } from 'lodash-es';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { $getRoot, $createParagraphNode, EditorState } from 'lexical';

// Lazy load heavy components
const LexicalEditor = dynamic(
  () => import('@lexical/react/LexicalRichTextPlugin').then(mod => mod.RichTextPlugin),
  {
    ssr: false,
    loading: () => <EditorSkeleton />
  }
);

const CollaborationPlugin = lazy(() =>
  import('./collaboration-plugin').then(module => ({
    default: module.CollaborationPlugin
  }))
);

// WebWorker for heavy computations
const crdtWorker = typeof window !== 'undefined'
  ? new Worker(new URL('./crdt.worker.ts', import.meta.url))
  : null;

// Optimized WebSocket hook with reconnection
export function useOptimizedWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageBuffer = useRef<any[]>([]);
  const isConnected = useRef(false);

  // Connection with exponential backoff
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(url);

    // Enable binary frames for efficiency
    ws.current.binaryType = 'arraybuffer';

    ws.current.onopen = () => {
      isConnected.current = true;
      console.log('WebSocket connected');

      // Flush buffered messages
      while (messageBuffer.current.length > 0) {
        const msg = messageBuffer.current.shift();
        ws.current?.send(msg);
      }
    };

    ws.current.onclose = () => {
      isConnected.current = false;
      console.log('WebSocket disconnected, reconnecting...');

      // Exponential backoff reconnection
      let delay = 1000;
      const attemptReconnect = () => {
        reconnectTimeout.current = setTimeout(() => {
          connect();
          delay = Math.min(delay * 2, 30000); // Max 30 seconds
          attemptReconnect();
        }, delay);
      };
      attemptReconnect();
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [url]);

  // Optimized send with buffering
  const send = useCallback((data: any) => {
    const message = typeof data === 'string'
      ? data
      : JSON.stringify(data);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      // Buffer messages when disconnected
      messageBuffer.current.push(message);
      if (messageBuffer.current.length > 100) {
        messageBuffer.current.shift(); // Remove oldest
      }
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  return { ws: ws.current, send, isConnected: isConnected.current };
}

// Optimized collaboration editor component
export const OptimizedCollaborationEditor: React.FC<{
  documentId: string;
  userId: string;
}> = React.memo(({ documentId, userId }) => {
  const { ws, send } = useOptimizedWebSocket(
    `${process.env.NEXT_PUBLIC_WS_URL}/collaboration`
  );

  // Throttled cursor updates
  const sendCursorUpdate = useMemo(
    () => throttle((position: any) => {
      send({
        type: 'cursor',
        documentId,
        userId,
        position,
      });
    }, 50), // 20fps for cursor updates
    [send, documentId, userId]
  );

  // Debounced content updates
  const sendContentUpdate = useMemo(
    () => debounce((content: any) => {
      // Send to WebWorker for CRDT processing
      if (crdtWorker) {
        crdtWorker.postMessage({
          type: 'apply',
          content,
          documentId,
        });
      }
    }, 100), // 100ms debounce for typing
    [documentId]
  );

  // Lexical editor configuration
  const initialConfig = useMemo(() => ({
    namespace: 'CollaborationEditor',
    theme: {
      // Minimal theme for performance
      paragraph: 'editor-paragraph',
      text: {
        bold: 'editor-bold',
        italic: 'editor-italic',
      },
    },
    onError: (error: Error) => {
      console.error('Editor error:', error);
    },
    editorState: null, // Load asynchronously
  }), []);

  // Handle WebWorker messages
  useEffect(() => {
    if (!crdtWorker) return;

    crdtWorker.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'processed') {
        // Send processed CRDT operations via WebSocket
        send({
          type: 'crdt',
          documentId,
          operations: data,
        });
      }
    };
  }, [send, documentId]);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container">
        <Suspense fallback={<EditorSkeleton />}>
          <LexicalEditor
            contentEditable={
              <div className="editor-content" />
            }
            placeholder={<div className="editor-placeholder">Start typing...</div>}
          />
          <CollaborationPlugin
            documentId={documentId}
            userId={userId}
            onCursorChange={sendCursorUpdate}
            onContentChange={sendContentUpdate}
            websocket={ws}
          />
        </Suspense>
      </div>
    </LexicalComposer>
  );
});

OptimizedCollaborationEditor.displayName = 'OptimizedCollaborationEditor';

// Virtual list for comments/activity feed
export const VirtualizedCommentList: React.FC<{
  comments: any[];
}> = React.memo(({ comments }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated comment height
    overscan: 5, // Render 5 items outside viewport
  });

  return (
    <div ref={parentRef} className="comment-list" style={{ height: '400px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <CommentItem comment={comments[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedCommentList.displayName = 'VirtualizedCommentList';

// Memoized comment item
const CommentItem = React.memo<{ comment: any }>(({ comment }) => (
  <div className="comment-item">
    <img
      src={comment.author_avatar}
      alt={comment.author_name}
      loading="lazy"
      className="comment-avatar"
    />
    <div className="comment-content">
      <div className="comment-author">{comment.author_name}</div>
      <div className="comment-text">{comment.content}</div>
      <div className="comment-time">{comment.created_at}</div>
    </div>
  </div>
));

CommentItem.displayName = 'CommentItem';

// Editor skeleton for loading state
const EditorSkeleton: React.FC = () => (
  <div className="editor-skeleton">
    <div className="skeleton-line" style={{ width: '80%' }} />
    <div className="skeleton-line" style={{ width: '60%' }} />
    <div className="skeleton-line" style={{ width: '70%' }} />
  </div>
);

// Service Worker for offline support
export function registerCollaborationServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/collaboration-sw.js').then(
      (registration) => {
        console.log('Service Worker registered:', registration);

        // Handle updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available, refresh to update');
              }
            }
          };
        };
      },
      (error) => {
        console.error('Service Worker registration failed:', error);
      }
    );
  }
}

// Optimized Apollo Client setup
import { ApolloClient, InMemoryCache, split, ApolloLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { WebSocketLink } from '@apollo/client/link/ws';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

export function createOptimizedApolloClient() {
  // Batch HTTP link for queries/mutations
  const batchHttpLink = new BatchHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    batchInterval: 10, // 10ms batching window
    batchMax: 10, // Max 10 queries per batch
    credentials: 'include',
  });

  // WebSocket link for subscriptions
  const wsLink = new WebSocketLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!,
    options: {
      reconnect: true,
      reconnectionAttempts: 5,
      connectionParams: {
        authToken: localStorage.getItem('authToken'),
      },
      // Lazy connection (connect only when needed)
      lazy: true,
    },
  });

  // Retry link for resilience
  const retryLink = new RetryLink({
    delay: {
      initial: 300,
      max: Infinity,
      jitter: true,
    },
    attempts: {
      max: 3,
      retryIf: (error) => !!error && !error.message?.includes('Invalid token'),
    },
  });

  // Error handling
  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, locations, path }) =>
        console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`)
      );
    }
    if (networkError) {
      console.error(`Network error: ${networkError}`);
    }
  });

  // Split traffic between WebSocket and HTTP
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    batchHttpLink
  );

  // Combine all links
  const link = ApolloLink.from([errorLink, retryLink, splitLink]);

  // Optimized cache configuration
  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          documents: {
            // Pagination with cache merging
            keyArgs: false,
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
          comments: {
            // Field-level caching
            keyArgs: ['documentId'],
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
      Document: {
        fields: {
          collaborators: {
            // Normalize collaborator references
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
    // Enable result caching
    resultCaching: true,
    // Possess canonical cache IDs
    possibleTypes: {
      Node: ['User', 'Document', 'Comment'],
    },
  });

  return new ApolloClient({
    link,
    cache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
    },
  });
}

// Bundle optimization utilities
export const optimizationConfig = {
  // Code splitting boundaries
  chunkGroups: {
    vendor: ['react', 'react-dom', '@apollo/client'],
    editor: ['lexical', '@lexical/react'],
    collaboration: ['socket.io-client', 'msgpack-lite'],
  },

  // Tree shaking config
  sideEffects: false,

  // Webpack optimization
  webpack: (config: any) => {
    // Enable persistent caching
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };

    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
          },
          editor: {
            test: /[\\/]node_modules[\\/](lexical|@lexical)[\\/]/,
            name: 'editor',
            priority: 20,
          },
          collaboration: {
            test: /[\\/]node_modules[\\/](socket\.io|msgpack)[\\/]/,
            name: 'collaboration',
            priority: 20,
          },
        },
      },
    };

    return config;
  },
};
