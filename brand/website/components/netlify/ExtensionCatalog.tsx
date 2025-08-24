'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Extension, ExtensionCategory, NetlifySite } from '../../types/netlify';
import { netlifyApi, handleApiError } from '../../lib/netlify-api';
import { cn } from '../../utils/cn';

interface ExtensionCatalogProps {
  selectedSite: NetlifySite | null;
  installedExtensions?: Extension[];
  onInstallExtension?: (extensionId: string) => Promise<void>;
  className?: string;
}

interface CatalogFilters {
  search: string;
  category: ExtensionCategory | 'all';
  impact: 'low' | 'medium' | 'high' | 'all';
  provider: string | 'all';
  sortBy: 'name' | 'popularity' | 'impact' | 'newest';
}

const categoryColors: Record<ExtensionCategory, string> = {
  performance: 'bg-operation-complete/20 text-operation-complete border-operation-complete/30',
  security: 'bg-operation-alert/20 text-operation-alert border-operation-alert/30',
  seo: 'bg-operation-processing/20 text-operation-processing border-operation-processing/30',
  analytics: 'bg-interface-focus/20 text-interface-focus border-interface-focus/30',
  forms: 'bg-color-copper/20 text-color-copper border-color-copper/30',
  edge: 'bg-light-tertiary/20 text-light-tertiary border-light-tertiary/30'
};

const impactColors = {
  low: 'text-operation-complete',
  medium: 'text-operation-alert',
  high: 'text-operation-processing'
};

const ExtensionCatalog: React.FC<ExtensionCatalogProps> = ({
  selectedSite,
  installedExtensions = [],
  onInstallExtension,
  className
}) => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<CatalogFilters>({
    search: '',
    category: 'all',
    impact: 'all',
    provider: 'all',
    sortBy: 'popularity'
  });

  // Load all extensions
  useEffect(() => {
    const loadExtensions = async () => {
      try {
        setLoading(true);
        const data = await netlifyApi.getExtensions();
        setExtensions(data);
        setError(null);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadExtensions();
  }, []);

  // Get unique categories, providers for filter options
  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(extensions.map(ext => ext.category)));
    const providers = Array.from(new Set(extensions.map(ext => ext.provider)));

    return { categories, providers };
  }, [extensions]);

  // Filter and sort extensions
  const filteredExtensions = useMemo(() => {
    let filtered = extensions.filter(ext => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!ext.name.toLowerCase().includes(searchLower) &&
            !ext.description.toLowerCase().includes(searchLower) &&
            !ext.provider.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Category filter
      if (filters.category !== 'all' && ext.category !== filters.category) {
        return false;
      }

      // Impact filter
      if (filters.impact !== 'all' && ext.performance.impact !== filters.impact) {
        return false;
      }

      // Provider filter
      if (filters.provider !== 'all' && ext.provider !== filters.provider) {
        return false;
      }

      return true;
    });

    // Sort extensions
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'impact':
          const impactOrder = { low: 0, medium: 1, high: 2 };
          return impactOrder[b.performance.impact] - impactOrder[a.performance.impact];
        case 'newest':
          // Mock sorting by version (newer versions would typically have higher version numbers)
          return b.version.localeCompare(a.version);
        case 'popularity':
        default:
          // Mock popularity based on usage metrics
          return (b.metrics?.usage || 0) - (a.metrics?.usage || 0);
      }
    });

    return filtered;
  }, [extensions, filters]);

  const handleInstallExtension = useCallback(async (extensionId: string) => {
    if (!selectedSite || !onInstallExtension) return;

    setInstalling(prev => new Set(prev).add(extensionId));

    try {
      await onInstallExtension(extensionId);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setInstalling(prev => {
        const next = new Set(prev);
        next.delete(extensionId);
        return next;
      });
    }
  }, [selectedSite, onInstallExtension]);

  const isExtensionInstalled = (extensionId: string) => {
    return installedExtensions.some(ext => ext.id === extensionId && ext.isEnabled);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      impact: 'all',
      provider: 'all',
      sortBy: 'popularity'
    });
  };

  if (loading) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-light-secondary">Loading extension catalog...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Error Banner */}
      {error && (
        <Card className="card-operational border-operation-alert/50 bg-operation-alert/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-operation-alert text-xl">⚠️</div>
                <div>
                  <h3 className="text-operation-alert font-medium mb-1">Error Loading Catalog</h3>
                  <p className="text-sm text-light-secondary">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="mb-8">
        <h2 className="type-title text-light-primary mb-2">Extension Catalog</h2>
        <p className="text-light-secondary">
          Discover and install extensions to enhance your Netlify sites.
          {selectedSite ? ` Installing to: ${selectedSite.name}` : ' Select a site to install extensions.'}
        </p>
      </div>

      {/* Filters */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-light-secondary mb-2">
                Search Extensions
              </label>
              <Input
                id="search"
                placeholder="Search by name, description, or provider..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-light-secondary mb-2">
                Category
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as CatalogFilters['category'] }))}
                className="w-full p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="all">All Categories</option>
                {filterOptions.categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Impact Filter */}
            <div>
              <label htmlFor="impact" className="block text-sm font-medium text-light-secondary mb-2">
                Performance Impact
              </label>
              <select
                id="impact"
                value={filters.impact}
                onChange={(e) => setFilters(prev => ({ ...prev, impact: e.target.value as CatalogFilters['impact'] }))}
                className="w-full p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="all">Any Impact</option>
                <option value="low">Low Impact</option>
                <option value="medium">Medium Impact</option>
                <option value="high">High Impact</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Provider Filter */}
            <div className="flex-1 min-w-48">
              <label htmlFor="provider" className="block text-sm font-medium text-light-secondary mb-2">
                Provider
              </label>
              <select
                id="provider"
                value={filters.provider}
                onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
                className="w-full p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="all">All Providers</option>
                {filterOptions.providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-1 min-w-48">
              <label htmlFor="sortBy" className="block text-sm font-medium text-light-secondary mb-2">
                Sort By
              </label>
              <select
                id="sortBy"
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as CatalogFilters['sortBy'] }))}
                className="w-full p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="popularity">Most Popular</option>
                <option value="name">Name (A-Z)</option>
                <option value="impact">Performance Impact</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="pt-7">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Active Filter Summary */}
          {(filters.search || filters.category !== 'all' || filters.impact !== 'all' || filters.provider !== 'all') && (
            <div className="mt-4 p-3 bg-operation-active/5 border border-operation-active/20 rounded">
              <div className="flex items-center justify-between">
                <div className="text-sm text-light-secondary">
                  Showing {filteredExtensions.length} of {extensions.length} extensions
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <Badge className="bg-operation-active/20 text-operation-active">
                      Search: "{filters.search}"
                    </Badge>
                  )}
                  {filters.category !== 'all' && (
                    <Badge className="bg-operation-active/20 text-operation-active">
                      {filters.category}
                    </Badge>
                  )}
                  {filters.impact !== 'all' && (
                    <Badge className="bg-operation-active/20 text-operation-active">
                      {filters.impact} impact
                    </Badge>
                  )}
                  {filters.provider !== 'all' && (
                    <Badge className="bg-operation-active/20 text-operation-active">
                      {filters.provider}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extensions Grid */}
      {filteredExtensions.length === 0 ? (
        <Card className="card-operational">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl opacity-20 mb-6">🔍</div>
              <h3 className="type-title text-light-primary mb-4">No Extensions Found</h3>
              <p className="text-light-secondary mb-6 max-w-md">
                No extensions match your current filters. Try adjusting your search criteria or clearing filters.
              </p>
              <Button onClick={clearFilters} className="bg-operation-active text-depth-void hover:bg-interface-hover">
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExtensions.map((extension) => {
            const isInstalled = isExtensionInstalled(extension.id);
            const isInstalling = installing.has(extension.id);

            return (
              <Card key={extension.id} className="card-operational group hover:border-operation-active/40 transition-all duration-300">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {extension.icon ? (
                        <img src={extension.icon} alt={`${extension.name} icon`} className="w-8 h-8" />
                      ) : (
                        <div className="w-8 h-8 bg-operation-active/20 rounded flex items-center justify-center text-sm">
                          {extension.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-light-primary">{extension.name}</h3>
                        <p className="text-sm text-light-secondary">v{extension.version}</p>
                      </div>
                    </div>

                    {isInstalled && (
                      <Badge className="bg-operation-complete/20 text-operation-complete border-operation-complete/30">
                        ✓ Installed
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-light-secondary mb-4 line-clamp-3">
                    {extension.description}
                  </p>

                  {/* Metadata */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-light-secondary">Provider:</span>
                      <Badge className="bg-depth-ocean/30 text-light-secondary border-interface-border/30">
                        {extension.provider}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-light-secondary">Category:</span>
                      <Badge className={cn('border text-xs', categoryColors[extension.category])}>
                        {extension.category}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-light-secondary">Performance Impact:</span>
                      <span className={cn('font-medium', impactColors[extension.performance.impact])}>
                        {extension.performance.impact.charAt(0).toUpperCase() + extension.performance.impact.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-depth-ocean/10 rounded border border-interface-border/20">
                    <div className="text-center">
                      <div className="text-sm font-medium text-operation-active">{extension.performance.loadTime}ms</div>
                      <div className="text-xs text-light-secondary">Load Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-operation-active">
                        {extension.performance.bundleSize ? `${extension.performance.bundleSize}KB` : 'N/A'}
                      </div>
                      <div className="text-xs text-light-secondary">Bundle Size</div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  {extension.metrics && (
                    <div className="text-xs text-light-secondary mb-4 space-y-1">
                      <div className="flex justify-between">
                        <span>Usage:</span>
                        <span className="text-operation-active">{extension.metrics.usage.toLocaleString()} sites</span>
                      </div>
                      {extension.metrics.lastUsed && (
                        <div className="flex justify-between">
                          <span>Last Updated:</span>
                          <span>{new Date(extension.metrics.lastUsed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isInstalled || isInstalling || !selectedSite}
                      onClick={() => handleInstallExtension(extension.id)}
                      className={cn(
                        'flex-1',
                        isInstalled
                          ? 'bg-operation-complete/20 text-operation-complete border-operation-complete/30'
                          : 'bg-operation-active text-depth-void hover:bg-interface-hover'
                      )}
                      loading={isInstalling}
                    >
                      {isInstalled ? 'Installed' : isInstalling ? 'Installing...' : 'Install'}
                    </Button>

                    {extension.documentation.setupUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(extension.documentation.setupUrl, '_blank')}
                        className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
                        rightIcon={<span>↗</span>}
                      >
                        Docs
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExtensionCatalog;
