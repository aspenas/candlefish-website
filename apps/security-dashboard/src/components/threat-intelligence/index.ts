import React from 'react';

// Main Dashboard Component
export { default as ThreatIntelligenceDashboard } from './ThreatIntelligenceDashboard';

// Core Components
export { default as ThreatMetricsOverview } from './ThreatMetricsOverview';
export { default as IOCManagementPanel } from './IOCManagementPanel';
export { default as ThreatActorNetwork } from './ThreatActorNetwork';
export { default as CorrelationEnginePanel } from './CorrelationEnginePanel';
export { default as GeographicThreatMap } from './GeographicThreatMap';
export { default as RecentThreatsList } from './RecentThreatsList';

// Placeholder exports for components that would be implemented next
// These allow the main dashboard to import them without errors

export const ThreatTimeline: React.FC<any> = (props) => (
  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
    <h3 className="text-lg font-semibold text-white mb-4">Campaign Timeline</h3>
    <p className="text-gray-400">Campaign timeline visualization component coming soon...</p>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
      <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
    </div>
  </div>
);

export const ThreatFeedStatus: React.FC<any> = (props) => (
  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
    <h3 className="text-lg font-semibold text-white mb-4">Threat Feed Status</h3>
    <p className="text-gray-400">Threat feed management interface coming soon...</p>
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div className="p-3 bg-gray-900 rounded">
        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
        <div className="h-2 bg-gray-700 rounded animate-pulse mt-2 w-1/2"></div>
      </div>
      <div className="p-3 bg-gray-900 rounded">
        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
        <div className="h-2 bg-gray-700 rounded animate-pulse mt-2 w-2/3"></div>
      </div>
    </div>
  </div>
);

export const IndustryTargetingAnalysis: React.FC<any> = (props) => (
  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
    <h3 className="text-lg font-semibold text-white mb-4">Industry Targeting Analysis</h3>
    <p className="text-gray-400">Industry-specific threat analysis coming soon...</p>
    <div className="mt-4 space-y-3">
      {['Financial Services', 'Healthcare', 'Government', 'Technology'].map((industry, index) => (
        <div key={industry} className="flex justify-between items-center p-3 bg-gray-900 rounded">
          <span className="text-white">{industry}</span>
          <div className="flex items-center space-x-2">
            <div className="w-12 h-2 bg-gray-700 rounded animate-pulse"></div>
            <span className="text-gray-400 text-sm">{Math.floor(Math.random() * 100) + 1}%</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Re-export types and hooks
export type {
  ThreatIntelligenceFilters,
  IOCFilters,
  RealTimeUpdates
} from '../../hooks/useThreatIntelligence';

export {
  useThreatIntelligenceDashboard,
  useThreatIntelligence,
  useIOCManagement,
  useThreatActors,
  useThreatCampaigns,
  useThreatFeeds,
  useThreatCorrelations,
  useThreatAnalytics,
  useThreatLandscape,
  useFilterState,
  usePagination,
  useDataExport
} from '../../hooks/useThreatIntelligence';