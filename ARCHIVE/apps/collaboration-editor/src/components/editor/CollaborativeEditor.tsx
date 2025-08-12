'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import * as Y from 'yjs';
import { toast } from 'react-hot-toast';

import { useCollaborationStore } from '@/stores/collaboration-store';
import { CollaborationToolbar } from './CollaborationToolbar';
import { PresenceLayer } from './PresenceLayer';
import { CommentLayer } from './CommentLayer';
import { cn } from '@/lib/utils';

// Editor theme configuration
const editorTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'lexical-paragraph mb-2',
  quote: 'lexical-quote border-l-4 border-accent pl-4 italic mb-4',
  heading: {
    h1: 'lexical-h1 text-3xl font-semibold mb-3 mt-4',
    h2: 'lexical-h2 text-2xl font-semibold mb-3 mt-4',
    h3: 'lexical-h3 text-xl font-semibold mb-3 mt-4',
    h4: 'lexical-h4 text-lg font-semibold mb-2 mt-3',
    h5: 'lexical-h5 text-base font-semibold mb-2 mt-3',
    h6: 'lexical-h6 text-sm font-semibold mb-2 mt-3',
  },
  list: {
    nested: {
      listitem: 'lexical-nested-listitem',
    },
    ol: 'lexical-list-ol ml-6 mb-2',
    ul: 'lexical-list-ul ml-6 mb-2',
    listitem: 'lexical-listitem mb-1',
  },
  text: {
    bold: 'lexical-text-bold font-bold',
    italic: 'lexical-text-italic italic',
    underline: 'lexical-text-underline underline',
    strikethrough: 'lexical-text-strikethrough line-through',
    code: 'lexical-text-code bg-muted px-1 py-0.5 rounded text-sm font-mono',
    highlight: 'lexical-text-highlight bg-yellow-200',
    subscript: 'lexical-text-subscript',
    superscript: 'lexical-text-superscript',
  },
  code: 'lexical-code bg-muted p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto',
  codeHighlight: {
    atrule: 'lexical-token-atrule',
    attr: 'lexical-token-attr',
    boolean: 'lexical-token-boolean',
    builtin: 'lexical-token-builtin',
    cdata: 'lexical-token-cdata',
    char: 'lexical-token-char',
    class: 'lexical-token-class',
    'class-name': 'lexical-token-class-name',
    comment: 'lexical-token-comment',
    constant: 'lexical-token-constant',
    deleted: 'lexical-token-deleted',
    doctype: 'lexical-token-doctype',
    entity: 'lexical-token-entity',
    function: 'lexical-token-function',
    important: 'lexical-token-important',
    inserted: 'lexical-token-inserted',
    keyword: 'lexical-token-keyword',
    namespace: 'lexical-token-namespace',
    number: 'lexical-token-number',
    operator: 'lexical-token-operator',
    prolog: 'lexical-token-prolog',
    property: 'lexical-token-property',
    punctuation: 'lexical-token-punctuation',
    regex: 'lexical-token-regex',
    selector: 'lexical-token-selector',
    string: 'lexical-token-string',
    symbol: 'lexical-token-symbol',
    tag: 'lexical-token-tag',
    url: 'lexical-token-url',
    variable: 'lexical-token-variable',
  },
  link: 'lexical-link text-primary hover:text-primary-hover underline cursor-pointer',
  mark: 'lexical-mark',
  markOverlap: 'lexical-mark-overlap',
};

// Editor nodes configuration
const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
];

interface CollaborativeEditorProps {
  documentId: string;
  initialContent?: any;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  onContentChange?: (content: any) => void;
  onSelectionChange?: (selection: any) => void;
}

// Plugin to handle Y.js integration
function YjsPlugin({ documentId }: { documentId: string }) {
  const [editor] = useLexicalComposerContext();
  const { yDoc, yText, initializeYDoc, applyYjsUpdate, updateUserPresence } = useCollaborationStore();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!yDoc) {
      initializeYDoc(documentId);
    }
  }, [documentId, yDoc, initializeYDoc]);

  useEffect(() => {
    if (!yText || !editor) return;

    // Handle Yjs text changes
    const handleYjsUpdate = (event: Y.YTextEvent) => {
      if (event.transaction.local) return;

      editor.update(() => {
        const root = $getRoot();

        // Apply remote changes from Yjs
        event.changes.delta.forEach((change) => {
          if (change.retain) {
            // Skip retained content
          } else if (change.delete) {
            // Handle deletions
            // Implementation would involve selecting and deleting text
          } else if (change.insert) {
            // Handle insertions
            if (typeof change.insert === 'string') {
              const textNode = $createTextNode(change.insert);
              root.append(textNode);
            }
          }
        });
      });
    };

    yText.observe(handleYjsUpdate);

    // Handle document updates from other clients
    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === editor) return;

      // Apply updates from other clients
      applyYjsUpdate(update);
    };

    yDoc.on('update', handleDocUpdate);

    return () => {
      yText.unobserve(handleYjsUpdate);
      yDoc.off('update', handleDocUpdate);
    };
  }, [yText, yDoc, editor, applyYjsUpdate]);

  // Handle local editor changes and sync to Yjs
  useEffect(() => {
    if (!editor || !yText) return;

    return editor.registerUpdateListener(({ editorState, prevEditorState }) => {
      const currentTime = Date.now();

      // Debounce updates
      if (currentTime - lastUpdateRef.current < 100) return;
      lastUpdateRef.current = currentTime;

      editorState.read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent();

        // Sync changes to Yjs
        yDoc.transact(() => {
          const currentYjsContent = yText.toString();
          if (currentYjsContent !== textContent) {
            yText.delete(0, yText.length);
            yText.insert(0, textContent);
          }
        }, editor);
      });
    });
  }, [editor, yText, yDoc]);

  return null;
}

// Plugin to handle presence and selection
function PresencePlugin({ documentId }: { documentId: string }) {
  const [editor] = useLexicalComposerContext();
  const { currentUser, updateUserPresence } = useCollaborationStore();
  const selectionRef = useRef<any>(null);

  useEffect(() => {
    if (!editor || !currentUser) return;

    // Handle selection changes
    const handleSelectionChange = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();

          const selectionData = {
            anchor: {
              key: anchorNode.getKey(),
              offset: selection.anchor.offset,
            },
            focus: {
              key: focusNode.getKey(),
              offset: selection.focus.offset,
            },
            isCollapsed: selection.isCollapsed(),
            text: selection.getTextContent(),
          };

          if (JSON.stringify(selectionData) !== JSON.stringify(selectionRef.current)) {
            selectionRef.current = selectionData;

            // Update presence with selection info
            updateUserPresence(currentUser.id, {
              selection: selectionData.isCollapsed ? undefined : {
                start: {
                  blockId: selectionData.anchor.key,
                  offset: selectionData.anchor.offset,
                },
                end: {
                  blockId: selectionData.focus.key,
                  offset: selectionData.focus.offset,
                },
                text: selectionData.text,
              },
              cursor: selectionData.isCollapsed ? {
                blockId: selectionData.anchor.key,
                offset: selectionData.anchor.offset,
              } : undefined,
              lastSeen: new Date(),
            });
          }
        }
      });
    };

    // Register selection change listener
    const unregister = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        handleSelectionChange();
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );

    return unregister;
  }, [editor, currentUser, updateUserPresence]);

  return null;
}

// Plugin to handle keyboard shortcuts and commands
function CommandsPlugin() {
  const [editor] = useLexicalComposerContext();
  const { addActivity, currentUser } = useCollaborationStore();

  useEffect(() => {
    if (!editor) return;

    // Register Enter key command
    const handleEnterKey = () => {
      if (currentUser) {
        addActivity({
          id: Date.now().toString(),
          type: 'edit',
          action: 'line_break',
          description: `${currentUser.name} added a line break`,
          actor: currentUser,
          timestamp: new Date(),
          impact: {
            severity: 'info',
            scope: 'document',
          },
        });
      }
      return false; // Let default behavior handle the enter key
    };

    // Register Tab key command
    const handleTabKey = () => {
      // Handle indentation
      return false;
    };

    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      handleEnterKey,
      COMMAND_PRIORITY_EDITOR
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      handleTabKey,
      COMMAND_PRIORITY_EDITOR
    );

    return () => {
      unregisterEnter();
      unregisterTab();
    };
  }, [editor, addActivity, currentUser]);

  return null;
}

// Main editor component
function EditorComponent({
  documentId,
  placeholder = "Start typing...",
  className,
  onContentChange,
  onSelectionChange
}: CollaborativeEditorProps) {
  const [editor] = useLexicalComposerContext();
  const { isConnected, connectionQuality } = useCollaborationStore();

  const handleChange = useCallback((editorState: any) => {
    editorState.read(() => {
      const root = $getRoot();
      const htmlContent = $generateHtmlFromNodes(editor, null);
      const textContent = root.getTextContent();

      onContentChange?.({
        html: htmlContent,
        text: textContent,
        json: editorState.toJSON(),
      });
    });
  }, [editor, onContentChange]);

  const handleSelectionChange = useCallback((editorState: any) => {
    editorState.read(() => {
      const selection = $getSelection();
      onSelectionChange?.(selection);
    });
  }, [onSelectionChange]);

  return (
    <div className={cn("relative flex flex-col h-full", className)}>
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Connection lost. Changes will be saved when reconnected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Toolbar */}
      <CollaborationToolbar />

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Rich Text Plugin */}
        <RichTextPlugin
          contentEditable={
            <div className="relative h-full">
              <ContentEditable
                className={cn(
                  "editor-content h-full p-6 outline-none focus:outline-none",
                  "prose prose-slate max-w-none",
                  "overflow-y-auto custom-scrollbar"
                )}
                placeholder={
                  <div className="absolute top-6 left-6 text-muted-foreground pointer-events-none">
                    {placeholder}
                  </div>
                }
                spellCheck="true"
              />

              {/* Presence Layer for cursors and selections */}
              <PresenceLayer />

              {/* Comment Layer for inline comments */}
              <CommentLayer documentId={documentId} />
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        {/* History Plugin */}
        <HistoryPlugin />

        {/* Change Listener */}
        <OnChangePlugin onChange={handleChange} />

        {/* Custom Plugins */}
        <YjsPlugin documentId={documentId} />
        <PresencePlugin documentId={documentId} />
        <CommandsPlugin />
      </div>
    </div>
  );
}

// Main Collaborative Editor with Lexical Composer
export function CollaborativeEditor({
  documentId,
  initialContent,
  readOnly = false,
  placeholder,
  className,
  onContentChange,
  onSelectionChange,
}: CollaborativeEditorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const initialConfig = {
    namespace: 'CollaborativeEditor',
    theme: editorTheme,
    nodes: editorNodes,
    editable: !readOnly,
    onError: (error: Error) => {
      console.error('Editor error:', error);
      toast.error('Editor error occurred');
    },
  };

  if (!isClient) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorComponent
        documentId={documentId}
        initialContent={initialContent}
        readOnly={readOnly}
        placeholder={placeholder}
        className={className}
        onContentChange={onContentChange}
        onSelectionChange={onSelectionChange}
      />
    </LexicalComposer>
  );
}
