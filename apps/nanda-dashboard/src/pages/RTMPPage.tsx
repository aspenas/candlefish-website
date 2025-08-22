import React from 'react';
import { RTMPDashboard } from '../components/rtpm/RTPMDashboard';

/**
 * RTMP (Real-time Performance Monitoring) Page
 * 
 * This page integrates the comprehensive RTPM dashboard into the NANDA dashboard.
 * It provides real-time monitoring of agent performance with the following features:
 * 
 * Features:
 * - Real-time metrics visualization with WebSocket streaming
 * - Historical trend analysis with configurable time ranges (1h, 6h, 24h, 7d, 30d)
 * - Virtualized agent grid supporting 1000+ agents efficiently
 * - Comprehensive alert management with rule configuration
 * - Export capabilities for reports and data (CSV, Excel, JSON, PDF)
 * - Dark/light mode toggle with system preference detection
 * - Fully responsive design for mobile, tablet, and desktop
 * 
 * Components included:
 * - RealtimeCharts: Live metrics visualization
 * - HistoricalCharts: Trend analysis with time controls
 * - VirtualizedAgentGrid: Efficient agent management interface
 * - AlertConfiguration: Alert rule management
 * - ExportManager: Data export functionality
 * - ThemeProvider: Theme management and responsive utilities
 * 
 * API Endpoints supported:
 * - GET /api/v1/agents - List all agents with status
 * - GET /api/v1/agents/{id}/metrics - Get agent metrics
 * - GET /api/v1/metrics/realtime - Real-time metrics stream
 * - GET /api/v1/metrics/aggregate - Aggregated metrics with time ranges
 * - POST /api/v1/alerts - Create alert rules
 * - WebSocket ws://api/v1/metrics/stream - Live metrics updates
 */
export const RTMPPage: React.FC = () => {
  return (
    <div className="h-screen w-full">
      <RTMPDashboard />
    </div>
  );
};

export default RTMPPage;