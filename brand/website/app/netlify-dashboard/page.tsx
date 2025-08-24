'use client';

import React from 'react';
import NetlifyDashboard from '../../components/netlify/NetlifyDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export default function NetlifyDashboardPage() {
  return (
    <div className="min-h-screen">
      {/* Demo Header */}
      <div className="bg-depth-void/50 border-b border-interface-border/20 py-4">
        <div className="operational-grid">
          <div className="col-span-full">
            <Card className="card-operational border-operation-active/30">
              <CardHeader>
                <CardTitle className="text-light-primary flex items-center gap-3">
                  <span className="text-2xl">🚀</span>
                  Netlify Extension Management Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-light-secondary">
                    This dashboard provides comprehensive management of Netlify extensions across all Candlefish infrastructure sites. 
                    Features include real-time performance monitoring, AI-powered recommendations, and one-click extension management.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-operation-active">⚡</span>
                      <span className="text-light-secondary">Real-time Performance Metrics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-operation-active">🎯</span>
                      <span className="text-light-secondary">ML-based Recommendations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-operation-active">🔧</span>
                      <span className="text-light-secondary">One-click Extension Management</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-interface-border/20">
                    <div className="flex flex-wrap gap-2 text-xs text-light-tertiary">
                      <span className="px-2 py-1 bg-operation-active/10 text-operation-active rounded">
                        8 Candlefish Sites
                      </span>
                      <span className="px-2 py-1 bg-operation-complete/10 text-operation-complete rounded">
                        Core Web Vitals Monitoring
                      </span>
                      <span className="px-2 py-1 bg-operation-pending/10 text-operation-pending rounded">
                        Extension Impact Analysis
                      </span>
                      <span className="px-2 py-1 bg-interface-border/10 text-light-tertiary rounded">
                        Mobile Responsive
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <NetlifyDashboard />

      {/* Footer */}
      <div className="bg-depth-void/30 border-t border-interface-border/20 py-8 mt-16">
        <div className="operational-grid">
          <div className="col-span-full text-center">
            <div className="space-y-2">
              <p className="text-xs text-light-tertiary uppercase tracking-wide">
                Candlefish AI - Operational Infrastructure Dashboard
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-light-tertiary">
                <span>Built with React + TypeScript</span>
                <span>•</span>
                <span>Operational Atelier Design System</span>
                <span>•</span>
                <span>Real-time WebSocket Updates</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}