'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollaborationStore, CollaborationUser } from '@/stores/collaboration-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Color palette for user cursors
const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

interface UserCursorProps {
  user: CollaborationUser;
  position: { x: number; y: number };
}

function UserCursor({ user, position }: UserCursorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const blinkTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle cursor blinking animation
  useEffect(() => {
    const blink = () => {
      setIsVisible(false);
      setTimeout(() => setIsVisible(true), 500);
      blinkTimeoutRef.current = setTimeout(blink, 1000);
    };

    blinkTimeoutRef.current = setTimeout(blink, 1000);

    return () => {
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isVisible ? 1 : 0.3, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className="absolute pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y,
        color: user.color,
      }}
    >
      {/* Cursor Line */}
      <div
        className="w-0.5 h-5 bg-current"
        style={{ backgroundColor: user.color }}
      />

      {/* User Info Tooltip */}
      <div
        className="absolute -top-8 left-0 px-2 py-1 text-xs text-white rounded whitespace-nowrap shadow-lg"
        style={{ backgroundColor: user.color }}
      >
        <div className="flex items-center space-x-1">
          <Avatar className="w-4 h-4">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{user.name}</span>
          {user.isTyping && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex space-x-0.5"
            >
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface UserSelectionProps {
  user: CollaborationUser;
  selection: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    rects: DOMRect[];
  };
}

function UserSelection({ user, selection }: UserSelectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.3 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute pointer-events-none z-40"
    >
      {selection.rects.map((rect, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            backgroundColor: user.color,
            borderRadius: '2px',
          }}
        />
      ))}
    </motion.div>
  );
}

interface TypingIndicatorProps {
  user: CollaborationUser;
  position: { x: number; y: number };
}

function TypingIndicator({ user, position }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="absolute pointer-events-none z-50"
      style={{
        left: position.x,
        top: position.y - 30,
      }}
    >
      <div
        className="px-2 py-1 text-xs text-white rounded-full shadow-lg flex items-center space-x-1"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.name} is typing</span>
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex space-x-0.5"
        >
          <div className="w-1 h-1 bg-white rounded-full" />
          <div className="w-1 h-1 bg-white rounded-full" />
          <div className="w-1 h-1 bg-white rounded-full" />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function PresenceLayer() {
  const { collaborators, currentUser } = useCollaborationStore();
  const [userPositions, setUserPositions] = useState<Map<string, any>>(new Map());
  const editorRef = useRef<HTMLElement>(null);

  // Helper function to calculate DOM positions from block positions
  const calculateDOMPosition = useCallback((blockId: string, offset: number) => {
    if (!editorRef.current) return null;

    try {
      // Find the element with the block ID
      const blockElement = editorRef.current.querySelector(`[data-lexical-editor="true"] [data-key="${blockId}"]`);
      if (!blockElement) return null;

      const textNode = blockElement.childNodes[0];
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;

      // Create a range to get the position
      const range = document.createRange();
      range.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
      range.setEnd(textNode, Math.min(offset, textNode.textContent?.length || 0));

      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      return {
        x: rect.left - editorRect.left,
        y: rect.top - editorRect.top,
      };
    } catch (error) {
      console.warn('Error calculating DOM position:', error);
      return null;
    }
  }, []);

  // Helper function to calculate selection rectangles
  const calculateSelectionRects = useCallback((selection: any) => {
    if (!editorRef.current || !selection) return [];

    try {
      const startElement = editorRef.current.querySelector(`[data-key="${selection.start.blockId}"]`);
      const endElement = editorRef.current.querySelector(`[data-key="${selection.end.blockId}"]`);

      if (!startElement || !endElement) return [];

      const range = document.createRange();

      if (startElement === endElement) {
        // Selection within the same element
        const textNode = startElement.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          range.setStart(textNode, selection.start.offset);
          range.setEnd(textNode, selection.end.offset);
        }
      } else {
        // Selection spans multiple elements
        const startTextNode = startElement.childNodes[0];
        const endTextNode = endElement.childNodes[0];

        if (startTextNode && endTextNode) {
          range.setStart(startTextNode, selection.start.offset);
          range.setEnd(endTextNode, selection.end.offset);
        }
      }

      const rects = Array.from(range.getClientRects());
      const editorRect = editorRef.current.getBoundingClientRect();

      return rects.map(rect => ({
        left: rect.left - editorRect.left,
        top: rect.top - editorRect.top,
        width: rect.width,
        height: rect.height,
      }));
    } catch (error) {
      console.warn('Error calculating selection rects:', error);
      return [];
    }
  }, []);

  // Update user positions when collaborators change
  useEffect(() => {
    const updatePositions = () => {
      const newPositions = new Map();

      collaborators.forEach((user) => {
        if (user.id === currentUser?.id) return; // Don't show own cursor

        // Calculate cursor position
        if (user.cursor) {
          const cursorPos = calculateDOMPosition(user.cursor.blockId, user.cursor.offset);
          if (cursorPos) {
            newPositions.set(user.id, {
              ...newPositions.get(user.id),
              cursor: cursorPos,
            });
          }
        }

        // Calculate selection rectangles
        if (user.selection && !user.selection.isCollapsed) {
          const selectionRects = calculateSelectionRects(user.selection);
          if (selectionRects.length > 0) {
            newPositions.set(user.id, {
              ...newPositions.get(user.id),
              selection: {
                start: { x: selectionRects[0].left, y: selectionRects[0].top },
                end: {
                  x: selectionRects[selectionRects.length - 1].left + selectionRects[selectionRects.length - 1].width,
                  y: selectionRects[selectionRects.length - 1].top
                },
                rects: selectionRects,
              },
            });
          }
        }
      });

      setUserPositions(newPositions);
    };

    // Update positions immediately
    updatePositions();

    // Set up a periodic update to handle scroll/resize
    const interval = setInterval(updatePositions, 100);

    return () => clearInterval(interval);
  }, [collaborators, currentUser, calculateDOMPosition, calculateSelectionRects]);

  // Assign colors to users
  useEffect(() => {
    collaborators.forEach((user, index) => {
      if (!user.color) {
        const colorIndex = index % USER_COLORS.length;
        user.color = USER_COLORS[colorIndex];
      }
    });
  }, [collaborators]);

  // Set up editor ref
  useEffect(() => {
    const editorElement = document.querySelector('[data-lexical-editor="true"]') as HTMLElement;
    if (editorElement) {
      editorRef.current = editorElement;
    }
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {Array.from(collaborators.values()).map((user) => {
          if (user.id === currentUser?.id) return null;

          const userPos = userPositions.get(user.id);

          return (
            <div key={user.id}>
              {/* User Cursor */}
              {userPos?.cursor && (
                <UserCursor
                  user={user}
                  position={userPos.cursor}
                />
              )}

              {/* User Selection */}
              {userPos?.selection && (
                <UserSelection
                  user={user}
                  selection={userPos.selection}
                />
              )}

              {/* Typing Indicator */}
              {user.isTyping && userPos?.cursor && (
                <TypingIndicator
                  user={user}
                  position={userPos.cursor}
                />
              )}
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Presence sidebar showing all active users
export function PresenceSidebar({ className }: { className?: string }) {
  const { collaborators, currentUser } = useCollaborationStore();
  const allUsers = currentUser ? [currentUser, ...Array.from(collaborators.values())] : Array.from(collaborators.values());

  return (
    <div className={cn("p-4 bg-card border-l", className)}>
      <h3 className="text-sm font-medium mb-3">Active Users ({allUsers.length})</h3>
      <div className="space-y-2">
        {allUsers.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Status indicator */}
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                  user.status === 'active' && "bg-collaboration-presence-active",
                  user.status === 'away' && "bg-collaboration-presence-away",
                  user.status === 'idle' && "bg-collaboration-presence-idle"
                )}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.name}
                {user.id === currentUser?.id && (
                  <span className="text-muted-foreground"> (You)</span>
                )}
              </p>
              <div className="flex items-center space-x-2">
                {/* User color indicator */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: user.color }}
                />

                {/* Activity status */}
                <p className="text-xs text-muted-foreground">
                  {user.isTyping ? 'Typing...' :
                   user.currentAction || 'Viewing'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
