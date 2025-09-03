'use client'

import React, { useState } from 'react'
import { AnimationConfigPanel } from '../../../components/admin/AnimationConfigPanel'
import { AnalyticsDashboard } from '../../../components/admin/AnalyticsDashboard'
import { EnhancedCandleFish } from '../../../components/candlefish'
import { AnimationConfig } from '../../../types/animation'

export default function AnimationAdminPage() {
  const [selectedTab, setSelectedTab] = useState<'config' | 'analytics' | 'test'>('config')
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig | null>(null)
  
  const animationId = 'main_candlefish'

  const handleConfigChange = (config: AnimationConfig) => {
    setAnimationConfig(config)
    console.log('Configuration updated:', config)
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-[#F8F8F2] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-[#415A77]/20 pb-6">
          <h1 className="text-3xl font-light text-[#F8F8F2] mb-2">
            Animation Administration
          </h1>
          <p className="text-[#415A77] text-lg">
            Configure and monitor bioluminescent candlefish animations
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-[#1B263B]/20 p-1 rounded-lg w-fit">
          {[
            { id: 'config', label: 'Configuration' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'test', label: 'Live Test' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              className={`px-6 py-2 rounded-md transition-colors text-sm font-medium ${
                selectedTab === tab.id
                  ? 'bg-[#3FD3C6] text-[#0D1B2A]'
                  : 'text-[#415A77] hover:text-[#F8F8F2] hover:bg-[#415A77]/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-2">
            {selectedTab === 'config' && (
              <AnimationConfigPanel
                animationId={animationId}
                onConfigChange={handleConfigChange}
              />
            )}

            {selectedTab === 'analytics' && (
              <AnalyticsDashboard
                animationId={animationId}
                refreshInterval={30000}
              />
            )}

            {selectedTab === 'test' && (
              <div className="space-y-6">
                <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
                  <h2 className="text-xl font-light text-[#F8F8F2] mb-4">
                    Live Animation Test
                  </h2>
                  <p className="text-[#E0E1DD] text-sm mb-6">
                    Test the animation with current configuration and performance monitoring enabled.
                  </p>
                  
                  <div className="border border-[#415A77]/30 rounded-lg overflow-hidden">
                    <EnhancedCandleFish
                      animationId={animationId}
                      height={300}
                      showPerformanceMonitor={true}
                      showFPSCounter={true}
                      showDebugInfo={true}
                      enableConfigSync={true}
                      enableABTesting={false}
                    />
                  </div>
                </div>

                <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
                  <h3 className="text-lg font-light text-[#F8F8F2] mb-4">
                    A/B Testing Example
                  </h3>
                  <p className="text-[#E0E1DD] text-sm mb-6">
                    Example of A/B testing wrapper with variant tracking.
                  </p>
                  
                  <div className="border border-[#415A77]/30 rounded-lg overflow-hidden">
                    <EnhancedCandleFish
                      animationId={`${animationId}_ab`}
                      height={240}
                      enableABTesting={true}
                      abTestId="candlefish_speed_test"
                      showFPSCounter={true}
                      userId="admin_user"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
              <h3 className="text-lg font-light text-[#F8F8F2] mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#415A77] text-sm">Animation ID</span>
                  <span className="text-[#E0E1DD] text-sm font-mono">{animationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#415A77] text-sm">Status</span>
                  <span className="text-[#3FD3C6] text-sm">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#415A77] text-sm">Config Version</span>
                  <span className="text-[#E0E1DD] text-sm">
                    {animationConfig?.updatedAt 
                      ? new Date(animationConfig.updatedAt).toLocaleDateString()
                      : 'Not loaded'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
              <h3 className="text-lg font-light text-[#F8F8F2] mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-[#3FD3C6] text-[#0D1B2A] rounded hover:bg-[#3FD3C6]/90 transition-colors text-sm font-medium">
                  Export Configuration
                </button>
                <button className="w-full px-4 py-2 border border-[#415A77] text-[#415A77] rounded hover:text-[#F8F8F2] hover:border-[#F8F8F2] transition-colors text-sm">
                  Import Configuration
                </button>
                <button className="w-full px-4 py-2 border border-[#415A77] text-[#415A77] rounded hover:text-[#F8F8F2] hover:border-[#F8F8F2] transition-colors text-sm">
                  Reset to Defaults
                </button>
              </div>
            </div>

            {/* Feature Flags */}
            <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
              <h3 className="text-lg font-light text-[#F8F8F2] mb-4">
                Feature Flags
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E1DD]">Animation Enabled</span>
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E1DD]">Performance Monitor</span>
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E1DD]">A/B Testing</span>
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#E0E1DD]">Analytics Tracking</span>
                  <div className="w-2 h-2 bg-[#3FD3C6] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}