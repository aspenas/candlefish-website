'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PlayIcon, PauseIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const demos = [
  {
    id: 'document-processing',
    title: 'Document Processing Automation',
    duration: '3:45',
    description: 'See how AI extracts data from invoices, orders, and documents',
    highlights: [
      '95% accuracy on handwritten text',
      'Automatic field mapping',
      'Multi-format support'
    ]
  },
  {
    id: 'workflow-automation',
    title: 'Workflow Automation Platform',
    duration: '5:20',
    description: 'Watch complex multi-step processes run automatically',
    highlights: [
      'Visual workflow builder',
      'Real-time monitoring',
      'Error recovery built-in'
    ]
  },
  {
    id: 'dashboard-analytics',
    title: 'Real-Time Dashboards',
    duration: '2:30',
    description: 'Live operational metrics and predictive analytics',
    highlights: [
      'Custom KPI tracking',
      'Predictive alerts',
      'Mobile-responsive views'
    ]
  }
]

export default function DemoPage() {
  const [selectedDemo, setSelectedDemo] = useState(demos[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] pt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-[#F8F8F2] mb-4">
            See Candlefish in Action
          </h1>
          <p className="text-xl text-[#E0E1DD] max-w-3xl mx-auto">
            Watch real implementations transform operations from hours to minutes
          </p>
        </div>

        {/* Demo Player */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="relative bg-[#1B263B] rounded-lg overflow-hidden aspect-video">
              {/* Mock Video Player */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-[#3FD3C6]/20 rounded-full flex items-center justify-center">
                    {isPlaying ? (
                      <PauseIcon 
                        className="h-10 w-10 text-[#3FD3C6] cursor-pointer"
                        onClick={() => setIsPlaying(false)}
                      />
                    ) : (
                      <PlayIcon 
                        className="h-10 w-10 text-[#3FD3C6] cursor-pointer"
                        onClick={() => setIsPlaying(true)}
                      />
                    )}
                  </div>
                  <p className="text-[#E0E1DD] mb-2">{selectedDemo.title}</p>
                  <p className="text-[#415A77] text-sm">Duration: {selectedDemo.duration}</p>
                </div>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0D1B2A] to-transparent p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-[#E0E1DD] hover:text-[#3FD3C6] transition-colors"
                  >
                    {isPlaying ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex-1 bg-[#415A77]/30 rounded-full h-1">
                    <div 
                      className="bg-[#3FD3C6] h-full rounded-full transition-all"
                      style={{ width: `${currentTime}%` }}
                    />
                  </div>
                  <span className="text-[#E0E1DD] text-sm">
                    0:00 / {selectedDemo.duration}
                  </span>
                </div>
              </div>
            </div>

            {/* Demo Description */}
            <div className="mt-6 bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-6">
              <h3 className="text-xl font-light text-[#F8F8F2] mb-3">
                {selectedDemo.title}
              </h3>
              <p className="text-[#E0E1DD] mb-4">
                {selectedDemo.description}
              </p>
              <div className="space-y-2">
                {selectedDemo.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center text-[#E0E1DD]">
                    <CheckCircleIcon className="h-5 w-5 text-[#3FD3C6] mr-2" />
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demo Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-light text-[#F8F8F2] mb-4">
              Available Demos
            </h3>
            {demos.map((demo) => (
              <button
                key={demo.id}
                onClick={() => {
                  setSelectedDemo(demo)
                  setIsPlaying(false)
                  setCurrentTime(0)
                }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedDemo.id === demo.id
                    ? 'bg-[#3FD3C6]/10 border-[#3FD3C6]'
                    : 'bg-[#1B263B]/30 border-[#415A77]/30 hover:border-[#3FD3C6]/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-[#F8F8F2] font-medium mb-1">
                      {demo.title}
                    </h4>
                    <p className="text-[#415A77] text-sm">
                      {demo.duration}
                    </p>
                  </div>
                  {selectedDemo.id === demo.id && (
                    <div className="w-2 h-2 bg-[#3FD3C6] rounded-full mt-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center">
            <div className="text-3xl font-light text-[#3FD3C6] mb-2">45min → 30sec</div>
            <div className="text-sm text-[#415A77]">Document Processing</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-[#3FD3C6] mb-2">276 items</div>
            <div className="text-sm text-[#415A77]">Automated Daily</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-[#3FD3C6] mb-2">99.7%</div>
            <div className="text-sm text-[#415A77]">Accuracy Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-[#3FD3C6] mb-2">$125k saved</div>
            <div className="text-sm text-[#415A77]">Annual Average</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-[#1B263B]/50 border border-[#415A77]/30 rounded-lg p-8">
          <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-[#E0E1DD] mb-8 max-w-2xl mx-auto">
            These aren't concepts or mockups. This is real automation running in production 
            for businesses like yours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/consideration"
              className="inline-flex items-center justify-center px-8 py-3 bg-[#3FD3C6] text-[#0D1B2A] hover:bg-[#4FE3D6] transition-colors"
            >
              Request Consideration
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center px-8 py-3 border border-[#415A77] text-[#E0E1DD] hover:border-[#3FD3C6] transition-colors"
            >
              Take Assessment First
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}