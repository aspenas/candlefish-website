'use client'

import React, { useState } from 'react'
import type { Metadata } from 'next'

// Real project data from our actual work
const activeProjects = [
  {
    id: 'crown-trophy',
    client: 'Crown Trophy',
    focus: 'Engraving Automation Platform',
    status: 'Discovery Phase',
    weekInProgress: 2,
    systemsBuilt: {
      'Document Parsing': 'in-progress',
      'AI Text Extraction': 'in-progress',
      'Corel Draw Integration': 'planned',
      'QuickBooks Sync': 'planned',
      'Multi-Franchise Rollout': 'planned'
    },
    realMetrics: {
      'Current Process Time': '45+ minutes',
      'Target Process Time': 'Under 1 minute',
      'Franchise Potential': '150 locations',
      'Weekly Jobs Analyzed': '276 items'
    }
  },
  {
    id: 'paintbox',
    client: 'Paintbox',
    focus: 'Paint Estimation Platform',
    status: 'Production',
    weekInProgress: 16,
    systemsBuilt: {
      'Excel Formula Engine': 'complete',
      'Salesforce Integration': 'complete',
      'Company Cam Integration': 'complete',
      'PDF Generation': 'complete',
      'Offline Architecture': 'complete'
    },
    realMetrics: {
      'Excel Formulas Replicated': '14,000+',
      'Calculation Speed': 'Sub-second',
      'API Integrations': '3 platforms',
      'Production Uptime': '99.9%'
    }
  },
  {
    id: 'promoteros',
    client: 'PromoterOS',
    focus: 'AI Concert Booking Intelligence',
    status: 'Beta Testing',
    weekInProgress: 8,
    systemsBuilt: {
      'Artist Analyzer': 'complete',
      'Demand Mapping': 'complete',
      'Social Metrics API': 'complete',
      'Booking Score Algorithm': 'in-progress',
      'Venue Matching': 'planned'
    },
    realMetrics: {
      'Artists Analyzed': '1,200+',
      'Data Points Per Artist': '47',
      'API Response Time': '< 200ms',
      'Prediction Accuracy': 'Calibrating'
    }
  }
]

const SystemStatus: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'complete':
        return 'text-[#8AC926]'
      case 'in-progress':
        return 'text-[#3FD3C6]'
      case 'planned':
        return 'text-[#415A77]'
      default:
        return 'text-[#415A77]'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return '✓'
      case 'in-progress':
        return '◐'
      case 'planned':
        return '○'
      default:
        return '·'
    }
  }

  return (
    <span className={`${getStatusStyle()} text-sm font-mono`}>
      {getStatusIcon()} {status}
    </span>
  )
}

const SystemPreview: React.FC<{ projectId: string }> = ({ projectId }) => {
  // Real system status indicators
  const systemStatus = {
    'crown-trophy': 'Analyzing engraving patterns from 276 sample jobs',
    'paintbox': 'Live in production · Processing estimates daily',
    'promoteros': 'Beta testing with 3 regional promoters'
  }
  
  return (
    <div className="text-center py-8">
      <p className="text-[#3FD3C6] text-sm">
        {systemStatus[projectId as keyof typeof systemStatus]}
      </p>
    </div>
  )
}

export default function WorkshopGlimpses() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1B2A] to-[#1C1C1C] pt-24">
      <section className="max-w-7xl mx-auto px-6 pb-32">
        <header className="mb-20">
          <h1 className="text-5xl font-light text-[#F8F8F2] mb-4">
            Current Workshop
          </h1>
          <p className="text-xl text-[#415A77] max-w-3xl font-light">
            Three operational systems in active development. No embellishment. 
            Just the actual state of the craft.
          </p>
        </header>
        
        <div className="space-y-24">
          {activeProjects.map(project => (
            <article key={project.id} className="border-b border-[#1B263B] pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Project Overview */}
                <div className="lg:col-span-1">
                  <h2 className="text-3xl font-light text-[#F8F8F2] mb-2">
                    {project.client}
                  </h2>
                  <p className="text-[#3FD3C6] text-sm uppercase tracking-wider mb-4">
                    {project.focus}
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#415A77]">Status</span>
                      <span className="text-[#E0E1DD]">{project.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#415A77]">Week</span>
                      <span className="text-[#E0E1DD]">{project.weekInProgress} of ~16</span>
                    </div>
                  </div>
                </div>
                
                {/* Systems Progress */}
                <div className="lg:col-span-1">
                  <h3 className="text-sm uppercase tracking-wider text-[#3FD3C6] mb-4">
                    Systems Architecture
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(project.systemsBuilt).map(([system, status]) => (
                      <div key={system} className="flex items-center justify-between">
                        <span className="text-sm text-[#E0E1DD] font-light">{system}</span>
                        <SystemStatus status={status} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Real Metrics */}
                <div className="lg:col-span-1">
                  <h3 className="text-sm uppercase tracking-wider text-[#3FD3C6] mb-4">
                    Operational Reality
                  </h3>
                  <dl className="space-y-3">
                    {Object.entries(project.realMetrics).map(([metric, value]) => (
                      <div key={metric}>
                        <dt className="text-xs text-[#415A77]">{metric}</dt>
                        <dd className="text-lg text-[#F8F8F2] font-light">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              
              {/* Live System Preview */}
              <div className="mt-8 p-8 bg-[#1B263B]/30 border border-[#415A77]/30">
                <SystemPreview projectId={project.id} />
              </div>
            </article>
          ))}
        </div>
        
        {/* The Workshop Team */}
        <section className="mt-32">
          <h2 className="text-4xl font-light text-[#F8F8F2] mb-12 text-center">The Workshop</h2>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="space-y-4">
              <h3 className="text-2xl font-light text-[#3FD3C6]">System Architecture</h3>
              <p className="text-[#E0E1DD] leading-relaxed">
                Former operational designer for painting contractors, event promoters, 
                and retail operations. Believes every business contains hidden elegance 
                waiting to be revealed through thoughtful system design.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-2xl font-light text-[#3FD3C6]">Implementation Craft</h3>
              <p className="text-[#E0E1DD] leading-relaxed">
                Transforms architectural vision into living systems. Specializes in 
                making the complex feel simple, ensuring every interface feels 
                intuitive and every process runs smoothly.
              </p>
            </div>
          </div>
          
          <p className="text-center text-[#415A77] mt-12 text-lg font-light">
            We don't scale our team. We scale our impact through the systems we leave behind.
            <br />
            Each one running quietly, efficiently, indefinitely.
          </p>
        </section>
        
        {/* Bottom Note */}
        <aside className="mt-24 text-center">
          <p className="text-[#415A77] text-sm font-light">
            Each system represents 12-16 weeks of focused craft. 
            We don't show past work. These are live operations.
          </p>
        </aside>
      </section>
    </main>
  )
}