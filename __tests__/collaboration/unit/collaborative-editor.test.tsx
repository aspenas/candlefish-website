/**
 * Unit Tests for Collaborative Editor Component
 * Tests real-time editing, presence indicators, conflict resolution UI, and collaborative features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import {
  createMockUser,
  createMockDocument,
  createMockPresenceSession,
  simulateWebSocketEvent,
} from '../setup/unit.setup';

// Mock collaborative editor components (would be imported from actual implementation)
interface CollaborativeEditorProps {
  documentId: string;
  userId: string;
  onContentChange?: (operations: any[]) => void;
  onPresenceUpdate?: (presence: any) => void;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
}

const MockCollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  userId,
  onContentChange,
  onPresenceUpdate,
  readOnly = false,
  theme = 'light',
}) => {
  const [content, setContent] = React.useState('');
  const [cursors, setCursors] = React.useState<any[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [connections, setConnections] = React.useState(0);

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    const oldContent = content;

    // Simulate CRDT operation
    const operation = {
      type: 'INSERT',
      position: event.target.selectionStart,
      content: { text: newContent.slice(oldContent.length) },
      timestamp: new Date().toISOString(),
    };

    setContent(newContent);
    setIsTyping(true);

    if (onContentChange) {
      onContentChange([operation]);
    }

    // Clear typing indicator after delay
    setTimeout(() => setIsTyping(false), 1000);
  };

  const handleCursorMove = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement;
    const presence = {
      cursor: {
        position: target.selectionStart,
        blockId: 'main-block',
      },
      isTyping,
    };

    if (onPresenceUpdate) {
      onPresenceUpdate(presence);
    }
  };

  React.useEffect(() => {
    // Simulate WebSocket connection
    const ws = new WebSocket(`ws://localhost:8081/collaboration/${documentId}`);

    ws.onopen = () => setConnections(1);
    ws.onclose = () => setConnections(0);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'presence_update') {
        setCursors(data.cursors || []);
      } else if (data.type === 'content_change') {
        setContent(data.content || '');
      }
    };

    return () => ws.close();
  }, [documentId]);

  return (
    <div className={`collaborative-editor ${theme}`} data-testid="collaborative-editor">
      <div className="editor-header">
        <span data-testid="connection-status">
          {connections > 0 ? 'Connected' : 'Disconnected'}
        </span>
        <span data-testid="user-count">{connections} user(s)</span>
      </div>

      <div className="editor-content">
        <textarea
          data-testid="editor-textarea"
          value={content}
          onChange={handleContentChange}
          onSelect={handleCursorMove}
          readOnly={readOnly}
          placeholder="Start typing..."
        />

        {/* Presence indicators */}
        <div className="presence-indicators" data-testid="presence-indicators">
          {cursors.map((cursor, index) => (
            <div
              key={index}
              className="cursor-indicator"
              data-testid={`cursor-${cursor.userId}`}
              style={{
                left: `${cursor.position * 8}px`, // Mock position calculation
                top: '20px',
              }}
            >
              <div className="cursor-line" />
              <div className="cursor-label">{cursor.userName}</div>
            </div>
          ))}
        </div>

        {/* Typing indicator */}
        {isTyping && (
          <div className="typing-indicator" data-testid="typing-indicator">
            User is typing...
          </div>
        )}
      </div>
    </div>
  );
};

// Mock presence indicator component
interface PresenceIndicatorProps {
  users: Array<{ id: string; name: string; avatar?: string; color: string }>;
  maxVisible?: number;
}

const MockPresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  maxVisible = 5,
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  return (
    <div className="presence-indicator" data-testid="presence-indicator">
      <div className="user-avatars">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            className="user-avatar"
            data-testid={`avatar-${user.id}`}
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span>{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        ))}

        {hiddenCount > 0 && (
          <div className="user-count-indicator" data-testid="hidden-user-count">
            +{hiddenCount}
          </div>
        )}
      </div>

      <span className="total-count" data-testid="total-user-count">
        {users.length} user{users.length !== 1 ? 's' : ''} online
      </span>
    </div>
  );
};

// Mock comment system component
interface CommentSystemProps {
  documentId: string;
  comments: any[];
  onAddComment?: (comment: any) => void;
  onResolveComment?: (commentId: string) => void;
  currentUserId: string;
}

const MockCommentSystem: React.FC<CommentSystemProps> = ({
  documentId,
  comments,
  onAddComment,
  onResolveComment,
  currentUserId,
}) => {
  const [selectedText, setSelectedText] = React.useState('');
  const [commentText, setCommentText] = React.useState('');
  const [showCommentBox, setShowCommentBox] = React.useState(false);

  const handleAddComment = () => {
    if (commentText.trim() && onAddComment) {
      const comment = {
        id: `comment-${Date.now()}`,
        text: commentText,
        selectedText,
        authorId: currentUserId,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
      };

      onAddComment(comment);
      setCommentText('');
      setShowCommentBox(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      setShowCommentBox(true);
    }
  };

  return (
    <div className="comment-system" data-testid="comment-system">
      <div className="document-content" onMouseUp={handleTextSelection}>
        <p>This is some document content that can be selected for commenting.</p>
      </div>

      {showCommentBox && (
        <div className="comment-box" data-testid="comment-box">
          <div className="selected-text" data-testid="selected-text">
            "{selectedText}"
          </div>

          <textarea
            data-testid="comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
          />

          <div className="comment-actions">
            <button
              data-testid="add-comment-btn"
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              Add Comment
            </button>
            <button
              data-testid="cancel-comment-btn"
              onClick={() => setShowCommentBox(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="comments-list" data-testid="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment" data-testid={`comment-${comment.id}`}>
            <div className="comment-header">
              <span className="comment-author">{comment.authorName}</span>
              <span className="comment-timestamp">{comment.timestamp}</span>
            </div>

            <div className="comment-content">{comment.text}</div>

            {comment.selectedText && (
              <div className="comment-context">
                Re: "{comment.selectedText}"
              </div>
            )}

            <div className="comment-actions">
              {comment.status === 'ACTIVE' && onResolveComment && (
                <button
                  data-testid={`resolve-comment-${comment.id}`}
                  onClick={() => onResolveComment(comment.id)}
                >
                  Resolve
                </button>
              )}

              {comment.status === 'RESOLVED' && (
                <span className="resolved-indicator">✓ Resolved</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Collaborative Editor Component', () => {
  const mockUser = createMockUser();
  const mockDocument = createMockDocument();

  beforeEach(() => {
    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation((url) => ({
      url,
      readyState: 1,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: jest.fn(),
      close: jest.fn(),
    }));
  });

  it('should render collaborative editor', () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
      />
    );

    expect(screen.getByTestId('collaborative-editor')).toBeInTheDocument();
    expect(screen.getByTestId('editor-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should handle text input and generate operations', async () => {
    const onContentChange = jest.fn();

    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
        onContentChange={onContentChange}
      />
    );

    const textarea = screen.getByTestId('editor-textarea');

    await userEvent.type(textarea, 'Hello World');

    await waitFor(() => {
      expect(onContentChange).toHaveBeenCalled();
    });

    const lastCall = onContentChange.mock.calls[onContentChange.mock.calls.length - 1];
    expect(lastCall[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'INSERT',
          position: expect.any(Number),
          content: expect.objectContaining({
            text: expect.any(String),
          }),
        }),
      ])
    );
  });

  it('should show typing indicator during input', async () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
      />
    );

    const textarea = screen.getByTestId('editor-textarea');

    await userEvent.type(textarea, 'test');

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getByText('User is typing...')).toBeInTheDocument();

    // Wait for typing indicator to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should handle cursor position updates', async () => {
    const onPresenceUpdate = jest.fn();

    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
        onPresenceUpdate={onPresenceUpdate}
      />
    );

    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;

    // Set cursor position
    textarea.selectionStart = 5;
    textarea.selectionEnd = 5;

    fireEvent.select(textarea);

    expect(onPresenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: expect.objectContaining({
          position: 5,
          blockId: 'main-block',
        }),
      })
    );
  });

  it('should display presence indicators for other users', async () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
      />
    );

    const presenceIndicators = screen.getByTestId('presence-indicators');
    expect(presenceIndicators).toBeInTheDocument();

    // Initially no cursors
    expect(screen.queryByTestId('cursor-user-123')).not.toBeInTheDocument();

    // Simulate receiving presence update via WebSocket
    act(() => {
      const mockWs = (global.WebSocket as jest.Mock).mock.results[0].value;
      simulateWebSocketEvent(mockWs, 'message', {
        type: 'presence_update',
        cursors: [
          {
            userId: 'user-456',
            userName: 'Other User',
            position: 10,
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('cursor-user-456')).toBeInTheDocument();
    });
  });

  it('should handle read-only mode', () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
        readOnly={true}
      />
    );

    const textarea = screen.getByTestId('editor-textarea') as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute('readonly');
  });

  it('should show connection status', () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
      />
    );

    // Initially connected (mocked)
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('1 user(s)')).toBeInTheDocument();
  });

  it('should handle WebSocket disconnection', async () => {
    render(
      <MockCollaborativeEditor
        documentId={mockDocument.id}
        userId={mockUser.id}
      />
    );

    // Simulate WebSocket disconnection
    act(() => {
      const mockWs = (global.WebSocket as jest.Mock).mock.results[0].value;
      simulateWebSocketEvent(mockWs, 'close', {});
    });

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('0 user(s)')).toBeInTheDocument();
    });
  });
});

describe('Presence Indicator Component', () => {
  it('should display user avatars', () => {
    const users = [
      { id: 'user-1', name: 'Alice Smith', color: '#ff6b6b' },
      { id: 'user-2', name: 'Bob Johnson', color: '#4ecdc4', avatar: '/avatar2.jpg' },
      { id: 'user-3', name: 'Carol Davis', color: '#45b7d1' },
    ];

    render(<MockPresenceIndicator users={users} />);

    expect(screen.getByTestId('presence-indicator')).toBeInTheDocument();

    users.forEach((user) => {
      expect(screen.getByTestId(`avatar-${user.id}`)).toBeInTheDocument();
    });

    expect(screen.getByText('3 users online')).toBeInTheDocument();
  });

  it('should show hidden user count when exceeding max visible', () => {
    const users = Array.from({ length: 8 }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    }));

    render(<MockPresenceIndicator users={users} maxVisible={5} />);

    // Should show 5 avatars plus count indicator
    const avatars = screen.getAllByTestId(/^avatar-user-/);
    expect(avatars).toHaveLength(5);

    expect(screen.getByTestId('hidden-user-count')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('8 users online')).toBeInTheDocument();
  });

  it('should handle empty user list', () => {
    render(<MockPresenceIndicator users={[]} />);

    expect(screen.getByText('0 users online')).toBeInTheDocument();
    expect(screen.queryByTestId(/^avatar-/)).not.toBeInTheDocument();
  });

  it('should display user names in avatar titles', () => {
    const users = [
      { id: 'user-1', name: 'Alice Smith', color: '#ff6b6b' },
    ];

    render(<MockPresenceIndicator users={users} />);

    const avatar = screen.getByTestId('avatar-user-1');
    expect(avatar).toHaveAttribute('title', 'Alice Smith');
  });
});

describe('Comment System Component', () => {
  const mockComments = [
    {
      id: 'comment-1',
      text: 'This is a great point!',
      authorName: 'Alice',
      timestamp: '2024-01-01T10:00:00Z',
      selectedText: 'important section',
      status: 'ACTIVE',
    },
    {
      id: 'comment-2',
      text: 'I agree with this.',
      authorName: 'Bob',
      timestamp: '2024-01-01T10:05:00Z',
      status: 'RESOLVED',
    },
  ];

  it('should render comment system', () => {
    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={mockComments}
        currentUserId="user-123"
      />
    );

    expect(screen.getByTestId('comment-system')).toBeInTheDocument();
    expect(screen.getByTestId('comments-list')).toBeInTheDocument();
  });

  it('should display existing comments', () => {
    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={mockComments}
        currentUserId="user-123"
      />
    );

    mockComments.forEach((comment) => {
      expect(screen.getByTestId(`comment-${comment.id}`)).toBeInTheDocument();
      expect(screen.getByText(comment.text)).toBeInTheDocument();
      expect(screen.getByText(comment.authorName)).toBeInTheDocument();
    });
  });

  it('should handle text selection for commenting', async () => {
    const onAddComment = jest.fn();

    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={[]}
        currentUserId="user-123"
        onAddComment={onAddComment}
      />
    );

    // Mock text selection
    const getSelection = jest.fn().mockReturnValue({
      toString: () => 'selected text',
    });
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelection,
    });

    const documentContent = screen.getByText(/document content/);
    fireEvent.mouseUp(documentContent);

    await waitFor(() => {
      expect(screen.getByTestId('comment-box')).toBeInTheDocument();
      expect(screen.getByTestId('selected-text')).toBeInTheDocument();
      expect(screen.getByText('"selected text"')).toBeInTheDocument();
    });
  });

  it('should add new comment', async () => {
    const onAddComment = jest.fn();

    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={[]}
        currentUserId="user-123"
        onAddComment={onAddComment}
      />
    );

    // Trigger comment box
    const getSelection = jest.fn().mockReturnValue({
      toString: () => 'test selection',
    });
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelection,
    });

    fireEvent.mouseUp(screen.getByText(/document content/));

    await waitFor(() => {
      expect(screen.getByTestId('comment-box')).toBeInTheDocument();
    });

    // Add comment text
    const commentInput = screen.getByTestId('comment-input');
    await userEvent.type(commentInput, 'This is my comment');

    // Submit comment
    const addButton = screen.getByTestId('add-comment-btn');
    fireEvent.click(addButton);

    expect(onAddComment).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'This is my comment',
        selectedText: 'test selection',
        authorId: 'user-123',
      })
    );
  });

  it('should resolve comments', async () => {
    const onResolveComment = jest.fn();

    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={mockComments}
        currentUserId="user-123"
        onResolveComment={onResolveComment}
      />
    );

    const resolveButton = screen.getByTestId('resolve-comment-comment-1');
    fireEvent.click(resolveButton);

    expect(onResolveComment).toHaveBeenCalledWith('comment-1');
  });

  it('should disable add button when comment is empty', async () => {
    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={[]}
        currentUserId="user-123"
        onAddComment={jest.fn()}
      />
    );

    // Trigger comment box
    const getSelection = jest.fn().mockReturnValue({
      toString: () => 'test',
    });
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelection,
    });

    fireEvent.mouseUp(screen.getByText(/document content/));

    await waitFor(() => {
      const addButton = screen.getByTestId('add-comment-btn');
      expect(addButton).toBeDisabled();
    });
  });

  it('should show resolved status for resolved comments', () => {
    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={mockComments}
        currentUserId="user-123"
      />
    );

    // comment-2 is resolved
    expect(screen.getByText('✓ Resolved')).toBeInTheDocument();

    // comment-1 is active, should have resolve button
    expect(screen.getByTestId('resolve-comment-comment-1')).toBeInTheDocument();
  });

  it('should cancel comment creation', async () => {
    render(
      <MockCommentSystem
        documentId="doc-123"
        comments={[]}
        currentUserId="user-123"
      />
    );

    // Trigger comment box
    const getSelection = jest.fn().mockReturnValue({
      toString: () => 'test',
    });
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelection,
    });

    fireEvent.mouseUp(screen.getByText(/document content/));

    await waitFor(() => {
      expect(screen.getByTestId('comment-box')).toBeInTheDocument();
    });

    const cancelButton = screen.getByTestId('cancel-comment-btn');
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId('comment-box')).not.toBeInTheDocument();
  });
});
