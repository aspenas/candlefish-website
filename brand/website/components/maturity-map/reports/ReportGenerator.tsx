'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DocumentTextIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  GENERATE_ASSESSMENT_REPORT,
  GET_ASSESSMENT_REPORT_DATA
} from '@/lib/graphql/queries'
import type { ReportGenerationOptions } from '@/lib/graphql/types'

interface ReportGeneratorProps {
  assessmentId: string
  onComplete?: (reportUrl: string) => void
}

interface ReportSection {
  id: string
  name: string
  description: string
  required: boolean
  estimatedPages: number
}

interface GenerationStatus {
  reportId?: string
  status: 'idle' | 'generating' | 'completed' | 'failed'
  progress: number
  currentStep: string
  estimatedCompletion?: string
  downloadUrl?: string
  error?: string
}

const REPORT_SECTIONS: ReportSection[] = [
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'High-level overview and key findings',
    required: true,
    estimatedPages: 2
  },
  {
    id: 'assessment_methodology',
    name: 'Assessment Methodology',
    description: 'Explanation of evaluation process and criteria',
    required: true,
    estimatedPages: 3
  },
  {
    id: 'current_state_analysis',
    name: 'Current State Analysis',
    description: 'Detailed analysis of current operational maturity',
    required: true,
    estimatedPages: 12
  },
  {
    id: 'benchmark_comparison',
    name: 'Industry Benchmarks',
    description: 'Comparison with industry standards and peers',
    required: false,
    estimatedPages: 6
  },
  {
    id: 'maturity_roadmap',
    name: 'Maturity Roadmap',
    description: 'Strategic roadmap for operational improvement',
    required: true,
    estimatedPages: 8
  },
  {
    id: 'recommendations',
    name: 'Detailed Recommendations',
    description: 'Actionable recommendations with implementation plans',
    required: true,
    estimatedPages: 15
  },
  {
    id: 'implementation_plan',
    name: 'Implementation Plan',
    description: 'Phased implementation approach with timelines',
    required: false,
    estimatedPages: 10
  },
  {
    id: 'roi_analysis',
    name: 'ROI Analysis',
    description: 'Return on investment calculations and projections',
    required: false,
    estimatedPages: 5
  },
  {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Identification and mitigation of implementation risks',
    required: false,
    estimatedPages: 4
  },
  {
    id: 'appendices',
    name: 'Appendices',
    description: 'Supporting documentation and detailed data',
    required: false,
    estimatedPages: 8
  }
]

const BRANDING_PRESETS = {
  candlefish: {
    name: 'Candlefish Branding',
    colors: { primary: '#3B82F6', secondary: '#10B981' },
    logo: '/logos/candlefish-logo.png'
  },
  client: {
    name: 'Client Branding',
    colors: { primary: '#6366F1', secondary: '#8B5CF6' },
    logo: null
  },
  neutral: {
    name: 'Neutral',
    colors: { primary: '#6B7280', secondary: '#9CA3AF' },
    logo: null
  }
}

export function ReportGenerator({ assessmentId, onComplete }: ReportGeneratorProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>(
    REPORT_SECTIONS.filter(s => s.required).map(s => s.id)
  )
  const [format, setFormat] = useState<'PDF' | 'DOCX' | 'HTML'>('PDF')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [branding, setBranding] = useState<keyof typeof BRANDING_PRESETS>('candlefish')
  const [customBranding, setCustomBranding] = useState({
    companyName: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981'
  })
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: 'idle',
    progress: 0,
    currentStep: ''
  })

  const { data: assessmentData, loading: loadingAssessment } = useQuery(GET_ASSESSMENT_REPORT_DATA, {
    variables: { assessmentId }
  })

  const [generateReport, { loading: generating }] = useMutation(GENERATE_ASSESSMENT_REPORT, {
    onCompleted: (data) => {
      setGenerationStatus({
        status: 'generating',
        progress: 0,
        currentStep: 'Initializing report generation...',
        reportId: data.generateAssessmentReport.reportId,
        estimatedCompletion: data.generateAssessmentReport.estimatedCompletion
      })
      
      // Start polling for status updates
      pollGenerationStatus(data.generateAssessmentReport.reportId)
    },
    onError: (error) => {
      setGenerationStatus({
        status: 'failed',
        progress: 0,
        currentStep: '',
        error: error.message
      })
    }
  })

  // Simulate polling for generation status (in real implementation, use subscription)
  const pollGenerationStatus = (reportId: string) => {
    let progress = 0
    const steps = [
      'Analyzing assessment data...',
      'Generating executive summary...',
      'Creating charts and visualizations...',
      'Building recommendations section...',
      'Formatting document...',
      'Finalizing report...'
    ]
    
    const interval = setInterval(() => {
      progress += 15 + Math.random() * 10
      const currentStepIndex = Math.floor((progress / 100) * steps.length)
      
      if (progress >= 100) {
        setGenerationStatus({
          status: 'completed',
          progress: 100,
          currentStep: 'Report completed!',
          reportId,
          downloadUrl: `/api/reports/${reportId}/download`
        })
        
        if (onComplete) {
          onComplete(`/api/reports/${reportId}/download`)
        }
        
        clearInterval(interval)
      } else {
        setGenerationStatus(prev => ({
          ...prev,
          progress: Math.min(progress, 100),
          currentStep: steps[Math.min(currentStepIndex, steps.length - 1)]
        }))
      }
    }, 2000)
  }

  const handleSectionToggle = (sectionId: string) => {
    const section = REPORT_SECTIONS.find(s => s.id === sectionId)
    if (section?.required) return // Can't toggle required sections

    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const getTotalEstimatedPages = () => {
    return REPORT_SECTIONS
      .filter(section => selectedSections.includes(section.id))
      .reduce((total, section) => total + section.estimatedPages, 0)
  }

  const getEstimatedGenerationTime = () => {
    const baseTime = 3 // 3 minutes base
    const pageMultiplier = getTotalEstimatedPages() * 0.3 // 0.3 minutes per page
    const chartMultiplier = includeCharts ? 2 : 0 // 2 minutes for charts
    
    return Math.round(baseTime + pageMultiplier + chartMultiplier)
  }

  const handleGenerate = async () => {
    const options: ReportGenerationOptions = {
      format,
      sections: selectedSections,
      includeCharts,
      includeAppendices: selectedSections.includes('appendices'),
      branding: branding === 'client' ? {
        companyName: customBranding.companyName,
        colors: {
          primary: customBranding.primaryColor,
          secondary: customBranding.secondaryColor
        }
      } : BRANDING_PRESETS[branding]
    }

    try {
      await generateReport({
        variables: {
          assessmentId,
          options
        }
      })
    } catch (error) {
      console.error('Failed to generate report:', error)
    }
  }

  if (loadingAssessment) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Assessment Report Generator
        </h2>
        <p className="text-gray-400">
          Generate a comprehensive maturity assessment report
        </p>
      </div>

      {/* Generation Status */}
      <AnimatePresence>
        {generationStatus.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`p-6 ${
              generationStatus.status === 'failed' ? 'border-red-500/50 bg-red-500/5' :
              generationStatus.status === 'completed' ? 'border-green-500/50 bg-green-500/5' :
              'border-blue-500/50 bg-blue-500/5'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {generationStatus.status === 'generating' && (
                    <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                  )}
                  {generationStatus.status === 'completed' && (
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  )}
                  {generationStatus.status === 'failed' && (
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <h3 className="text-white font-medium">
                      {generationStatus.status === 'generating' && 'Generating Report...'}
                      {generationStatus.status === 'completed' && 'Report Completed!'}
                      {generationStatus.status === 'failed' && 'Generation Failed'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {generationStatus.currentStep}
                    </p>
                  </div>
                </div>
                
                {generationStatus.status === 'completed' && (
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button size="sm" asChild>
                      <a href={generationStatus.downloadUrl} download>
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              
              {generationStatus.status === 'generating' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-400">{generationStatus.progress}%</span>
                  </div>
                  <Progress value={generationStatus.progress} className="h-2" />
                  {generationStatus.estimatedCompletion && (
                    <div className="text-xs text-gray-500 text-center">
                      Estimated completion: {new Date(generationStatus.estimatedCompletion).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
              
              {generationStatus.error && (
                <div className="text-red-400 text-sm">
                  {generationStatus.error}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Report Format
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              {(['PDF', 'DOCX', 'HTML'] as const).map((formatOption) => (
                <motion.div
                  key={formatOption}
                  className={`p-4 rounded-lg border cursor-pointer transition-all text-center ${
                    format === formatOption
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setFormat(formatOption)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-2xl mb-2">
                    {formatOption === 'PDF' && '📄'}
                    {formatOption === 'DOCX' && '📝'}
                    {formatOption === 'HTML' && '🌐'}
                  </div>
                  <div className="text-white font-medium">{formatOption}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatOption === 'PDF' && 'Print-ready format'}
                    {formatOption === 'DOCX' && 'Editable document'}
                    {formatOption === 'HTML' && 'Web-friendly format'}
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Section Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Report Sections
              <span className="text-gray-400 text-sm ml-2">
                ({selectedSections.length} sections, ~{getTotalEstimatedPages()} pages)
              </span>
            </h3>

            <div className="space-y-3">
              {REPORT_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSections.includes(section.id)
                      ? 'border-blue-500 bg-blue-500/10'
                      : section.required
                      ? 'border-gray-600 bg-gray-800/30 cursor-not-allowed'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => handleSectionToggle(section.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium text-sm">
                          {section.name}
                        </h4>
                        {section.required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">
                        {section.description}
                      </p>
                      <div className="text-xs text-gray-500">
                        ~{section.estimatedPages} pages
                      </div>
                    </div>
                    <div className="ml-4">
                      {selectedSections.includes(section.id) ? (
                        <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                      ) : (
                        <div className={`w-5 h-5 border rounded-full ${
                          section.required ? 'border-gray-600' : 'border-gray-500'
                        }`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Advanced Options */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Advanced Options
            </h3>

            <div className="space-y-4">
              {/* Include Charts */}
              <div 
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  includeCharts ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
                }`}
                onClick={() => setIncludeCharts(!includeCharts)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium text-sm">Include Charts & Visualizations</h4>
                    <p className="text-gray-400 text-xs">
                      Add visual charts, graphs, and diagrams to the report
                    </p>
                  </div>
                  <div className="ml-4">
                    {includeCharts ? (
                      <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                    ) : (
                      <div className="w-5 h-5 border border-gray-500 rounded-full" />
                    )}
                  </div>
                </div>
              </div>

              {/* Branding Selection */}
              <div>
                <h4 className="text-white font-medium text-sm mb-3">Branding</h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(BRANDING_PRESETS).map(([key, preset]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        branding === key ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
                      }`}
                      onClick={() => setBranding(key as keyof typeof BRANDING_PRESETS)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm">{preset.name}</span>
                        <div className="flex space-x-1">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.colors.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.colors.secondary }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Company Name for Client Branding */}
              {branding === 'client' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-white text-sm font-medium mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={customBranding.companyName}
                    onChange={(e) => setCustomBranding(prev => ({
                      ...prev,
                      companyName: e.target.value
                    }))}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                    placeholder="Enter company name"
                  />
                </motion.div>
              )}
            </div>
          </Card>
        </div>

        {/* Summary & Generate */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Report Summary
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">Report Details</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Format:</span>
                    <span className="text-white">{format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Sections:</span>
                    <span className="text-white">{selectedSections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Est. Pages:</span>
                    <span className="text-white">{getTotalEstimatedPages()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Charts:</span>
                    <span className="text-white">{includeCharts ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-gray-800/50 rounded-lg">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-white font-medium text-sm">Generation Time</div>
                  <div className="text-gray-400 text-xs">
                    ~{getEstimatedGenerationTime()} minutes
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || generationStatus.status === 'generating'}
              className="w-full flex items-center justify-center space-x-2"
              size="lg"
            >
              {generating || generationStatus.status === 'generating' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" size="sm">
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview Configuration
            </Button>

            <Button variant="outline" className="w-full" size="sm">
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}