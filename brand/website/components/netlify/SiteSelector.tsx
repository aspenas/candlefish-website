'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SiteSelectorProps, NetlifySite } from '../../types/netlify';
import { cn } from '../../utils/cn';

const SiteSelector: React.FC<SiteSelectorProps> = ({
  sites,
  selectedSite,
  onSiteSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: NetlifySite['status']) => {
    switch (status) {
      case 'active': return 'text-operation-complete bg-operation-complete/10 border-operation-complete/30';
      case 'building': return 'text-operation-pending bg-operation-pending/10 border-operation-pending/30';
      case 'error': return 'text-operation-alert bg-operation-alert/10 border-operation-alert/30';
      case 'inactive': return 'text-light-tertiary bg-light-tertiary/10 border-light-tertiary/30';
      default: return 'text-light-tertiary bg-light-tertiary/10 border-light-tertiary/30';
    }
  };

  const getStatusIcon = (status: NetlifySite['status']) => {
    switch (status) {
      case 'active': return '●';
      case 'building': return '◐';
      case 'error': return '●';
      case 'inactive': return '○';
      default: return '○';
    }
  };

  const formatUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const formatLastDeploy = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const activeSites = sites.filter(site => site.status === 'active').length;
  const buildingSites = sites.filter(site => site.status === 'building').length;
  const errorSites = sites.filter(site => site.status === 'error').length;

  if (sites.length === 0) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-2xl opacity-20 mb-2">🌐</div>
            <p className="text-light-secondary text-sm">No sites available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Selection Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-display text-light-primary mb-1">
            Site Management
          </h2>
          <div className="flex items-center gap-4 text-sm text-light-secondary">
            <span className="status-active">
              {activeSites} Active
            </span>
            {buildingSites > 0 && (
              <span className="text-operation-pending">
                {buildingSites} Building
              </span>
            )}
            {errorSites > 0 && (
              <span className="text-operation-alert">
                {errorSites} Errors
              </span>
            )}
            <span className="text-light-tertiary">
              {sites.length} Total
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs border-interface-border/30 text-light-secondary hover:border-operation-active/50"
        >
          {isExpanded ? 'Collapse' : 'View All Sites'}
        </Button>
      </div>

      {/* Selected Site Display */}
      {selectedSite && (
        <Card className="card-operational border-operation-active/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs border',
                  getStatusColor(selectedSite.status)
                )}>
                  <span className="animate-pulse">
                    {getStatusIcon(selectedSite.status)}
                  </span>
                  <span className="uppercase tracking-wide font-medium">
                    {selectedSite.status}
                  </span>
                </div>
                <div>
                  <h3 className="text-light-primary font-medium">
                    {selectedSite.name}
                  </h3>
                  <p className="text-sm text-light-secondary">
                    {formatUrl(selectedSite.url)}
                  </p>
                </div>
              </div>

              <div className="text-right text-sm text-light-tertiary">
                {selectedSite.lastDeploy && (
                  <div className="mb-1">
                    Last deploy: {formatLastDeploy(selectedSite.lastDeploy)}
                  </div>
                )}
                {selectedSite.buildTime && (
                  <div>
                    Build time: {selectedSite.buildTime}s
                  </div>
                )}
              </div>
            </div>

            {selectedSite.repository && (
              <div className="mt-3 pt-3 border-t border-interface-border/20">
                <div className="flex items-center gap-2 text-xs text-light-tertiary">
                  <span>📁</span>
                  <span>{selectedSite.repository.provider}/{selectedSite.repository.repo}</span>
                  <span>→</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedSite.deployBranch}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Site Grid (when expanded) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card
              key={site.id}
              className={cn(
                'card-operational cursor-pointer transition-all hover:border-operation-active/50',
                selectedSite?.id === site.id && 'border-operation-active/50 bg-operation-active/5'
              )}
              onClick={() => onSiteSelect(site)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Site Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-light-primary font-medium truncate">
                        {site.name}
                      </h3>
                      <p className="text-sm text-light-secondary truncate">
                        {formatUrl(site.url)}
                      </p>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs border ml-2 whitespace-nowrap',
                      getStatusColor(site.status)
                    )}>
                      <span className={site.status === 'building' ? 'animate-pulse' : ''}>
                        {getStatusIcon(site.status)}
                      </span>
                      <span className="uppercase tracking-wide font-medium">
                        {site.status}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {site.lastDeploy && (
                      <div>
                        <div className="text-light-tertiary uppercase tracking-wide">
                          Last Deploy
                        </div>
                        <div className="text-light-secondary">
                          {formatLastDeploy(site.lastDeploy)}
                        </div>
                      </div>
                    )}
                    {site.buildTime && (
                      <div>
                        <div className="text-light-tertiary uppercase tracking-wide">
                          Build Time
                        </div>
                        <div className="text-light-secondary">
                          {site.buildTime}s
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repository Info */}
                  {site.repository && (
                    <div className="pt-2 border-t border-interface-border/20">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-light-tertiary truncate">
                          <span>📁</span>
                          <span className="truncate">
                            {site.repository.provider}/{site.repository.repo}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {site.deployBranch}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Selection Indicator */}
                  {selectedSite?.id === site.id && (
                    <div className="flex items-center gap-2 pt-2 border-t border-operation-active/30">
                      <div className="w-2 h-2 bg-operation-active rounded-full animate-pulse" />
                      <span className="text-xs text-operation-active uppercase tracking-wide font-medium">
                        Currently Selected
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Site Pills (when collapsed) */}
      {!isExpanded && sites.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => onSiteSelect(site)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full border transition-all text-sm',
                selectedSite?.id === site.id
                  ? 'bg-operation-active/10 text-operation-active border-operation-active/30'
                  : 'bg-depth-steel/20 text-light-secondary border-interface-border/20 hover:border-operation-active/30 hover:text-operation-active'
              )}
            >
              <span className={cn(
                'w-2 h-2 rounded-full',
                site.status === 'active' ? 'bg-operation-complete animate-pulse' :
                site.status === 'building' ? 'bg-operation-pending animate-pulse' :
                site.status === 'error' ? 'bg-operation-alert animate-pulse' :
                'bg-light-tertiary/50'
              )} />
              <span className="font-medium">{site.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteSelector;