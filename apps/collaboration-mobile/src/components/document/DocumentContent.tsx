/**
 * Document Content Component
 * Renders document content with collaborative editing capabilities
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { Document, ContentBlock, PresenceSession, DocumentType } from '@/types';
import { offlineSyncService } from '@/services/offlineSync';
import BlockRenderer from './BlockRenderer';
import SelectionOverlay from './SelectionOverlay';
import ContentPlaceholder from './ContentPlaceholder';

interface DocumentContentProps {
  document: Document;
  editable?: boolean;
  onTextSelection?: (text: string, position: any) => void;
  onEdit?: (documentId: string) => void;
  activeSessions?: PresenceSession[];
  onContentChange?: (operations: any[]) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DocumentContent: React.FC<DocumentContentProps> = ({
  document,
  editable = false,
  onTextSelection,
  onEdit,
  activeSessions = [],
  onContentChange,
}) => {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const contentRef = useRef<View>(null);
  const layoutRef = useRef<{ [blockId: string]: any }>({});
  
  const fadeIn = useSharedValue(0);
  const scaleValue = useSharedValue(0.95);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 300 });
    scaleValue.value = withTiming(1, { duration: 400 });
  }, []);

  // Get Y.Doc for collaborative editing
  const ydoc = useMemo(() => {
    return offlineSyncService.getYDoc(document.id);
  }, [document.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [
      {
        scale: interpolate(
          scaleValue.value,
          [0.95, 1],
          [0.95, 1]
        ),
      },
    ],
  }));

  const handleBlockLayout = useCallback((blockId: string, layout: any) => {
    layoutRef.current[blockId] = layout;
  }, []);

  const handleBlockPress = useCallback((block: ContentBlock) => {
    if (editable && onEdit) {
      onEdit(document.id);
    }
  }, [editable, onEdit, document.id]);

  const handleTextSelection = useCallback((text: string, blockId: string, offset: number) => {
    if (onTextSelection && text.length > 0) {
      const blockLayout = layoutRef.current[blockId];
      const position = {
        blockId,
        offset,
        layout: blockLayout,
      };
      onTextSelection(text, position);
    }
  }, [onTextSelection]);

  const renderContent = useCallback(() => {
    if (!document.content || !document.content.blocks || document.content.blocks.length === 0) {
      return (
        <ContentPlaceholder 
          documentType={document.type}
          onCreateContent={editable ? () => onEdit?.(document.id) : undefined}
        />
      );
    }

    const sortedBlocks = document.content.blocks.sort((a, b) => 
      a.position.index - b.position.index
    );

    return (
      <View style={styles.blocksContainer}>
        {sortedBlocks.map((block, index) => (
          <BlockRenderer
            key={block.id}
            block={block}
            documentId={document.id}
            editable={editable}
            activeSessions={activeSessions}
            onLayout={(layout) => handleBlockLayout(block.id, layout)}
            onPress={() => handleBlockPress(block)}
            onTextSelection={(text, offset) => handleTextSelection(text, block.id, offset)}
            isFirst={index === 0}
            isLast={index === sortedBlocks.length - 1}
          />
        ))}
      </View>
    );
  }, [
    document.content,
    document.type,
    document.id,
    editable,
    activeSessions,
    onEdit,
    handleBlockLayout,
    handleBlockPress,
    handleTextSelection,
  ]);

  const renderWebContent = useCallback(() => {
    if (document.type === DocumentType.RICH_TEXT && document.content?.html) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 16px;
              line-height: 1.6;
              color: ${theme.colors.text};
              background-color: ${theme.colors.background};
              margin: 0;
              padding: 20px;
              word-wrap: break-word;
            }
            
            h1, h2, h3, h4, h5, h6 {
              color: ${theme.colors.text};
              margin-top: 24px;
              margin-bottom: 12px;
              font-weight: 600;
            }
            
            h1 { font-size: 28px; }
            h2 { font-size: 24px; }
            h3 { font-size: 20px; }
            
            p {
              margin: 12px 0;
            }
            
            a {
              color: ${theme.colors.primary};
              text-decoration: none;
            }
            
            blockquote {
              border-left: 4px solid ${theme.colors.primary};
              padding-left: 16px;
              margin: 16px 0;
              font-style: italic;
              color: ${theme.colors.textSecondary};
            }
            
            code {
              background-color: ${theme.colors.surface};
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 14px;
            }
            
            pre {
              background-color: ${theme.colors.surface};
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
            }
            
            ul, ol {
              padding-left: 20px;
            }
            
            li {
              margin: 4px 0;
            }
            
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
            }
            
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 16px 0;
            }
            
            th, td {
              border: 1px solid ${theme.colors.border};
              padding: 12px;
              text-align: left;
            }
            
            th {
              background-color: ${theme.colors.surface};
              font-weight: 600;
            }
            
            .collaboration-cursor {
              position: absolute;
              width: 2px;
              background-color: #007AFF;
              pointer-events: none;
              z-index: 100;
            }
            
            .collaboration-selection {
              background-color: rgba(0, 122, 255, 0.2);
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          ${document.content.html}
          
          <script>
            // Handle text selection
            document.addEventListener('selectionchange', function() {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'textSelection',
                  text: selection.toString(),
                  position: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }
                }));
              }
            });
            
            // Handle link clicks
            document.addEventListener('click', function(e) {
              if (e.target.tagName === 'A') {
                e.preventDefault();
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'linkClick',
                  url: e.target.href
                }));
              }
            });
            
            // Prevent zoom on input focus (iOS)
            document.addEventListener('touchstart', function(e) {
              if (e.touches.length > 1) {
                e.preventDefault();
              }
            });
            
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(e) {
              const now = (new Date()).getTime();
              if (now - lastTouchEnd <= 300) {
                e.preventDefault();
              }
              lastTouchEnd = now;
            }, false);
          </script>
        </body>
        </html>
      `;

      return (
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={[styles.webView, { backgroundColor: theme.colors.background }]}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              
              switch (message.type) {
                case 'textSelection':
                  onTextSelection?.(message.text, message.position);
                  break;
                case 'linkClick':
                  // Handle link navigation
                  console.log('Link clicked:', message.url);
                  break;
              }
            } catch (error) {
              console.error('WebView message parsing error:', error);
            }
          }}
          injectedJavaScript={`
            // Add collaboration cursors and selections
            function updateCollaborationIndicators(sessions) {
              // Remove existing indicators
              const existingCursors = document.querySelectorAll('.collaboration-cursor');
              existingCursors.forEach(cursor => cursor.remove());
              
              const existingSelections = document.querySelectorAll('.collaboration-selection');
              existingSelections.forEach(selection => selection.classList.remove('collaboration-selection'));
              
              // Add new indicators
              sessions.forEach(session => {
                if (session.cursor) {
                  const cursor = document.createElement('div');
                  cursor.className = 'collaboration-cursor';
                  cursor.style.left = session.cursor.x + 'px';
                  cursor.style.top = session.cursor.y + 'px';
                  cursor.style.height = session.cursor.height + 'px';
                  document.body.appendChild(cursor);
                }
                
                if (session.selection && !session.selection.isCollapsed) {
                  // Add selection highlighting
                  // This would require more complex range manipulation
                }
              });
            }
            
            // This would be called from React Native to update collaboration indicators
            window.updateCollaboration = updateCollaborationIndicators;
            
            true;
          `}
        />
      );
    }
    
    return null;
  }, [document.type, document.content?.html, theme, onTextSelection]);

  // Show web content for rich text documents
  if (document.type === DocumentType.RICH_TEXT && document.content?.html) {
    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        {renderWebContent()}
        <SelectionOverlay activeSessions={activeSessions} />
      </Animated.View>
    );
  }

  // Show block-based content for other document types
  return (
    <Animated.View style={[styles.container, animatedStyle]} ref={contentRef}>
      {renderContent()}
      <SelectionOverlay activeSessions={activeSessions} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
  blocksContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    width: SCREEN_WIDTH - 32,
  },
});

export default DocumentContent;