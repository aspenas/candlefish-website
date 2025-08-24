'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import SiteSelector from './SiteSelector';
import ExtensionList from './ExtensionList';
import PerformanceMetrics from './PerformanceMetrics';
import RecommendationEngine from './RecommendationEngine';
import ConfigurationPanel from './ConfigurationPanel';
import { 
  DashboardState, 
  NetlifySite, 
  Extension, 
  ExtensionRecommendation, 
  PerformanceMetrics as PerformanceMetricsType,
  ExtensionConfig,
  DeploymentImpact
} from '../../types/netlify';
import { netlifyApi, handleApiError } from '../../lib/netlify-api';
import { cn } from '../../utils/cn';

interface NetlifyDashboardProps {
  className?: string;
}

const NetlifyDashboard: React.FC<NetlifyDashboardProps> = ({ className }) => {
  const [state, setState] = useState<DashboardState>({
    selectedSite: null,
    extensions: [],
    recommendations: [],
    performanceData: [],
    loading: true,
    error: null,
    filters: {
      category: null,
      status: 'all',
      search: ''
    }
  });

  const [sites, setSites] = useState<NetlifySite[]>([]);
  const [activeTab, setActiveTab] = useState<'extensions' | 'performance' | 'recommendations'>('extensions');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [configPanel, setConfigPanel] = useState<{
    isOpen: boolean;
    extension: Extension | null;
    config: ExtensionConfig | null;
  }>({
    isOpen: false,
    extension: null,
    config: null
  });
  const [impactData, setImpactData] = useState<Record<string, DeploymentImpact>>({});

  // Load sites on component mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesData = await netlifyApi.getSites();
        setSites(sitesData);
        
        // Auto-select first active site
        const firstActiveSite = sitesData.find(site => site.status === 'active') || sitesData[0];
        if (firstActiveSite) {
          setState(prev => ({ ...prev, selectedSite: firstActiveSite }));
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: handleApiError(error),
          loading: false 
        }));
      }
    };

    loadSites();
  }, []);

  // Load site data when selected site changes
  useEffect(() => {
    if (state.selectedSite) {
      loadSiteData(state.selectedSite.id);
    }
  }, [state.selectedSite]);

  const loadSiteData = async (siteId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [siteExtensions, recommendations, performanceData] = await Promise.all([
        netlifyApi.getSiteExtensions(siteId),
        netlifyApi.getRecommendations(siteId),
        netlifyApi.getPerformanceMetrics(siteId, timeRange)
      ]);

      setState(prev => ({
        ...prev,
        extensions: siteExtensions.extensions,
        recommendations,
        performanceData,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: handleApiError(error),
        loading: false 
      }));
    }
  };

  const handleSiteSelect = useCallback((site: NetlifySite) => {
    setState(prev => ({ ...prev, selectedSite: site }));
  }, []);

  const handleToggleExtension = useCallback(async (extensionId: string, enabled: boolean) => {
    if (!state.selectedSite) return;

    try {
      if (enabled) {
        await netlifyApi.enableExtension(state.selectedSite.id, extensionId);
      } else {
        await netlifyApi.disableExtension(state.selectedSite.id, extensionId);
      }

      // Update extension status locally
      setState(prev => ({
        ...prev,
        extensions: prev.extensions.map(ext =>
          ext.id === extensionId ? { ...ext, isEnabled: enabled } : ext
        )
      }));

      // Reload performance data to get updated metrics
      if (enabled) {
        setTimeout(() => {
          if (state.selectedSite) {
            netlifyApi.getPerformanceMetrics(state.selectedSite.id, timeRange)
              .then(data => setState(prev => ({ ...prev, performanceData: data })))
              .catch(console.error);
          }
        }, 2000);
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: handleApiError(error) }));
    }
  }, [state.selectedSite, timeRange]);

  const handleConfigureExtension = useCallback(async (extensionId: string) => {
    if (!state.selectedSite) return;

    const extension = state.extensions.find(ext => ext.id === extensionId);
    if (!extension) return;

    try {
      const config = await netlifyApi.getExtensionConfig(state.selectedSite.id, extensionId);
      setConfigPanel({
        isOpen: true,
        extension,
        config
      });
    } catch (error) {
      setState(prev => ({ ...prev, error: handleApiError(error) }));
    }
  }, [state.selectedSite, state.extensions]);

  const handleSaveConfig = useCallback(async (config: Record<string, any>) => {
    if (!state.selectedSite || !configPanel.extension) return;

    try {
      await netlifyApi.updateExtensionConfig(
        state.selectedSite.id,
        configPanel.extension.id,
        config
      );

      setConfigPanel(prev => ({ ...prev, isOpen: false }));
      
      // Show success message (could be replaced with a toast)
      setState(prev => ({ ...prev, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: handleApiError(error) }));
    }
  }, [state.selectedSite, configPanel.extension]);

  const handleApplyRecommendation = useCallback(async (recommendation: ExtensionRecommendation) => {
    if (!state.selectedSite) return;

    await handleToggleExtension(recommendation.extension.id, true);

    // Remove applied recommendation from list
    setState(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(
        r => r.extension.id !== recommendation.extension.id
      )
    }));
  }, [state.selectedSite, handleToggleExtension]);

  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    const range = newTimeRange as '1h' | '24h' | '7d' | '30d';
    setTimeRange(range);
    
    if (state.selectedSite) {
      netlifyApi.getPerformanceMetrics(state.selectedSite.id, range)
        .then(data => setState(prev => ({ ...prev, performanceData: data })))
        .catch(error => setState(prev => ({ ...prev, error: handleApiError(error) })));
    }
  }, [state.selectedSite]);

  const getTabStats = () => {
    const enabledExtensions = state.extensions.filter(ext => ext.isEnabled).length;
    const highImpactRecommendations = state.recommendations.filter(rec => rec.confidence >= 0.8).length;
    const latestMetrics = state.performanceData[state.performanceData.length - 1];
    const avgScore = latestMetrics 
      ? Math.round((latestMetrics.scores.performance + latestMetrics.scores.accessibility + 
                   latestMetrics.scores.bestPractices + latestMetrics.scores.seo) / 4)
      : 0;

    return { enabledExtensions, highImpactRecommendations, avgScore };
  };

  const stats = getTabStats();

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-depth-void via-depth-ocean to-depth-steel', className)}>
      <div className="operational-grid py-8">
        <div className="col-span-full">
          {/* Header */}
          <div className="mb-8">
            <h1 className="type-hero text-light-primary mb-4">
              Netlify Extension Dashboard
            </h1>
            <p className="type-body-lg text-light-secondary max-w-3xl">
              Manage extensions, monitor performance, and optimize your Candlefish infrastructure 
              with real-time insights and AI-powered recommendations.
            </p>
          </div>

          {/* Error Banner */}
          {state.error && (
            <Card className="card-operational border-operation-alert/50 bg-operation-alert/5 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-operation-alert text-xl">⚠️</div>
                    <div>
                      <h3 className="text-operation-alert font-medium mb-1">Error</h3>
                      <p className="text-sm text-light-secondary">{state.error}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, error: null }))}
                    className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Site Selection */}
          <div className="mb-8">
            <SiteSelector
              sites={sites}
              selectedSite={state.selectedSite}
              onSiteSelect={handleSiteSelect}
            />
          </div>

          {state.selectedSite && (
            <>
              {/* Tab Navigation */}
              <div className="mb-8">
                <div className="flex gap-1 p-1 bg-depth-ocean/20 rounded border border-interface-border/20 mb-4">
                  {[
                    { 
                      key: 'extensions', 
                      label: 'Extensions', 
                      icon: '🔧',
                      badge: stats.enabledExtensions > 0 ? stats.enabledExtensions.toString() : undefined
                    },
                    { 
                      key: 'performance', 
                      label: 'Performance', 
                      icon: '📊',
                      badge: stats.avgScore > 0 ? stats.avgScore.toString() : undefined
                    },
                    { 
                      key: 'recommendations', 
                      label: 'AI Recommendations', 
                      icon: '🎯',
                      badge: stats.highImpactRecommendations > 0 ? stats.highImpactRecommendations.toString() : undefined
                    }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded text-sm transition-all font-medium',
                        activeTab === tab.key
                          ? 'bg-operation-active text-depth-void'
                          : 'text-light-secondary hover:text-operation-active hover:bg-operation-active/10'
                      )}
                    >
                      <span>{tab.icon}</span>
                      <span className="uppercase tracking-wide">{tab.label}</span>
                      {tab.badge && (
                        <Badge 
                          className={cn(
                            'text-xs ml-1',
                            activeTab === tab.key
                              ? 'bg-depth-void/20 text-depth-void'
                              : 'bg-operation-active/20 text-operation-active'
                          )}
                        >
                          {tab.badge}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'extensions' && (
                  <ExtensionList
                    extensions={state.extensions}
                    onToggleExtension={handleToggleExtension}
                    onConfigureExtension={handleConfigureExtension}
                    impactData={impactData}
                    loading={state.loading}
                  />
                )}

                {activeTab === 'performance' && (
                  <PerformanceMetrics
                    data={state.performanceData}
                    timeRange={timeRange}
                    onTimeRangeChange={handleTimeRangeChange}
                  />
                )}

                {activeTab === 'recommendations' && (
                  <RecommendationEngine
                    recommendations={state.recommendations}
                    onApplyRecommendation={handleApplyRecommendation}
                    loading={state.loading}
                  />
                )}
              </div>
            </>
          )}

          {/* Empty State */}
          {!state.selectedSite && !state.loading && sites.length === 0 && (
            <Card className="card-operational">
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="text-6xl opacity-20 mb-6">🌐</div>
                  <h2 className="type-title text-light-primary mb-4">
                    No Sites Found
                  </h2>
                  <p className="text-light-secondary mb-6 max-w-md">
                    Connect your Netlify account to start managing extensions and monitoring 
                    performance across your sites.
                  </p>
                  <Button className="bg-operation-active text-depth-void hover:bg-interface-hover">
                    Connect Netlify Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration Panel Modal */}
          <ConfigurationPanel
            extension={configPanel.extension!}
            config={configPanel.config}
            onSave={handleSaveConfig}
            onCancel={() => setConfigPanel(prev => ({ ...prev, isOpen: false }))}
            isOpen={configPanel.isOpen}
          />
        </div>
      </div>

      {/* Loading Overlay */}
      {state.loading && state.selectedSite && (
        <div className="fixed inset-0 bg-depth-void/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <Card className="card-operational">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 border-2 border-operation-active border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-light-primary font-medium mb-1">
                    Loading Dashboard Data
                  </h3>
                  <p className="text-sm text-light-secondary">
                    Fetching extensions and performance metrics...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default NetlifyDashboard;