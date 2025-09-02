'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { diffWords, diffLines, Change } from 'diff';
import { cn } from '@/lib/utils';
import { GET_DOCUMENT_VERSIONS, CREATE_VERSION } from '@/graphql/operations';
import { useVersionState } from '@/stores/collaboration-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VersionTimelineProps {
  documentId: string;
  currentContent?: string;
  onVersionSelect?: (versionId: string) => void;
  onVersionRestore?: (versionId: string) => void;
  className?: string;
}

interface Version {
  id: string;
  version: string;
  name?: string;
  description?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  changes: {
    type: 'insert' | 'delete' | 'format' | 'move';
    position: number;
    content?: any;
    length?: number;
  }[];
  createdAt: string;
  isCurrent: boolean;
  content?: string;
  wordCount?: number;
  changeCount?: number;
}

interface DiffViewerProps {
  oldText: string;
  newText: string;
  viewMode: 'unified' | 'split';
  showLineNumbers?: boolean;
}

interface VersionItemProps {
  version: Version;
  previousVersion?: Version;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (version: Version) => void;
  onToggle: (versionId: string) => void;
  onRestore: (version: Version) => void;
  onViewDiff: (version: Version, previousVersion?: Version) => void;
}

// Diff viewer component
function DiffViewer({ oldText, newText, viewMode, showLineNumbers = true }: DiffViewerProps) {
  const [diffType, setDiffType] = useState<'words' | 'lines'>('words');

  const diff = useMemo(() => {
    return diffType === 'words' 
      ? diffWords(oldText || '', newText || '')
      : diffLines(oldText || '', newText || '');
  }, [oldText, newText, diffType]);

  const renderUnifiedDiff = () => (
    <div className="space-y-1">
      {diff.map((change, index) => {
        if (change.added) {
          return (
            <div key={index} className="bg-green-50 border-l-4 border-green-400 px-4 py-2">
              <div className="flex items-start space-x-3">
                <span className="text-green-600 font-mono text-sm">+</span>
                <span className="text-green-800 whitespace-pre-wrap">{change.value}</span>
              </div>
            </div>
          );
        } else if (change.removed) {
          return (
            <div key={index} className="bg-red-50 border-l-4 border-red-400 px-4 py-2">
              <div className="flex items-start space-x-3">
                <span className="text-red-600 font-mono text-sm">-</span>
                <span className="text-red-800 whitespace-pre-wrap line-through">{change.value}</span>
              </div>
            </div>
          );
        } else {
          return (
            <div key={index} className="px-4 py-2">
              <div className="flex items-start space-x-3">
                <span className="text-gray-400 font-mono text-sm"> </span>
                <span className="text-gray-700 whitespace-pre-wrap">{change.value}</span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );

  const renderSplitDiff = () => {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    return (
      <div className="grid grid-cols-2 gap-4">
        {/* Old Version */}
        <div className="border-r">
          <div className="bg-red-50 border-b px-4 py-2 font-medium text-red-800">
            Original
          </div>
          <div className="space-y-1">
            {oldLines.map((line, index) => (
              <div key={index} className="flex">
                {showLineNumbers && (
                  <span className="text-gray-400 font-mono text-sm w-12 flex-shrink-0 text-right mr-4 select-none">
                    {index + 1}
                  </span>
                )}
                <span className="whitespace-pre-wrap">{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* New Version */}
        <div>
          <div className="bg-green-50 border-b px-4 py-2 font-medium text-green-800">
            Updated
          </div>
          <div className="space-y-1">
            {newLines.map((line, index) => (
              <div key={index} className="flex">
                {showLineNumbers && (
                  <span className="text-gray-400 font-mono text-sm w-12 flex-shrink-0 text-right mr-4 select-none">
                    {index + 1}
                  </span>
                )}
                <span className="whitespace-pre-wrap">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Diff Controls */}
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Tabs value={viewMode} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unified">Unified</TabsTrigger>
              <TabsTrigger value="split">Split</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={diffType} onValueChange={(value) => setDiffType(value as 'words' | 'lines')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="words">Words</TabsTrigger>
              <TabsTrigger value="lines">Lines</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span>Added</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-400 rounded"></div>
            <span>Removed</span>
          </span>
        </div>
      </div>

      {/* Diff Content */}
      <ScrollArea className="max-h-96">
        {viewMode === 'unified' ? renderUnifiedDiff() : renderSplitDiff()}
      </ScrollArea>
    </div>
  );
}

// Version item component
function VersionItem({
  version,
  previousVersion,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  onRestore,
  onViewDiff,
}: VersionItemProps) {
  const timeAgo = useMemo(() => {
    const now = new Date();
    const created = new Date(version.createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return created.toLocaleDateString();
  }, [version.createdAt]);

  const changesSummary = useMemo(() => {
    const summary = {
      insertions: 0,
      deletions: 0,
      modifications: 0,
    };

    version.changes.forEach(change => {
      switch (change.type) {
        case 'insert':
          summary.insertions += change.length || 1;
          break;
        case 'delete':
          summary.deletions += change.length || 1;
          break;
        case 'format':
        case 'move':
          summary.modifications += 1;
          break;
      }
    });

    return summary;
  }, [version.changes]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "border rounded-lg p-4 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/30",
        isSelected && "border-primary bg-primary/5",
        version.isCurrent && "ring-2 ring-blue-500/50 bg-blue-50/50"
      )}
      onClick={() => onSelect(version)}
    >
      <div className="flex items-start space-x-3">
        {/* Timeline Connector */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "w-3 h-3 rounded-full border-2",
            version.isCurrent ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"
          )} />
          <div className="w-px h-8 bg-gray-200 mt-1" />
        </div>

        {/* Version Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-sm">
                {version.name || `Version ${version.version}`}
              </h4>
              {version.isCurrent && (
                <Badge variant="secondary" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={version.author.avatar} />
              <AvatarFallback className="text-xs">
                {version.author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {version.author.name}
            </span>
          </div>

          {version.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {version.description}
            </p>
          )}

          {/* Changes Summary */}
          <div className="flex items-center space-x-4 mt-2 text-xs">
            {changesSummary.insertions > 0 && (
              <span className="text-green-600">
                +{changesSummary.insertions} additions
              </span>
            )}
            {changesSummary.deletions > 0 && (
              <span className="text-red-600">
                -{changesSummary.deletions} deletions
              </span>
            )}
            {changesSummary.modifications > 0 && (
              <span className="text-blue-600">
                {changesSummary.modifications} modifications
              </span>
            )}
            {version.wordCount && (
              <span className="text-muted-foreground">
                {version.wordCount} words
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(version.id);
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronDownIcon className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronRightIcon className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDiff(version, previousVersion);
                  }}
                >
                  <EyeIcon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View changes</p>
              </TooltipContent>
            </Tooltip>

            {!version.isCurrent && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(version);
                    }}
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restore this version</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Detailed Changes */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Changes in this version:</h5>
                    <div className="space-y-2">
                      {version.changes.map((change, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs">
                          <Badge variant="outline" className="capitalize">
                            {change.type}
                          </Badge>
                          <span className="text-muted-foreground">
                            at position {change.position}
                            {change.length && ` (${change.length} characters)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Created:</span>
                      <br />
                      {new Date(version.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Version ID:</span>
                      <br />
                      <span className="font-mono">{version.version}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Main VersionTimeline component
export function VersionTimeline({
  documentId,
  currentContent,
  onVersionSelect,
  onVersionRestore,
  className,
}: VersionTimelineProps) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffData, setDiffData] = useState<{
    current: Version;
    previous?: Version;
  } | null>(null);

  const { versions, currentVersion, showVersions } = useVersionState();

  const { data, loading, error } = useQuery(GET_DOCUMENT_VERSIONS, {
    variables: { 
      documentId,
      first: 50,
    },
    skip: !documentId,
    pollInterval: 30000, // Refresh every 30 seconds
  });

  const [createVersion] = useMutation(CREATE_VERSION);

  const handleVersionSelect = useCallback((version: Version) => {
    setSelectedVersion(version);
    onVersionSelect?.(version.id);
  }, [onVersionSelect]);

  const handleToggle = useCallback((versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  }, []);

  const handleRestore = useCallback(async (version: Version) => {
    if (window.confirm(`Are you sure you want to restore to version ${version.version}?`)) {
      try {
        await createVersion({
          variables: {
            input: {
              documentId,
              name: `Restored from ${version.version}`,
              description: `Restored from version ${version.version} created by ${version.author.name}`,
              content: version.content,
            },
          },
        });
        
        onVersionRestore?.(version.id);
        toast.success(`Restored to version ${version.version}`);
      } catch (error) {
        toast.error('Failed to restore version');
      }
    }
  }, [documentId, createVersion, onVersionRestore]);

  const handleViewDiff = useCallback((version: Version, previousVersion?: Version) => {
    setDiffData({ current: version, previous: previousVersion });
    setDiffModalOpen(true);
  }, []);

  const versionsList = useMemo(() => {
    return data?.document?.versions?.edges?.map((edge: any) => edge.node) || versions;
  }, [data, versions]);

  if (!showVersions) return null;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>Failed to load version history</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Version History
            </h2>
            <Badge variant="secondary">
              {versionsList.length} versions
            </Badge>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 p-4">
          {versionsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClockIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versionsList.map((version: Version, index: number) => (
                <VersionItem
                  key={version.id}
                  version={version}
                  previousVersion={versionsList[index + 1]}
                  isSelected={selectedVersion?.id === version.id}
                  isExpanded={expandedVersions.has(version.id)}
                  onSelect={handleVersionSelect}
                  onToggle={handleToggle}
                  onRestore={handleRestore}
                  onViewDiff={handleViewDiff}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Diff Modal */}
      <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Version Comparison
            </DialogTitle>
          </DialogHeader>
          
          {diffData && (
            <DiffViewer
              oldText={diffData.previous?.content || ''}
              newText={diffData.current.content || currentContent || ''}
              viewMode="unified"
              showLineNumbers={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}