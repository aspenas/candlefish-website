'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { GET_PROJECT, CREATE_DOCUMENT } from '@/graphql/operations';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'document';
  children?: TreeNode[];
  parentId?: string;
  documentId?: string;
  collaboratorCount?: number;
  commentCount?: number;
  lastModified?: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  status?: 'draft' | 'published' | 'archived';
  path: string[];
}

interface DocumentTreeProps {
  projectId: string;
  selectedDocumentId?: string;
  onDocumentSelect?: (documentId: string, path: string[]) => void;
  onDocumentCreate?: (parentId: string | null, name: string) => void;
  onFolderCreate?: (parentId: string | null, name: string) => void;
  className?: string;
}

interface TreeItemProps {
  node: TreeNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNode) => void;
  onContextMenu: (node: TreeNode, event: React.MouseEvent) => void;
  searchTerm: string;
}

// Tree item component with drag and drop support
function TreeItem({
  node,
  level,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  onContextMenu,
  searchTerm,
}: TreeItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify(node));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (node.type === 'folder') {
      try {
        const draggedNode = JSON.parse(e.dataTransfer.getData('text/plain'));
        // Handle move operation
        console.log('Move', draggedNode, 'to', node);
        toast.success(`Moved ${draggedNode.name} to ${node.name}`);
      } catch (error) {
        console.error('Error handling drop:', error);
      }
    }
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => (
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900">{part}</mark>
      ) : part
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative',
        isDragging && 'opacity-50',
        dragOver && 'bg-blue-50 border-2 border-blue-300 border-dashed'
      )}
    >
      <div
        className={cn(
          'flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-muted/50',
          isSelected && 'bg-primary/10 border border-primary/20',
          level > 0 && 'ml-4'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
        onContextMenu={(e) => onContextMenu(node, e)}
        draggable={node.type === 'document'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse Icon */}
        {node.type === 'folder' && node.children && node.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-1 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Icon */}
        <div className="flex-shrink-0">
          {node.type === 'folder' ? (
            isExpanded ? (
              <FolderOpenIcon className="h-4 w-4 text-blue-600" />
            ) : (
              <FolderIcon className="h-4 w-4 text-blue-600" />
            )
          ) : (
            <DocumentTextIcon className="h-4 w-4 text-gray-600" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate">
            {highlightSearchTerm(node.name, searchTerm)}
          </span>
        </div>

        {/* Status Badge for Documents */}
        {node.type === 'document' && node.status && (
          <Badge variant="secondary" className={cn("text-xs", getStatusColor(node.status))}>
            {node.status}
          </Badge>
        )}

        {/* Collaboration Indicators */}
        {node.type === 'document' && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Collaborator Count */}
            {node.collaboratorCount && node.collaboratorCount > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center space-x-1">
                    <UserGroupIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{node.collaboratorCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{node.collaboratorCount} active collaborators</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Last Modified */}
            {node.lastModified && (
              <Tooltip>
                <TooltipTrigger>
                  <ClockIcon className="h-3 w-3 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last modified: {new Date(node.lastModified).toLocaleDateString()}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Author Avatar */}
            {node.author && (
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={node.author.avatar} />
                    <AvatarFallback className="text-xs">
                      {node.author.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Created by {node.author.name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {/* Context Menu Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('Rename', node)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Duplicate', node)}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('Move', node)}>
              Move
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => console.log('Delete', node)}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      <AnimatePresence>
        {node.type === 'folder' && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeItem
                key={child.id}
                node={child}
                level={level + 1}
                isSelected={child.documentId === selectedDocumentId}
                isExpanded={expandedNodes.has(child.id)}
                onToggle={onToggle}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                searchTerm={searchTerm}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Main DocumentTree component
export function DocumentTree({
  projectId,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentCreate,
  onFolderCreate,
  className,
}: DocumentTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // GraphQL queries
  const { data, loading, error, refetch } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
  });

  const [createDocument] = useMutation(CREATE_DOCUMENT, {
    onCompleted: () => {
      toast.success('Document created successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create document: ${error.message}`);
    },
  });

  // Transform GraphQL data to tree structure
  const treeData = useMemo(() => {
    if (!data?.project?.documents?.edges) return [];

    const buildTree = (documents: any[]): TreeNode[] => {
      const nodes: TreeNode[] = [];
      const folders = new Map<string, TreeNode>();

      // Create folder structure
      documents.forEach((doc) => {
        const pathParts = doc.node.title.split('/');
        let currentPath: string[] = [];
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath.push(pathParts[i]);
          const folderPath = currentPath.join('/');
          
          if (!folders.has(folderPath)) {
            folders.set(folderPath, {
              id: `folder-${folderPath}`,
              name: pathParts[i],
              type: 'folder',
              children: [],
              path: [...currentPath],
            });
          }
        }

        // Create document node
        const documentNode: TreeNode = {
          id: doc.node.id,
          name: pathParts[pathParts.length - 1],
          type: 'document',
          documentId: doc.node.id,
          collaboratorCount: doc.node.collaboratorCount || 0,
          commentCount: doc.node.commentCount || 0,
          lastModified: doc.node.updatedAt,
          author: doc.node.author,
          status: doc.node.status,
          path: pathParts.slice(0, -1),
        };

        // Add document to appropriate folder or root
        if (documentNode.path.length === 0) {
          nodes.push(documentNode);
        } else {
          const folderPath = documentNode.path.join('/');
          const folder = folders.get(folderPath);
          if (folder) {
            folder.children = folder.children || [];
            folder.children.push(documentNode);
          }
        }
      });

      // Build folder hierarchy
      const rootFolders: TreeNode[] = [];
      folders.forEach((folder) => {
        if (folder.path.length === 1) {
          rootFolders.push(folder);
        } else {
          const parentPath = folder.path.slice(0, -1).join('/');
          const parent = folders.get(parentPath);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(folder);
          }
        }
      });

      return [...rootFolders, ...nodes].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    };

    return buildTree(data.project.documents.edges);
  }, [data]);

  // Filter tree based on search term
  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce((acc: TreeNode[], node) => {
        const nameMatch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
        const hasMatchingChildren = node.children && filterNodes(node.children).length > 0;

        if (nameMatch || hasMatchingChildren) {
          const filteredNode = {
            ...node,
            children: node.children ? filterNodes(node.children) : undefined,
          };
          acc.push(filteredNode);

          // Auto-expand folders with matches
          if (hasMatchingChildren && node.type === 'folder') {
            setExpandedNodes(prev => new Set([...prev, node.id]));
          }
        }

        return acc;
      }, []);
    };

    return filterNodes(treeData);
  }, [treeData, searchTerm]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback((node: TreeNode) => {
    if (node.type === 'document' && node.documentId) {
      onDocumentSelect?.(node.documentId, node.path);
    }
  }, [onDocumentSelect]);

  const handleContextMenu = useCallback((node: TreeNode, event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedNode(node);
    // Handle context menu actions
  }, []);

  const handleCreateDocument = useCallback(async () => {
    const name = prompt('Enter document name:');
    if (!name) return;

    try {
      await createDocument({
        variables: {
          input: {
            projectId,
            title: name,
            content: '',
            type: 'document',
          },
        },
      });
    } catch (error) {
      console.error('Error creating document:', error);
    }
  }, [createDocument, projectId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'f':
            event.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'n':
            event.preventDefault();
            handleCreateDocument();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateDocument]);

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
        <p>Failed to load project documents</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Documents</h2>
          <Button variant="outline" size="sm" onClick={handleCreateDocument}>
            <PlusIcon className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search documents... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTreeData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No documents match your search' : 'No documents found'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTreeData.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                level={0}
                isSelected={node.documentId === selectedDocumentId}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={handleToggle}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <span>{filteredTreeData.length} documents</span>
          <span>Ctrl+N to create new</span>
        </div>
      </div>
    </div>
  );
}