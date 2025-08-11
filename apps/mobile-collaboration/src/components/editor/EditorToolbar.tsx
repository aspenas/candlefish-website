import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Surface, IconButton, Button, Menu } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';

interface EditorToolbarProps {
  onFormat: (format: string) => void;
  hasSelection: boolean;
  disabled?: boolean;
}

interface FormatAction {
  id: string;
  icon: string;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  hasSelection,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const handleFormat = (format: string) => {
    if (disabled) return;

    onFormat(format);
    setActiveFormats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(format)) {
        newSet.delete(format);
      } else {
        newSet.add(format);
      }
      return newSet;
    });

    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const formatActions: FormatAction[] = [
    {
      id: 'bold',
      icon: 'format-bold',
      label: 'Bold',
      action: () => handleFormat('bold'),
      disabled: !hasSelection,
    },
    {
      id: 'italic',
      icon: 'format-italic',
      label: 'Italic',
      action: () => handleFormat('italic'),
      disabled: !hasSelection,
    },
    {
      id: 'underline',
      icon: 'format-underlined',
      label: 'Underline',
      action: () => handleFormat('underline'),
      disabled: !hasSelection,
    },
    {
      id: 'strikethrough',
      icon: 'format-strikethrough',
      label: 'Strikethrough',
      action: () => handleFormat('strikethrough'),
      disabled: !hasSelection,
    },
    {
      id: 'code',
      icon: 'code-tags',
      label: 'Code',
      action: () => handleFormat('code'),
      disabled: !hasSelection,
    },
  ];

  const insertActions: FormatAction[] = [
    {
      id: 'link',
      icon: 'link-variant',
      label: 'Link',
      action: () => handleFormat('link'),
    },
    {
      id: 'image',
      icon: 'image',
      label: 'Image',
      action: () => handleFormat('image'),
    },
    {
      id: 'list-bulleted',
      icon: 'format-list-bulleted',
      label: 'Bullet List',
      action: () => handleFormat('bullet-list'),
    },
    {
      id: 'list-numbered',
      icon: 'format-list-numbered',
      label: 'Numbered List',
      action: () => handleFormat('numbered-list'),
    },
    {
      id: 'quote',
      icon: 'format-quote-close',
      label: 'Quote',
      action: () => handleFormat('quote'),
    },
    {
      id: 'divider',
      icon: 'minus',
      label: 'Divider',
      action: () => handleFormat('divider'),
    },
  ];

  const headingActions: FormatAction[] = [
    {
      id: 'h1',
      icon: 'format-header-1',
      label: 'Heading 1',
      action: () => handleFormat('h1'),
    },
    {
      id: 'h2',
      icon: 'format-header-2',
      label: 'Heading 2',
      action: () => handleFormat('h2'),
    },
    {
      id: 'h3',
      icon: 'format-header-3',
      label: 'Heading 3',
      action: () => handleFormat('h3'),
    },
    {
      id: 'paragraph',
      icon: 'format-paragraph',
      label: 'Paragraph',
      action: () => handleFormat('paragraph'),
    },
  ];

  const styles = createStyles(theme);

  return (
    <Surface style={styles.toolbar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}
      >
        {/* Text Formatting */}
        <View style={styles.buttonGroup}>
          {formatActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.toolbarButton,
                activeFormats.has(action.id) && styles.activeButton,
                (disabled || action.disabled) && styles.disabledButton,
              ]}
              onPress={action.action}
              disabled={disabled || action.disabled}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={action.icon as any}
                size={20}
                color={
                  disabled || action.disabled
                    ? theme.colors.onSurfaceDisabled
                    : activeFormats.has(action.id)
                    ? theme.colors.primary
                    : theme.colors.onSurface
                }
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Headings Menu */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => setMenuVisible(true)}
              disabled={disabled}
            >
              <MaterialIcons
                name="format-size"
                size={20}
                color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
              />
            </TouchableOpacity>
          }
          contentStyle={styles.menu}
        >
          {headingActions.map(action => (
            <Menu.Item
              key={action.id}
              onPress={() => {
                action.action();
                setMenuVisible(false);
              }}
              title={action.label}
              leadingIcon={action.icon}
            />
          ))}
        </Menu>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Insert Actions */}
        <View style={styles.buttonGroup}>
          {insertActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.toolbarButton,
                disabled && styles.disabledButton,
              ]}
              onPress={action.action}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={action.icon as any}
                size={20}
                color={disabled ? theme.colors.onSurfaceDisabled : theme.colors.onSurface}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Surface>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    toolbar: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    toolbarContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
    },
    buttonGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toolbarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 2,
    },
    activeButton: {
      backgroundColor: theme.colors.primaryContainer,
    },
    disabledButton: {
      opacity: 0.5,
    },
    separator: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.outline,
      marginHorizontal: 8,
    },
    menu: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
  });
