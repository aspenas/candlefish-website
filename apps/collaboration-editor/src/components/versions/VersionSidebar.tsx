'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, GitBranch, ChevronRight, Clock, User, X } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function VersionSidebar({ className }: { className?: string }) {
  const {
    versions,
    currentVersion,
    setCurrentVersion,
    showVersions,
    toggleVersions
  } = useCollaborationStore();

  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  if (!showVersions) return null;

  const sortedVersions = versions.sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  );

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
          <h3 className="text-lg font-semibold flex items-center">
            <History className="w-5 h-5 mr-2" />
            Version History
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVersions}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Version List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Current Version Indicator */}
        <div className="p-4 bg-primary/5 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="text-sm font-medium">Current Version</span>
            {currentVersion && (
              <Badge variant="secondary" className="text-xs">
                v{sortedVersions.find(v => v.id === currentVersion)?.version || '1.0'}
              </Badge>
            )}
          </div>
        </div>

        {/* Version Timeline */}
        <div className="version-timeline">
          {sortedVersions.map((version, index) => (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {/* Timeline Node */}
              <div className={cn(
                'version-node',
                version.isCurrent && 'bg-primary',
                !version.isCurrent && 'bg-muted-foreground'
              )} />

              {/* Version Card */}
              <div
                className={cn(
                  "ml-8 mb-4 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50",
                  version.isCurrent && "border-primary bg-primary/5",
                  expandedVersion === version.id && "bg-accent"
                )}
                onClick={() => setExpandedVersion(
                  expandedVersion === version.id ? null : version.id
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">
                        {version.name || `Version ${version.version}`}
                      </span>
                      {version.isCurrent && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={version.author.avatar} alt={version.author.name} />
                        <AvatarFallback>
                          {version.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{version.author.name}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(version.createdAt, { addSuffix: true })}</span>
                    </div>

                    {version.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {version.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{version.changes.length} changes</span>
                    </div>
                  </div>

                  <ChevronRight className={cn(
                    "w-4 h-4 transition-transform",
                    expandedVersion === version.id && "rotate-90"
                  )} />
                </div>

                {/* Expanded Version Details */}
                {expandedVersion === version.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3 pt-3 border-t"
                  >
                    <h4 className="text-xs font-medium mb-2">Changes in this version:</h4>
                    <div className="space-y-1">
                      {version.changes.slice(0, 5).map((change, changeIndex) => (
                        <div key={changeIndex} className="text-xs flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            change.type === 'insert' && "bg-green-500",
                            change.type === 'delete' && "bg-red-500",
                            change.type === 'format' && "bg-blue-500",
                            change.type === 'move' && "bg-yellow-500"
                          )} />
                          <span className="capitalize">{change.type}</span>
                          <span className="text-muted-foreground">
                            at position {change.position}
                          </span>
                        </div>
                      ))}
                      {version.changes.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          +{version.changes.length - 5} more changes
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentVersion(version.id);
                        }}
                        disabled={version.isCurrent}
                      >
                        Restore This Version
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View diff for version:', version.id);
                        }}
                      >
                        View Diff
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {sortedVersions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <History className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No versions yet</h3>
            <p className="text-sm text-muted-foreground">
              Versions will appear here as you make changes to the document.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" size="sm">
          <GitBranch className="w-4 h-4 mr-2" />
          Create Branch
        </Button>
      </div>
    </motion.div>
  );
}
