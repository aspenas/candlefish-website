/**
 * Block Renderer Component
 * Renders individual content blocks with proper styling and interactions
 */

import React, { memo, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  LayoutChangeEvent,
  TextInput,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image';

import { useTheme } from '@/contexts/ThemeContext';
import { ContentBlock, PresenceSession } from '@/types';
import CollaboratorIndicator from './CollaboratorIndicator';

interface BlockRendererProps {
  block: ContentBlock;
  documentId: string;
  editable?: boolean;
  activeSessions?: PresenceSession[];
  onLayout?: (layout: any) => void;
  onPress?: () => void;
  onTextSelection?: (text: string, offset: number) => void;
  onContentChange?: (content: any) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BlockRenderer: React.FC<BlockRendererProps> = memo(({
  block,
  documentId,
  editable = false,
  activeSessions = [],
  onLayout,
  onPress,
  onTextSelection,
  onContentChange,
  isFirst = false,
  isLast = false,
}) => {
  const { theme } = useTheme();
  const [isSelected, setIsSelected] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const blockRef = useRef<View>(null);
  
  // Animation values
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  
  // Get active collaborators for this block
  const blockCollaborators = useMemo(() => {
    return activeSessions.filter(session => 
      session.cursor?.blockId === block.id || 
      session.selection?.start?.blockId === block.id
    );
  }, [activeSessions, block.id]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { layout } = event.nativeEvent;
    onLayout?.(layout);
  }, [onLayout]);

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.98, {}, () => {
      scale.value = withSpring(1);
    });
    
    setIsSelected(true);
    setTimeout(() => setIsSelected(false), 1000);
    
    onPress?.();
  }, [onPress, scale]);

  const handleTextSelection = useCallback((selectedText: string) => {
    if (selectedText.length > 0) {
      const offset = block.content.indexOf(selectedText);
      onTextSelection?.(selectedText, offset >= 0 ? offset : 0);
    }
  }, [block.content, onTextSelection]);

  const handleContentEdit = useCallback((newContent: string) => {
    if (editable && onContentChange) {
      onContentChange({
        ...block,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [editable, onContentChange, block]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: interpolateColor(
      borderOpacity.value,
      [0, 1],
      ['transparent', theme.colors.primary]
    ),
    borderWidth: withTiming(isSelected ? 1 : 0),
  }));

  // Show border when collaborators are active
  React.useEffect(() => {
    borderOpacity.value = withTiming(blockCollaborators.length > 0 ? 0.3 : 0);
  }, [blockCollaborators.length, borderOpacity]);

  const renderContent = () => {
    switch (block.type) {
      case 'heading':
        return renderHeading();
      case 'paragraph':
        return renderParagraph();
      case 'list':
        return renderList();
      case 'quote':
        return renderQuote();
      case 'code':
        return renderCode();
      case 'image':
        return renderImage();
      case 'divider':
        return renderDivider();
      case 'table':
        return renderTable();
      default:
        return renderParagraph();
    }
  };

  const renderHeading = () => {
    const level = block.attributes?.level || 1;
    const fontSize = [28, 24, 20, 18, 16, 14][Math.min(level - 1, 5)];
    const fontWeight = level <= 2 ? '700' : '600';
    
    if (editable && editingText) {
      return (
        <TextInput
          style={[
            styles.editableText,
            {
              fontSize,
              fontWeight,
              color: theme.colors.text,
            },
          ]}
          value={block.content}
          onChangeText={handleContentEdit}
          onBlur={() => setEditingText(false)}
          multiline
          autoFocus
        />
      );
    }

    return (
      <TouchableOpacity
        onPress={editable ? () => setEditingText(true) : handlePress}
        onLongPress={() => handleTextSelection(block.content)}
      >
        <Text
          style={[
            styles.heading,
            {
              fontSize,
              fontWeight,
              color: theme.colors.text,
              marginTop: isFirst ? 0 : 24,
              marginBottom: 12,
            },
          ]}
          selectable={!editable}
        >
          {block.content}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderParagraph = () => {
    if (editable && editingText) {
      return (
        <TextInput
          style={[
            styles.editableText,
            styles.paragraph,
            { color: theme.colors.text },
          ]}
          value={block.content}
          onChangeText={handleContentEdit}
          onBlur={() => setEditingText(false)}
          multiline
          autoFocus
        />
      );
    }

    return (
      <TouchableOpacity
        onPress={editable ? () => setEditingText(true) : handlePress}
        onLongPress={() => handleTextSelection(block.content)}
      >
        <Text
          style={[
            styles.paragraph,
            {
              color: theme.colors.text,
              marginBottom: 16,
            },
          ]}
          selectable={!editable}
        >
          {block.content}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    const items = Array.isArray(block.content) ? block.content : [block.content];
    const isOrdered = block.attributes?.listType === 'ordered';

    return (
      <View style={[styles.list, { marginBottom: 16 }]}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={handlePress}
            onLongPress={() => handleTextSelection(item)}
          >
            <View style={styles.listItem}>
              <Text style={[styles.listMarker, { color: theme.colors.textSecondary }]}>
                {isOrdered ? `${index + 1}.` : '•'}
              </Text>
              <Text
                style={[styles.listItemText, { color: theme.colors.text }]}
                selectable={!editable}
              >
                {item}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderQuote = () => (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => handleTextSelection(block.content)}
    >
      <View
        style={[
          styles.quote,
          {
            borderLeftColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
            marginBottom: 16,
          },
        ]}
      >
        <Text
          style={[
            styles.quoteText,
            { color: theme.colors.textSecondary },
          ]}
          selectable={!editable}
        >
          {block.content}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCode = () => (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => handleTextSelection(block.content)}
    >
      <View
        style={[
          styles.codeBlock,
          {
            backgroundColor: theme.colors.surface,
            marginBottom: 16,
          },
        ]}
      >
        <Text
          style={[
            styles.codeText,
            { color: theme.colors.text },
          ]}
          selectable={!editable}
        >
          {block.content}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderImage = () => {
    const imageUrl = block.content || block.attributes?.src;
    const caption = block.attributes?.caption;
    
    if (!imageUrl) return null;

    return (
      <TouchableOpacity onPress={handlePress}>
        <View style={[styles.imageContainer, { marginBottom: 16 }]}>
          <FastImage
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode={FastImage.resizeMode.contain}
          />
          {caption && (
            <Text
              style={[
                styles.imageCaption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {caption}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDivider = () => (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: theme.colors.border,
          marginVertical: 24,
        },
      ]}
    />
  );

  const renderTable = () => {
    const tableData = block.content;
    if (!Array.isArray(tableData) || tableData.length === 0) return null;

    return (
      <TouchableOpacity onPress={handlePress}>
        <View
          style={[
            styles.table,
            {
              borderColor: theme.colors.border,
              marginBottom: 16,
            },
          ]}
        >
          {tableData.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.tableRow,
                {
                  backgroundColor: rowIndex === 0 ? theme.colors.surface : 'transparent',
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              {row.map((cell, cellIndex) => (
                <Text
                  key={cellIndex}
                  style={[
                    styles.tableCell,
                    {
                      color: theme.colors.text,
                      fontWeight: rowIndex === 0 ? '600' : '400',
                      borderRightColor: theme.colors.border,
                    },
                  ]}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      ref={blockRef}
      style={[styles.blockContainer, animatedStyle]}
      onLayout={handleLayout}
    >
      {/* Collaborator indicators */}
      {blockCollaborators.map((session) => (
        <CollaboratorIndicator
          key={session.id}
          session={session}
          blockId={block.id}
        />
      ))}
      
      {/* Block content */}
      {renderContent()}
      
      {/* Block metadata for debugging/development */}
      {__DEV__ && isSelected && (
        <View style={[styles.metadata, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
            Block ID: {block.id}
          </Text>
          <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
            Type: {block.type}
          </Text>
          <Text style={[styles.metadataText, { color: theme.colors.textSecondary }]}>
            Position: {block.position.index}
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  blockContainer: {
    position: 'relative',
    borderRadius: 8,
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  heading: {
    lineHeight: 1.3,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  editableText: {
    fontSize: 16,
    lineHeight: 24,
    padding: 8,
    borderRadius: 4,
    minHeight: 40,
  },
  list: {
    paddingLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listMarker: {
    width: 24,
    fontSize: 16,
    textAlign: 'center',
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  quote: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 4,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  codeBlock: {
    borderRadius: 8,
    padding: 16,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  table: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    borderRightWidth: 1,
  },
  metadata: {
    position: 'absolute',
    top: -60,
    right: 0,
    padding: 8,
    borderRadius: 4,
    minWidth: 120,
  },
  metadataText: {
    fontSize: 10,
    lineHeight: 14,
  },
});

BlockRenderer.displayName = 'BlockRenderer';

export default BlockRenderer;