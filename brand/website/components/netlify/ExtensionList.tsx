'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import ExtensionCard from './ExtensionCard';
import { Extension, ExtensionCardProps, DeploymentImpact } from '../../types/netlify';
import { cn } from '../../utils/cn';

interface ExtensionListProps {
  extensions: Extension[];
  onToggleExtension: (extensionId: string, enabled: boolean) => Promise<void>;
  onConfigureExtension: (extensionId: string) => void;
  impactData?: Record<string, DeploymentImpact>;
  loading?: boolean;
  className?: string;
}

const ExtensionList: React.FC<ExtensionListProps> = ({
  extensions,
  onToggleExtension,
  onConfigureExtension,
  impactData,
  loading = false,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'impact' | 'usage'>('name');

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(extensions.map(ext => ext.category)));
    return uniqueCategories.sort();
  }, [extensions]);

  // Filter and sort extensions
  const filteredExtensions = useMemo(() => {
    let filtered = extensions.filter(extension => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = `${extension.name} ${extension.description} ${extension.provider}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && extension.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'enabled' && !extension.isEnabled) return false;
      if (statusFilter === 'disabled' && extension.isEnabled) return false;

      return true;
    });

    // Sort extensions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        case 'impact':
          const impactOrder = { low: 1, medium: 2, high: 3 };
          return impactOrder[b.performance.impact] - impactOrder[a.performance.impact];
        case 'usage':
          const aUsage = a.metrics?.usage || 0;
          const bUsage = b.metrics?.usage || 0;
          return bUsage - aUsage;
        default:
          return 0;
      }
    });

    return filtered;
  }, [extensions, searchQuery, selectedCategory, statusFilter, sortBy]);

  const enabledCount = extensions.filter(ext => ext.isEnabled).length;
  const totalCount = extensions.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-display text-light-primary mb-2">
            Extension Management
          </h2>
          <div className="flex items-center gap-4 text-sm text-light-secondary">
            <span className="status-active">
              {enabledCount} Active
            </span>
            <span className="text-light-tertiary">
              {totalCount - enabledCount} Available
            </span>
            <span className="text-light-tertiary">
              {totalCount} Total Extensions
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
            className="text-xs border-interface-border/30 text-light-secondary hover:border-operation-active/50"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded bg-depth-ocean/20 border border-interface-border/20">
        {/* Search */}
        <div className="lg:col-span-2">
          <Input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-depth-steel/20 border-interface-border/30 text-light-primary placeholder-light-tertiary"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-depth-steel/20 border border-interface-border/30 rounded text-light-primary text-sm focus:border-operation-active focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Status and Sort */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
            className="flex-1 px-3 py-2 bg-depth-steel/20 border border-interface-border/30 rounded text-light-primary text-sm focus:border-operation-active focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'impact' | 'usage')}
            className="flex-1 px-3 py-2 bg-depth-steel/20 border border-interface-border/30 rounded text-light-primary text-sm focus:border-operation-active focus:outline-none"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="impact">Impact</option>
            <option value="usage">Usage</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-3 py-1 text-xs rounded-full border transition-all uppercase tracking-wide',
            selectedCategory === 'all'
              ? 'bg-operation-active/10 text-operation-active border-operation-active/30'
              : 'bg-depth-steel/20 text-light-tertiary border-interface-border/20 hover:border-operation-active/30'
          )}
        >
          All ({totalCount})
        </button>
        {categories.map(category => {
          const count = extensions.filter(ext => ext.category === category).length;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all uppercase tracking-wide',
                selectedCategory === category
                  ? 'bg-operation-active/10 text-operation-active border-operation-active/30'
                  : 'bg-depth-steel/20 text-light-tertiary border-interface-border/20 hover:border-operation-active/30'
              )}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-light-secondary">
        <div>
          Showing {filteredExtensions.length} of {totalCount} extensions
        </div>
        <div className="flex items-center gap-4">
          {searchQuery && (
            <span className="text-operation-active">
              Search: "{searchQuery}"
            </span>
          )}
          {selectedCategory !== 'all' && (
            <Badge variant="outline" className="text-xs border-operation-active/30 text-operation-active">
              {selectedCategory}
            </Badge>
          )}
        </div>
      </div>

      {/* Extensions Grid */}
      <div className={cn(
        'grid gap-6',
        'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3',
        loading && 'opacity-50 pointer-events-none'
      )}>
        {filteredExtensions.map(extension => (
          <ExtensionCard
            key={extension.id}
            extension={extension}
            isEnabled={extension.isEnabled}
            onToggle={onToggleExtension}
            onConfigure={onConfigureExtension}
            showImpact={!!impactData?.[extension.id]}
            impact={impactData?.[extension.id]}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredExtensions.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-4xl opacity-20 mb-4">🔧</div>
          <h3 className="type-title text-light-primary mb-2">
            No Extensions Found
          </h3>
          <p className="text-light-secondary mb-4 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No extensions match your current filters. Try adjusting your search criteria.'
              : 'No extensions are available for this site.'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="border-interface-border/30 text-light-secondary hover:border-operation-active/50"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-operation-active border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-light-secondary uppercase tracking-wide text-sm">
            Loading Extensions...
          </p>
        </div>
      )}
    </div>
  );
};

export default ExtensionList;