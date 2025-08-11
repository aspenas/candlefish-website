'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Reply, Check, X, MoreHorizontal, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useCollaborationStore, Comment } from '@/stores/collaboration-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CommentAnchorProps {
  comment: Comment;
  isSelected: boolean;
  onSelect: () => void;
}

function CommentAnchor({ comment, isSelected, onSelect }: CommentAnchorProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const editorRef = useRef<HTMLElement>();

  // Calculate anchor position based on comment position
  useEffect(() => {
    const calculatePosition = () => {
      if (!comment.position || !editorRef.current) return;

      try {
        const blockElement = editorRef.current.querySelector(`[data-key="${comment.position.blockId}"]`);
        if (!blockElement) return;

        const textNode = blockElement.childNodes[0];
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

        const range = document.createRange();
        range.setStart(textNode, comment.position.startOffset);
        range.setEnd(textNode, comment.position.endOffset);

        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();

        setPosition({
          x: rect.right - editorRect.left,
          y: rect.top - editorRect.top,
        });
      } catch (error) {
        console.warn('Error calculating comment anchor position:', error);
      }
    };

    const editorElement = document.querySelector('[data-lexical-editor="true"]') as HTMLElement;
    if (editorElement) {
      editorRef.current = editorElement;
      calculatePosition();
    }

    // Recalculate on scroll/resize
    const interval = setInterval(calculatePosition, 100);
    return () => clearInterval(interval);
  }, [comment.position]);

  if (!position) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "absolute z-40 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-medium cursor-pointer transition-colors",
        isSelected ? "bg-collaboration-comment-hover" : "bg-collaboration-comment",
        comment.status === 'resolved' && "bg-collaboration-comment-resolved"
      )}
      style={{
        left: position.x + 4,
        top: position.y,
      }}
      onClick={onSelect}
      title={`${comment.author.name}: ${comment.content.substring(0, 50)}...`}
    >
      <MessageCircle className="w-3 h-3" />
      {comment.replies.length > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs"
        >
          {comment.replies.length}
        </Badge>
      )}
    </motion.button>
  );
}

interface CommentBubbleProps {
  comment: Comment;
  onReply: (content: string) => void;
  onResolve: () => void;
  onDelete: () => void;
  onReact: (type: string) => void;
}

function CommentBubble({ comment, onReply, onResolve, onDelete, onReact }: CommentBubbleProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const { currentUser } = useCollaborationStore();

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(replyContent);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const isAuthor = currentUser?.id === comment.author.id;
  const canResolve = isAuthor || comment.status !== 'resolved';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4 max-w-sm"
    >
      {/* Comment Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
            <AvatarFallback className="text-xs">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{comment.author.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {comment.status === 'resolved' && (
            <Badge variant="secondary" className="text-xs">
              <Check className="w-3 h-3 mr-1" />
              Resolved
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsReplying(true)}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
              {canResolve && (
                <DropdownMenuItem onClick={onResolve}>
                  <Check className="w-4 h-4 mr-2" />
                  {comment.status === 'resolved' ? 'Unresolve' : 'Resolve'}
                </DropdownMenuItem>
              )}
              {isAuthor && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Comment Content */}
      <div className="mb-3">
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div className="flex items-center space-x-2 mb-3">
          {comment.reactions.map((reaction) => (
            <Button
              key={reaction.type}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onReact(reaction.type)}
            >
              {reaction.type === 'like' && <ThumbsUp className="w-3 h-3 mr-1" />}
              {reaction.type === 'love' && <Heart className="w-3 h-3 mr-1" />}
              {reaction.type === 'dislike' && <ThumbsDown className="w-3 h-3 mr-1" />}
              {reaction.users.length}
            </Button>
          ))}
        </div>
      )}

      {/* Quick Reactions */}
      <div className="flex items-center space-x-1 mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onReact('like')}
        >
          👍
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onReact('love')}
        >
          ❤️
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setIsReplying(true)}
        >
          Reply
        </Button>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="space-y-2 border-l-2 border-muted pl-3 ml-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="pb-2">
              <div className="flex items-center space-x-2 mb-1">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                  <AvatarFallback className="text-xs">
                    {reply.author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium">{reply.author.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                </p>
              </div>
              <p className="text-xs text-foreground">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {isReplying && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px] text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitReply();
              }
              if (e.key === 'Escape') {
                setIsReplying(false);
                setReplyContent('');
              }
            }}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press Cmd+Enter to send, Esc to cancel
            </p>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsReplying(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim()}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface CommentLayerProps {
  documentId: string;
}

export function CommentLayer({ documentId }: CommentLayerProps) {
  const {
    comments,
    selectedComment,
    setSelectedComment,
    addCommentReply,
    resolveComment,
    deleteComment,
    updateComment
  } = useCollaborationStore();

  const selectedCommentData = selectedComment ? comments.get(selectedComment) : null;

  const handleReply = useCallback((content: string) => {
    if (!selectedCommentData || !selectedComment) return;

    const reply: Comment = {
      id: Date.now().toString(),
      content,
      author: {
        id: 'current-user', // This would come from auth context
        name: 'Current User',
        color: '#3b82f6',
        status: 'active',
        isTyping: false,
        lastSeen: new Date(),
      },
      replies: [],
      reactions: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addCommentReply(selectedComment, reply);
  }, [selectedCommentData, selectedComment, addCommentReply]);

  const handleResolve = useCallback(() => {
    if (!selectedComment) return;
    resolveComment(selectedComment);
  }, [selectedComment, resolveComment]);

  const handleDelete = useCallback(() => {
    if (!selectedComment) return;
    deleteComment(selectedComment);
    setSelectedComment(null);
  }, [selectedComment, deleteComment, setSelectedComment]);

  const handleReact = useCallback((type: string) => {
    if (!selectedComment) return;

    // Update comment reactions
    const comment = comments.get(selectedComment);
    if (comment) {
      const existingReaction = comment.reactions.find(r => r.type === type);
      if (existingReaction) {
        // Toggle reaction
        const userIndex = existingReaction.users.indexOf('current-user');
        if (userIndex >= 0) {
          existingReaction.users.splice(userIndex, 1);
        } else {
          existingReaction.users.push('current-user');
        }
      } else {
        // Add new reaction
        comment.reactions.push({
          type,
          users: ['current-user'],
        });
      }

      updateComment(selectedComment, { reactions: comment.reactions });
    }
  }, [selectedComment, comments, updateComment]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Comment Anchors */}
      <AnimatePresence>
        {Array.from(comments.values()).map((comment) => (
          <CommentAnchor
            key={comment.id}
            comment={comment}
            isSelected={selectedComment === comment.id}
            onSelect={() => setSelectedComment(comment.id)}
          />
        ))}
      </AnimatePresence>

      {/* Selected Comment Bubble */}
      <AnimatePresence>
        {selectedCommentData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed right-4 top-1/2 transform -translate-y-1/2 pointer-events-auto z-50"
          >
            <CommentBubble
              comment={selectedCommentData}
              onReply={handleReply}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onReact={handleReact}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {selectedCommentData && (
        <div
          className="fixed inset-0 pointer-events-auto z-20"
          onClick={() => setSelectedComment(null)}
        />
      )}
    </div>
  );
}

// Comments sidebar for managing all comments
export function CommentsSidebar({ className }: { className?: string }) {
  const {
    comments,
    selectedComment,
    setSelectedComment,
    showComments,
    toggleComments
  } = useCollaborationStore();

  const sortedComments = Array.from(comments.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const activeComments = sortedComments.filter(c => c.status === 'active');
  const resolvedComments = sortedComments.filter(c => c.status === 'resolved');

  if (!showComments) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className={cn(
        "w-80 bg-card border-l h-full flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Comments</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleComments}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
          <span>{activeComments.length} active</span>
          <span>{resolvedComments.length} resolved</span>
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Active Comments */}
        {activeComments.length > 0 && (
          <div className="p-4">
            <h4 className="text-sm font-medium mb-3">Active Comments</h4>
            <div className="space-y-3">
              {activeComments.map((comment) => (
                <motion.div
                  key={comment.id}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer border transition-colors",
                    selectedComment === comment.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedComment(comment.id)}
                >
                  <div className="flex items-start space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{comment.author.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </p>
                      <p className="text-sm text-foreground line-clamp-2">
                        {comment.content}
                      </p>
                      {comment.replies.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved Comments */}
        {resolvedComments.length > 0 && (
          <div className="p-4 border-t">
            <h4 className="text-sm font-medium mb-3">Resolved Comments</h4>
            <div className="space-y-3">
              {resolvedComments.map((comment) => (
                <motion.div
                  key={comment.id}
                  className="p-3 rounded-lg border opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedComment(comment.id)}
                >
                  <div className="flex items-start space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{comment.author.name}</p>
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </p>
                      <p className="text-sm text-foreground line-clamp-2">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedComments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No comments yet</h3>
            <p className="text-sm text-muted-foreground">
              Select text in the document to add comments and start discussions.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
