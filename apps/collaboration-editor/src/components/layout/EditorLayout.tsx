'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  History,
  Activity,
  Users,
  Settings,
  Share2,
  Menu,
  X
} from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PresenceSidebar } from '@/components/editor/PresenceLayer';
import { CommentsSidebar } from '@/components/comments/CommentLayer';
import { VersionSidebar } from '@/components/versions/VersionSidebar';
import { ActivitySidebar } from '@/components/activity/ActivitySidebar';
import { DocumentHeader } from '@/components/document/DocumentHeader';
import { CollaborationToolbar } from '@/components/editor/CollaborationToolbar';
import { cn } from '@/lib/utils';

interface EditorLayoutProps {
  children: ReactNode;
}

export function EditorLayout({ children }: EditorLayoutProps) {
  const {
    showComments,
    showVersions,
    showActivity,
    toggleComments,
    toggleVersions,
    toggleActivity,
    sidebarWidth,
    setSidebarWidth,
    unreadActivities,
    collaborators,
  } = useCollaborationStore();

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'comments' | 'versions' | 'activity' | 'presence' | null>(null);

  const handleSidebarToggle = (sidebar: 'comments' | 'versions' | 'activity' | 'presence') => {
    if (activeSidebar === sidebar) {
      setActiveSidebar(null);
    } else {
      setActiveSidebar(sidebar);

      // Update store state
      switch (sidebar) {
        case 'comments':
          if (!showComments) toggleComments();
          break;
        case 'versions':
          if (!showVersions) toggleVersions();
          break;
        case 'activity':
          if (!showActivity) toggleActivity();
          break;
      }
    }
  };

  const activeCollaborators = Array.from(collaborators.values()).filter(u => u.status === 'active');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Document Header */}
      <DocumentHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-20 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <motion.div
          initial={{ x: -280 }}
          animate={{ x: showMobileMenu ? 0 : -280 }}
          className="lg:hidden fixed inset-y-0 left-0 z-40 w-70 bg-card border-r shadow-lg"
        >
          <div className="p-4 pt-20">
            <div className="space-y-2">
              <SidebarButton
                icon={MessageSquare}
                label="Comments"
                badge={Array.from(collaborators.values()).reduce((acc, user) => acc + user.id.length, 0)}
                active={activeSidebar === 'comments'}
                onClick={() => handleSidebarToggle('comments')}
              />
              <SidebarButton
                icon={History}
                label="Versions"
                active={activeSidebar === 'versions'}
                onClick={() => handleSidebarToggle('versions')}
              />
              <SidebarButton
                icon={Activity}
                label="Activity"
                badge={unreadActivities}
                active={activeSidebar === 'activity'}
                onClick={() => handleSidebarToggle('activity')}
              />
              <SidebarButton
                icon={Users}
                label="Presence"
                badge={activeCollaborators.length}
                active={activeSidebar === 'presence'}
                onClick={() => handleSidebarToggle('presence')}
              />
            </div>
          </div>
        </motion.div>

        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:flex flex-col w-16 bg-card border-r">
          <div className="flex flex-col items-center py-4 space-y-2">
            <SidebarButton
              icon={MessageSquare}
              label="Comments"
              badge={Array.from(collaborators.values()).reduce((acc, user) => acc + user.id.length, 0)}
              active={activeSidebar === 'comments'}
              onClick={() => handleSidebarToggle('comments')}
              compact
            />
            <SidebarButton
              icon={History}
              label="Versions"
              active={activeSidebar === 'versions'}
              onClick={() => handleSidebarToggle('versions')}
              compact
            />
            <SidebarButton
              icon={Activity}
              label="Activity"
              badge={unreadActivities}
              active={activeSidebar === 'activity'}
              onClick={() => handleSidebarToggle('activity')}
              compact
            />
            <SidebarButton
              icon={Users}
              label="Presence"
              badge={activeCollaborators.length}
              active={activeSidebar === 'presence'}
              onClick={() => handleSidebarToggle('presence')}
              compact
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Editor */}
          <div className="flex-1 flex flex-col">
            <CollaborationToolbar />
            <div className="flex-1 relative">
              {children}
            </div>
          </div>

          {/* Right Sidebar */}
          <AnimatePresence>
            {activeSidebar && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="flex-shrink-0"
                style={{ width: sidebarWidth }}
              >
                {/* Resize Handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startWidth = sidebarWidth;

                    const handleMouseMove = (e: MouseEvent) => {
                      const newWidth = startWidth - (e.clientX - startX);
                      setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />

                {/* Sidebar Content */}
                <div className="h-full overflow-hidden">
                  {activeSidebar === 'comments' && <CommentsSidebar />}
                  {activeSidebar === 'versions' && <VersionSidebar />}
                  {activeSidebar === 'activity' && <ActivitySidebar />}
                  {activeSidebar === 'presence' && <PresenceSidebar />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => setShowMobileMenu(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

function SidebarButton({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
  compact = false
}: SidebarButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size={compact ? 'icon' : 'sm'}
      onClick={onClick}
      className={cn(
        'relative transition-colors',
        compact ? 'w-10 h-10' : 'w-full justify-start',
        active && 'bg-primary text-primary-foreground'
      )}
      title={compact ? label : undefined}
    >
      <Icon className={cn('w-4 h-4', !compact && 'mr-2')} />
      {!compact && <span>{label}</span>}
      {badge !== undefined && badge > 0 && (
        <Badge
          variant={active ? 'secondary' : 'default'}
          className={cn(
            'absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center',
            compact ? 'min-w-5' : 'ml-auto relative top-0 right-0'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </Button>
  );
}
