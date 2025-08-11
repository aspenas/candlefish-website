'use client';

import { useState } from 'react';
import { Share2, Settings, Save, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { cn } from '@/lib/utils';

export function DocumentHeader() {
  const {
    collaborators,
    currentUser,
    isConnected,
    connectionQuality,
    lastSyncTime
  } = useCollaborationStore();

  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [isEditing, setIsEditing] = useState(false);

  const activeUsers = Array.from(collaborators.values()).filter(u => u.status === 'active');
  const allUsers = currentUser ? [currentUser, ...activeUsers] : activeUsers;

  const handleTitleEdit = () => {
    setIsEditing(true);
  };

  const handleTitleSave = () => {
    setIsEditing(false);
    // In real implementation, this would save to backend
  };

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-4">
      {/* Left side - Document title and status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                }
              }}
              className="text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-primary rounded px-1"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-medium cursor-pointer hover:bg-accent rounded px-1 py-0.5"
              onClick={handleTitleEdit}
            >
              {documentTitle}
            </h1>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span>
            {isConnected ? 'Connected' : 'Offline'}
          </span>
          {lastSyncTime && (
            <span className="text-xs">
              • Last saved {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Right side - Collaborators and actions */}
      <div className="flex items-center space-x-4">
        {/* Active Collaborators */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {allUsers.slice(0, 5).map((user) => (
              <Avatar key={user.id} className="w-8 h-8 border-2 border-background">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {allUsers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                +{allUsers.length - 5}
              </div>
            )}
          </div>

          {allUsers.length > 0 && (
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">
              <Users className="w-4 h-4 mr-1" />
              {allUsers.length} {allUsers.length === 1 ? 'editor' : 'editors'}
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>

          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>

          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
