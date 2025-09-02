'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@apollo/client';
import {
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCollaborationStore, usePresenceUsers, useConnectionState } from '@/stores/collaboration-store';
import { useWebSocketCollaboration } from '@/lib/websocket-manager';
import { GET_DOCUMENT } from '@/graphql/operations';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { DocumentTree } from '@/components/tree/DocumentTree';
import { VersionTimeline } from '@/components/versions/VersionTimeline';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import { ActivitySidebar } from '@/components/activity/ActivitySidebar';
import { CommentLayer } from '@/components/comments/CommentLayer';

interface CollaborationLayoutProps {
  projectId: string;
  documentId?: string;
  initialDocument?: any;
  className?: string;
}

interface PanelState {
  documentTree: boolean;
  versions: boolean;
  comments: boolean;
  aiSuggestions: boolean;
  activity: boolean;
}

interface LayoutBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

const BREAKPOINTS: LayoutBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 500;
const SIDEBAR_WIDTH = 320;

export function CollaborationLayout({
  projectId,
  documentId,
  initialDocument,
  className,
}: CollaborationLayoutProps) {
  // State management
  const [panels, setPanels] = useState<PanelState>({
    documentTree: true,
    versions: false,
    comments: false,
    aiSuggestions: false,
    activity: false,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(SIDEBAR_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(SIDEBAR_WIDTH);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(documentId || null);

  // Refs
  const layoutRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);

  // Store and hooks
  const {
    showComments,
    showVersions,
    showActivity,
    sidebarWidth,
    setSidebarWidth,
    toggleComments,
    toggleVersions,
    toggleActivity,
  } = useCollaborationStore();

  const { currentUser, collaborators } = usePresenceUsers();
  const { isConnected, connectionQuality } = useConnectionState();

  // WebSocket connection
  useWebSocketCollaboration(selectedDocument);

  // GraphQL query for document
  const { data: documentData, loading, error } = useQuery(GET_DOCUMENT, {
    variables: { id: selectedDocument },
    skip: !selectedDocument,
  });

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < BREAKPOINTS.mobile);
      setIsTablet(width >= BREAKPOINTS.mobile && width < BREAKPOINTS.desktop);

      // Auto-collapse panels on smaller screens
      if (width < BREAKPOINTS.tablet) {
        setPanels(prev => ({
          ...prev,
          documentTree: false,
          versions: false,
          comments: false,
          aiSuggestions: false,
          activity: false,
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Panel resize handlers
  const handleMouseDown = useCallback((side: 'left' | 'right', event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(side);
    dragStartX.current = event.clientX;
    dragStartWidth.current = side === 'left' ? leftPanelWidth : rightPanelWidth;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanelWidth, rightPanelWidth]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStartX.current;
    const newWidth = Math.min(
      PANEL_MAX_WIDTH,
      Math.max(PANEL_MIN_WIDTH, dragStartWidth.current + (isDragging === 'left' ? deltaX : -deltaX))
    );

    if (isDragging === 'left') {
      setLeftPanelWidth(newWidth);
    } else {
      setRightPanelWidth(newWidth);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Panel toggle handlers
  const togglePanel = useCallback((panelName: keyof PanelState) => {
    setPanels(prev => {
      const newState = { ...prev };
      
      if (isMobile) {
        // On mobile, only one panel at a time
        Object.keys(newState).forEach(key => {
          newState[key as keyof PanelState] = key === panelName ? !prev[panelName] : false;
        });
      } else {
        newState[panelName] = !prev[panelName];
      }
      
      return newState;
    });
  }, [isMobile]);

  const handleDocumentSelect = useCallback((docId: string, path: string[]) => {
    setSelectedDocument(docId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      layoutRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Connection status indicator
  const getConnectionIndicator = () => {
    if (!isConnected) {
      return (
        <div className="flex items-center space-x-1 text-red-600">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs">Offline</span>
        </div>
      );
    }

    const colors = {
      excellent: 'text-green-600',
      good: 'text-yellow-600',
      poor: 'text-orange-600',
      offline: 'text-red-600',
    };

    return (
      <div className={cn("flex items-center space-x-1", colors[connectionQuality])}>
        <div className={cn("w-2 h-2 rounded-full", {
          'bg-green-500': connectionQuality === 'excellent',
          'bg-yellow-500': connectionQuality === 'good',
          'bg-orange-500': connectionQuality === 'poor',
          'bg-red-500': connectionQuality === 'offline',
        })} />
        <span className="text-xs capitalize">{connectionQuality}</span>
      </div>
    );
  };

  // Render mobile header
  const renderMobileHeader = () => (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Bars3Icon className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold truncate">
          {documentData?.document?.title || 'Untitled Document'}
        </h1>
      </div>

      <div className="flex items-center space-x-2">
        {/* Collaborators */}
        <div className="flex -space-x-2">
          {collaborators.slice(0, 3).map((user) => (
            <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-xs">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
          {collaborators.length > 3 && (
            <div className="h-6 w-6 bg-muted border-2 border-background rounded-full flex items-center justify-center">
              <span className="text-xs">+{collaborators.length - 3}</span>
            </div>
          )}
        </div>

        {/* Connection status */}
        {getConnectionIndicator()}
      </div>
    </div>
  );

  // Render desktop header
  const renderDesktopHeader = () => (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">
          {documentData?.document?.title || 'Untitled Document'}
        </h1>
        <Badge variant="secondary" className="text-xs">
          {documentData?.document?.status || 'Draft'}
        </Badge>
      </div>

      <div className="flex items-center space-x-4">
        {/* Panel toggles */}
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panels.documentTree ? "default" : "ghost"}
                size="sm"
                onClick={() => togglePanel('documentTree')}
              >
                <DocumentTextIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Document Tree</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panels.versions ? "default" : "ghost"}
                size="sm"
                onClick={() => togglePanel('versions')}
              >
                <ClockIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Version History</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panels.comments ? "default" : "ghost"}
                size="sm"
                onClick={() => togglePanel('comments')}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Comments</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panels.aiSuggestions ? "default" : "ghost"}
                size="sm"
                onClick={() => togglePanel('aiSuggestions')}
              >
                <SparklesIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI Suggestions</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panels.activity ? "default" : "ghost"}
                size="sm"
                onClick={() => togglePanel('activity')}
              >
                <UsersIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Activity</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Collaborators */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {collaborators.slice(0, 5).map((user) => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 border-2 border-background cursor-pointer">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-2 h-2 rounded-full", {
                      'bg-green-500': user.status === 'active',
                      'bg-yellow-500': user.status === 'away',
                      'bg-gray-500': user.status === 'idle',
                    })} />
                    <span>{user.name}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            {collaborators.length > 5 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 w-8 bg-muted border-2 border-background rounded-full flex items-center justify-center cursor-pointer">
                    <span className="text-xs">+{collaborators.length - 5}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{collaborators.length - 5} more collaborators</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="h-4 w-4" />
                ) : (
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p>
            </TooltipContent>
          </Tooltip>

          {getConnectionIndicator()}
        </div>
      </div>
    </div>
  );

  // Calculate the number of visible panels
  const visiblePanels = Object.values(panels).filter(Boolean).length;
  const leftPanelVisible = panels.documentTree;
  const rightPanelVisible = panels.versions || panels.comments || panels.aiSuggestions || panels.activity;

  return (
    <div
      ref={layoutRef}
      className={cn("flex flex-col h-screen bg-background", className)}
    >
      {/* Header */}
      {isMobile ? renderMobileHeader() : renderDesktopHeader()}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="absolute inset-0 bg-black/50" />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-80 max-w-sm h-full bg-background shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="font-semibold">Navigation</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </Button>
                </div>
                
                <DocumentTree
                  projectId={projectId}
                  selectedDocumentId={selectedDocument}
                  onDocumentSelect={handleDocumentSelect}
                  className="h-full"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Panel */}
        <AnimatePresence>
          {leftPanelVisible && !isMobile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: leftPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0 border-r bg-muted/30 relative"
            >
              <DocumentTree
                projectId={projectId}
                selectedDocumentId={selectedDocument}
                onDocumentSelect={handleDocumentSelect}
                className="h-full"
              />
              
              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize transition-colors"
                onMouseDown={(e) => handleMouseDown('left', e)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden">
            {selectedDocument ? (
              <CollaborativeEditor
                documentId={selectedDocument}
                initialContent={documentData?.document?.content}
                className="h-full"
                placeholder="Start writing your document..."
              />
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div className="space-y-4">
                  <DocumentTextIcon className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      Select a document to start editing
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Choose a document from the sidebar or create a new one
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comment Layer Overlay */}
            {selectedDocument && (
              <CommentLayer documentId={selectedDocument} />
            )}
          </div>
        </div>

        {/* Right Panel */}
        <AnimatePresence>
          {rightPanelVisible && !isMobile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightPanelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0 border-l bg-muted/30 relative"
            >
              {/* Resize Handle */}
              <div
                className="absolute top-0 left-0 w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize transition-colors"
                onMouseDown={(e) => handleMouseDown('right', e)}
              />

              <div className="flex flex-col h-full">
                {panels.versions && selectedDocument && (
                  <VersionTimeline
                    documentId={selectedDocument}
                    className="flex-1"
                  />
                )}

                {panels.comments && selectedDocument && (
                  <div className="flex-1">
                    {/* Comments panel would go here */}
                    <div className="p-4">Comments Panel (Implementation needed)</div>
                  </div>
                )}

                {panels.aiSuggestions && selectedDocument && (
                  <AISuggestionsPanel
                    documentId={selectedDocument}
                    className="flex-1"
                  />
                )}

                {panels.activity && selectedDocument && (
                  <ActivitySidebar
                    documentId={selectedDocument}
                    className="flex-1"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Panel */}
        <AnimatePresence>
          {isMobile && visiblePanels > 0 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: '50vh' }}
              exit={{ height: 0 }}
              className="border-t bg-background overflow-hidden"
            >
              <div className="h-full">
                {panels.versions && selectedDocument && (
                  <VersionTimeline
                    documentId={selectedDocument}
                    className="h-full"
                  />
                )}
                {panels.aiSuggestions && selectedDocument && (
                  <AISuggestionsPanel
                    documentId={selectedDocument}
                    className="h-full"
                  />
                )}
                {panels.activity && selectedDocument && (
                  <ActivitySidebar
                    documentId={selectedDocument}
                    className="h-full"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-destructive">Failed to load document</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}