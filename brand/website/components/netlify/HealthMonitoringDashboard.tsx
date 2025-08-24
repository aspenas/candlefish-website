'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { NetlifySite, PerformanceMetrics } from '../../types/netlify';
import { netlifyApi, handleApiError } from '../../lib/netlify-api';
import { cn } from '../../utils/cn';

interface SiteHealth {
  siteId: string;
  siteName: string;
  siteUrl: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: number; // percentage
  responseTime: number; // ms
  lastCheck: Date;
  issues: HealthIssue[];
  metrics: PerformanceMetrics | null;
}

interface HealthIssue {
  id: string;
  type: 'performance' | 'availability' | 'security' | 'accessibility' | 'build';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  firstDetected: Date;
  lastSeen: Date;
  resolved: boolean;
}

interface HealthMonitoringDashboardProps {
  sites: NetlifySite[];
  refreshInterval?: number; // in seconds, default 30
  className?: string;
}

const statusColors = {
  healthy: 'bg-operation-complete/20 text-operation-complete border-operation-complete/30',
  warning: 'bg-operation-alert/20 text-operation-alert border-operation-alert/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  unknown: 'bg-light-tertiary/20 text-light-tertiary border-light-tertiary/30'
};

const statusIcons = {
  healthy: '✅',
  warning: '⚠️',
  critical: '🚨',
  unknown: '❓'
};

const issueTypeColors = {
  performance: 'bg-operation-processing/20 text-operation-processing border-operation-processing/30',
  availability: 'bg-red-500/20 text-red-400 border-red-500/30',
  security: 'bg-operation-alert/20 text-operation-alert border-operation-alert/30',
  accessibility: 'bg-interface-focus/20 text-interface-focus border-interface-focus/30',
  build: 'bg-color-copper/20 text-color-copper border-color-copper/30'
};

const severityColors = {
  low: 'text-operation-complete',
  medium: 'text-operation-alert',
  high: 'text-operation-processing',
  critical: 'text-red-400'
};

const HealthMonitoringDashboard: React.FC<HealthMonitoringDashboardProps> = ({
  sites,
  refreshInterval = 30,
  className
}) => {
  const [siteHealth, setSiteHealth] = useState<SiteHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [selectedIssueType, setSelectedIssueType] = useState<'all' | HealthIssue['type']>('all');
  const [showResolved, setShowResolved] = useState(false);

  // Mock health check function - in reality, this would call actual health endpoints
  const performHealthCheck = useCallback(async (site: NetlifySite): Promise<SiteHealth> => {
    try {
      // Simulate API calls
      const [metrics] = await Promise.all([
        netlifyApi.getPerformanceMetrics(site.id, '1h').catch(() => null)
      ]);

      // Mock health assessment based on site status and metrics
      let status: SiteHealth['status'] = 'healthy';
      const issues: HealthIssue[] = [];
      let responseTime = Math.random() * 1000 + 100; // 100-1100ms
      let uptime = 99.9;

      // Assess site status
      if (site.status === 'error') {
        status = 'critical';
        uptime = 95.2;
        issues.push({
          id: `${site.id}-build-error`,
          type: 'build',
          severity: 'critical',
          message: 'Build failures detected',
          details: 'Multiple build failures in the last 24 hours',
          firstDetected: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - 10 * 60 * 1000),
          resolved: false
        });
      } else if (site.status === 'building') {
        status = 'warning';
        issues.push({
          id: `${site.id}-building`,
          type: 'availability',
          severity: 'medium',
          message: 'Site is currently building',
          details: 'Deployment in progress, temporary service disruption possible',
          firstDetected: new Date(Date.now() - 15 * 60 * 1000),
          lastSeen: new Date(),
          resolved: false
        });
      }

      // Assess performance metrics
      if (metrics) {
        const latestMetric = metrics[metrics.length - 1];

        if (latestMetric.metrics.lcp > 4000) {
          status = status === 'healthy' ? 'warning' : status;
          issues.push({
            id: `${site.id}-lcp`,
            type: 'performance',
            severity: 'medium',
            message: 'Poor Largest Contentful Paint',
            details: `LCP is ${latestMetric.metrics.lcp}ms (target: <2.5s)`,
            firstDetected: new Date(Date.now() - 4 * 60 * 60 * 1000),
            lastSeen: new Date(),
            resolved: false
          });
        }

        if (latestMetric.metrics.cls > 0.25) {
          status = status === 'healthy' ? 'warning' : status;
          issues.push({
            id: `${site.id}-cls`,
            type: 'performance',
            severity: 'low',
            message: 'Layout shifts detected',
            details: `CLS is ${latestMetric.metrics.cls.toFixed(3)} (target: <0.1)`,
            firstDetected: new Date(Date.now() - 2 * 60 * 60 * 1000),
            lastSeen: new Date(),
            resolved: false
          });
        }

        if (latestMetric.scores.accessibility < 90) {
          issues.push({
            id: `${site.id}-a11y`,
            type: 'accessibility',
            severity: 'medium',
            message: 'Accessibility issues found',
            details: `Accessibility score: ${latestMetric.scores.accessibility}/100`,
            firstDetected: new Date(Date.now() - 24 * 60 * 60 * 1000),
            lastSeen: new Date(),
            resolved: false
          });
        }

        if (latestMetric.scores.bestPractices < 80) {
          issues.push({
            id: `${site.id}-security`,
            type: 'security',
            severity: 'high',
            message: 'Security best practices violations',
            details: `Best practices score: ${latestMetric.scores.bestPractices}/100`,
            firstDetected: new Date(Date.now() - 6 * 60 * 60 * 1000),
            lastSeen: new Date(),
            resolved: false
          });
        }

        responseTime = latestMetric.metrics.ttfb;
      }

      // Random health variations for demo
      if (Math.random() < 0.1) { // 10% chance of issues
        uptime = Math.random() * 5 + 95; // 95-100%
        if (Math.random() < 0.3) {
          status = 'warning';
        }
      }

      return {
        siteId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        status,
        uptime,
        responseTime,
        lastCheck: new Date(),
        issues,
        metrics: metrics?.[metrics.length - 1] || null
      };
    } catch (error) {
      return {
        siteId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        status: 'unknown',
        uptime: 0,
        responseTime: 0,
        lastCheck: new Date(),
        issues: [{
          id: `${site.id}-check-failed`,
          type: 'availability',
          severity: 'high',
          message: 'Health check failed',
          details: handleApiError(error),
          firstDetected: new Date(),
          lastSeen: new Date(),
          resolved: false
        }],
        metrics: null
      };
    }
  }, []);

  const refreshHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const healthChecks = await Promise.all(
        sites.map(site => performHealthCheck(site))
      );

      setSiteHealth(healthChecks);
      setLastRefresh(new Date());
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [sites, performHealthCheck]);

  // Initial load
  useEffect(() => {
    refreshHealthData();
  }, [refreshHealthData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshHealthData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshHealthData]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const total = siteHealth.length;
    const healthy = siteHealth.filter(s => s.status === 'healthy').length;
    const warning = siteHealth.filter(s => s.status === 'warning').length;
    const critical = siteHealth.filter(s => s.status === 'critical').length;
    const unknown = siteHealth.filter(s => s.status === 'unknown').length;

    const avgUptime = total > 0
      ? siteHealth.reduce((acc, s) => acc + s.uptime, 0) / total
      : 0;

    const avgResponseTime = total > 0
      ? siteHealth.reduce((acc, s) => acc + s.responseTime, 0) / total
      : 0;

    const allIssues = siteHealth.flatMap(s => s.issues);
    const unresolvedIssues = allIssues.filter(i => !i.resolved);
    const criticalIssues = unresolvedIssues.filter(i => i.severity === 'critical');

    return {
      total,
      healthy,
      warning,
      critical,
      unknown,
      avgUptime,
      avgResponseTime,
      totalIssues: allIssues.length,
      unresolvedIssues: unresolvedIssues.length,
      criticalIssues: criticalIssues.length
    };
  }, [siteHealth]);

  // Filter issues for the issues panel
  const filteredIssues = useMemo(() => {
    const allIssues = siteHealth.flatMap(site =>
      site.issues.map(issue => ({ ...issue, siteName: site.siteName, siteId: site.siteId }))
    );

    return allIssues.filter(issue => {
      if (!showResolved && issue.resolved) return false;
      if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
      if (selectedIssueType !== 'all' && issue.type !== selectedIssueType) return false;
      return true;
    }).sort((a, b) => {
      // Sort by severity first, then by last seen
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.lastSeen.getTime() - a.lastSeen.getTime();
    });
  }, [siteHealth, selectedSeverity, selectedIssueType, showResolved]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="type-title text-light-primary mb-2">Health Monitoring</h2>
          <p className="text-light-secondary">
            Real-time monitoring of site health, performance, and availability across your Netlify infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={cn(
              'w-2 h-2 rounded-full',
              autoRefresh ? 'bg-operation-complete animate-pulse' : 'bg-light-tertiary'
            )} />
            <span className="text-light-secondary">
              {autoRefresh ? 'Auto-refresh' : 'Manual'}
              {lastRefresh && ` • ${lastRefresh.toLocaleTimeString()}`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            size="sm"
            onClick={refreshHealthData}
            disabled={loading}
            className="bg-operation-active text-depth-void hover:bg-interface-hover"
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="card-operational border-operation-alert/50 bg-operation-alert/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-operation-alert text-xl">⚠️</div>
                <div>
                  <h3 className="text-operation-alert font-medium mb-1">Health Check Error</h3>
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

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-operational">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-medium text-operation-complete">{stats.healthy}</div>
                <div className="text-sm text-light-secondary">Healthy Sites</div>
              </div>
              <div className="text-2xl">✅</div>
            </div>
            <div className="text-xs text-light-secondary mt-2">
              {stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}% of total
            </div>
          </CardContent>
        </Card>

        <Card className="card-operational">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-medium text-operation-alert">{stats.warning + stats.critical}</div>
                <div className="text-sm text-light-secondary">Issues Detected</div>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
            <div className="text-xs text-light-secondary mt-2">
              {stats.criticalIssues} critical, {stats.unresolvedIssues - stats.criticalIssues} other
            </div>
          </CardContent>
        </Card>

        <Card className="card-operational">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-medium text-operation-processing">{stats.avgUptime.toFixed(1)}%</div>
                <div className="text-sm text-light-secondary">Avg Uptime</div>
              </div>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-xs text-light-secondary mt-2">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card className="card-operational">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-medium text-interface-focus">{Math.round(stats.avgResponseTime)}ms</div>
                <div className="text-sm text-light-secondary">Avg Response</div>
              </div>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="text-xs text-light-secondary mt-2">
              Time to First Byte
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sites Health Grid */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <h3 className="type-subtitle text-light-primary mb-4">Site Status</h3>

          {loading && siteHealth.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-light-secondary">Checking site health...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {siteHealth.map(site => (
                <div key={site.siteId} className="p-4 border border-interface-border/20 rounded-lg hover:border-operation-active/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{statusIcons[site.status]}</span>
                      <div>
                        <h4 className="font-medium text-light-primary">{site.siteName}</h4>
                        <a
                          href={site.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-operation-active hover:underline"
                        >
                          {site.siteUrl.replace('https://', '')}
                        </a>
                      </div>
                    </div>
                    <Badge className={cn('text-xs', statusColors[site.status])}>
                      {site.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <div className="text-light-secondary">Uptime</div>
                      <div className="font-medium text-light-primary">{site.uptime.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-light-secondary">Response</div>
                      <div className="font-medium text-light-primary">{Math.round(site.responseTime)}ms</div>
                    </div>
                  </div>

                  {site.issues.filter(i => !i.resolved).length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-light-secondary">Active Issues:</div>
                      {site.issues.filter(i => !i.resolved).slice(0, 2).map(issue => (
                        <div key={issue.id} className="flex items-center gap-2 text-xs">
                          <Badge className={cn('text-xs', issueTypeColors[issue.type])}>
                            {issue.type}
                          </Badge>
                          <span className={cn('font-medium', severityColors[issue.severity])}>
                            {issue.severity}
                          </span>
                          <span className="text-light-secondary truncate flex-1">
                            {issue.message}
                          </span>
                        </div>
                      ))}
                      {site.issues.filter(i => !i.resolved).length > 2 && (
                        <div className="text-xs text-light-secondary">
                          +{site.issues.filter(i => !i.resolved).length - 2} more issues
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-interface-border/20 text-xs text-light-secondary">
                    Last checked: {site.lastCheck.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues Panel */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="type-subtitle text-light-primary">Issues ({filteredIssues.length})</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
                />
                <span className="text-light-secondary">Show resolved</span>
              </label>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as typeof selectedSeverity)}
                className="p-1 text-sm bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={selectedIssueType}
                onChange={(e) => setSelectedIssueType(e.target.value as typeof selectedIssueType)}
                className="p-1 text-sm bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="performance">Performance</option>
                <option value="availability">Availability</option>
                <option value="security">Security</option>
                <option value="accessibility">Accessibility</option>
                <option value="build">Build</option>
              </select>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl opacity-20 mb-3">✨</div>
              <div className="text-light-secondary">
                {showResolved || selectedSeverity !== 'all' || selectedIssueType !== 'all'
                  ? 'No issues match your current filters'
                  : 'No active issues detected'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map(issue => (
                <div key={`${issue.siteId}-${issue.id}`} className="p-4 border border-interface-border/20 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={cn('text-xs', issueTypeColors[issue.type])}>
                        {issue.type}
                      </Badge>
                      <Badge className={cn('text-xs', `bg-${severityColors[issue.severity].split('-')[1]}/20 ${severityColors[issue.severity]} border-${severityColors[issue.severity].split('-')[1]}/30`)}>
                        {issue.severity}
                      </Badge>
                      <span className="text-sm text-light-secondary">{issue.siteName}</span>
                      {issue.resolved && (
                        <Badge className="text-xs bg-operation-complete/20 text-operation-complete border-operation-complete/30">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-light-secondary">
                      {issue.lastSeen.toLocaleString()}
                    </div>
                  </div>

                  <h4 className="font-medium text-light-primary mb-1">{issue.message}</h4>
                  {issue.details && (
                    <p className="text-sm text-light-secondary mb-2">{issue.details}</p>
                  )}

                  <div className="text-xs text-light-secondary">
                    First detected: {issue.firstDetected.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthMonitoringDashboard;
