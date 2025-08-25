'use client'

import React from 'react'
import Link from 'next/link'

export default function PaintboxCasePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-12">
          <Link href="/workshop" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
            ← Back to Workshop
          </Link>
          <h1 className="text-3xl text-[#fff] mt-4">Paintbox Excel-to-Web Platform</h1>
          <p className="text-sm text-[#666] mt-2">
            Transform complex spreadsheet workflows into scalable web applications
          </p>
        </header>

        {/* Key Metrics */}
        <section className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-[#111] border border-[#333] p-4">
            <div className="text-2xl text-[#3FD3C6] font-mono">87%</div>
            <div className="text-xs text-[#666] mt-1">Time Reduction</div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4">
            <div className="text-2xl text-[#fff] font-mono">0.3s</div>
            <div className="text-xs text-[#666] mt-1">Avg Response Time</div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4">
            <div className="text-2xl text-[#fff] font-mono">12,000</div>
            <div className="text-xs text-[#666] mt-1">Daily Calculations</div>
          </div>
          <div className="bg-[#111] border border-[#333] p-4">
            <div className="text-2xl text-[#fff] font-mono">99.7%</div>
            <div className="text-xs text-[#666] mt-1">Accuracy Rate</div>
          </div>
        </section>

        {/* Project Overview */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Project Overview</h2>
          <div className="bg-[#111] border border-[#333] p-6">
            <p className="text-sm text-[#aaa] leading-relaxed mb-4">
              <span className="text-[#666]">Note:</span> Client name masked per confidentiality agreement.
              This project represents a regional printing company serving 200+ commercial clients.
            </p>
            <p className="text-sm text-[#aaa] leading-relaxed mb-4">
              The organization relied on a 50MB Excel file with 40+ interconnected sheets,
              containing pricing algorithms developed over 15 years. Manual quote generation
              took 30-45 minutes per request with high error rates due to formula complexity.
            </p>
            <p className="text-sm text-[#aaa] leading-relaxed">
              We reverse-engineered the Excel logic, creating a web-based calculation engine
              that preserves all business rules while enabling real-time collaboration,
              version control, and automated quote generation.
            </p>
          </div>
        </section>

        {/* Technical Stack */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Technical Stack</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#111] border border-[#333] p-6">
              <h3 className="text-sm text-[#888] mb-3">Backend Architecture</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-[#666]">Runtime:</span>
                  <span className="text-[#aaa]">Node.js + TypeScript</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Database:</span>
                  <span className="text-[#aaa]">PostgreSQL + Redis</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">API Layer:</span>
                  <span className="text-[#aaa]">GraphQL Federation</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Calculation Engine:</span>
                  <span className="text-[#aaa]">Custom Formula Parser</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#111] border border-[#333] p-6">
              <h3 className="text-sm text-[#888] mb-3">Integration Points</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-[#666]">Excel Import:</span>
                  <span className="text-[#aaa]">XLSX Parser + AST</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">CRM Sync:</span>
                  <span className="text-[#aaa]">Salesforce API</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Document Gen:</span>
                  <span className="text-[#aaa]">PDF + DOCX Export</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-[#666]">Audit Trail:</span>
                  <span className="text-[#aaa]">Event Sourcing</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Architecture Diagram (Simplified) */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">System Architecture</h2>
          <div className="bg-[#111] border border-[#333] p-8">
            <pre className="text-xs text-[#666] overflow-x-auto">
{`     [Excel Files]           [Web Interface]           [API Clients]
           |                        |                        |
           v                        v                        v
    +--------------+         +--------------+         +--------------+
    | XLSX Parser  |         | React SPA    |         | REST/GraphQL |
    +--------------+         +--------------+         +--------------+
           |                        |                        |
           +------------------------+------------------------+
                                   |
                          +-------------------+
                          | Calculation Core  |
                          | (Formula Engine)  |
                          +-------------------+
                                   |
                    +-----------------------------+
                    |                             |
            +---------------+           +-------------------+
            | PostgreSQL    |           | Redis Cache       |
            | (Persistence) |           | (Hot Calculations)|
            +---------------+           +-------------------+`}
            </pre>
          </div>
        </section>

        {/* Performance Metrics */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Performance Improvements</h2>
          <div className="bg-[#111] border border-[#333] p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#333]">
                  <th className="text-left text-[#888] pb-2">Metric</th>
                  <th className="text-right text-[#888] pb-2">Before</th>
                  <th className="text-right text-[#888] pb-2">After</th>
                  <th className="text-right text-[#888] pb-2">Improvement</th>
                </tr>
              </thead>
              <tbody className="text-[#aaa]">
                <tr className="border-b border-[#333]/30">
                  <td className="py-2">Quote Generation Time</td>
                  <td className="text-right">35 min</td>
                  <td className="text-right">4.5 min</td>
                  <td className="text-right text-[#3FD3C6]">87% faster</td>
                </tr>
                <tr className="border-b border-[#333]/30">
                  <td className="py-2">Error Rate</td>
                  <td className="text-right">8.2%</td>
                  <td className="text-right">0.3%</td>
                  <td className="text-right text-[#3FD3C6]">96% reduction</td>
                </tr>
                <tr className="border-b border-[#333]/30">
                  <td className="py-2">Daily Throughput</td>
                  <td className="text-right">15 quotes</td>
                  <td className="text-right">120 quotes</td>
                  <td className="text-right text-[#3FD3C6]">8x increase</td>
                </tr>
                <tr className="border-b border-[#333]/30">
                  <td className="py-2">Formula Calc Time</td>
                  <td className="text-right">12s</td>
                  <td className="text-right">0.3s</td>
                  <td className="text-right text-[#3FD3C6]">40x faster</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Implementation Timeline */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Implementation Changelog</h2>
          <div className="bg-[#111] border border-[#333] p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <span className="text-xs text-[#666] w-24">2025-07-15</span>
                <div>
                  <p className="text-sm text-[#aaa]">v1.2.0 - Real-time collaboration features</p>
                  <p className="text-xs text-[#666] mt-1">Added WebSocket support for live quote editing</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-xs text-[#666] w-24">2025-06-01</span>
                <div>
                  <p className="text-sm text-[#aaa]">v1.1.0 - Performance optimization</p>
                  <p className="text-xs text-[#666] mt-1">Implemented Redis caching, reduced calc time by 85%</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-xs text-[#666] w-24">2025-04-10</span>
                <div>
                  <p className="text-sm text-[#aaa]">v1.0.0 - Initial production release</p>
                  <p className="text-xs text-[#666] mt-1">Core calculation engine with 100% formula parity</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Redacted Screenshots */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Interface Screenshots</h2>
          <div className="bg-[#111] border border-[#333] p-6">
            <p className="text-sm text-[#666] mb-4">Screenshots redacted per client agreement</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0a] border border-[#333] h-48 flex items-center justify-center">
                <span className="text-xs text-[#444]">[Quote Builder Interface]</span>
              </div>
              <div className="bg-[#0a0a0a] border border-[#333] h-48 flex items-center justify-center">
                <span className="text-xs text-[#444]">[Formula Debugger View]</span>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-12">
          <h2 className="text-xl text-[#3FD3C6] mb-4">Current Status</h2>
          <div className="bg-[#111] border border-[#333] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-[#aaa]">System Operational</span>
            </div>
            <p className="text-sm text-[#aaa] leading-relaxed">
              Platform is in production serving 12 sales representatives daily.
              Phase 2 development includes AI-powered pricing recommendations and
              integration with manufacturing systems for real-time capacity planning.
            </p>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-8 border-t border-[#333]">
          <Link href="/workshop" className="text-sm text-[#666] hover:text-[#3FD3C6] transition-colors">
            ← Back to Workshop
          </Link>
          <Link href="/consideration" className="text-sm text-[#3FD3C6] hover:text-[#fff] transition-colors">
            Request Similar System →
          </Link>
        </div>
      </div>
    </main>
  )
}
