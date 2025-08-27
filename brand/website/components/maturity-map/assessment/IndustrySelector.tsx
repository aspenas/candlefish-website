'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { Industry } from '@/lib/graphql/types'

interface IndustryData {
  value: Industry
  label: string
  description: string
  excludeFinancialServices: boolean
  benchmarkData?: {
    averageMaturityScore: number
    commonChallenges: string[]
    topPerformingDimensions: string[]
  }
}

interface IndustrySelectorProps {
  industries: IndustryData[]
  selectedIndustry?: Industry
  onSelect: (industry: Industry) => void
}

// Industry icons mapping
const INDUSTRY_ICONS: Record<Industry, string> = {
  MANUFACTURING: '🏭',
  HEALTHCARE: '🏥',
  RETAIL: '🏪',
  TECHNOLOGY: '💻',
  CONSTRUCTION: '🏗️',
  AUTOMOTIVE: '🚗',
  ENERGY: '⚡',
  AGRICULTURE: '🌾',
  LOGISTICS: '🚛',
  HOSPITALITY: '🏨',
  EDUCATION: '📚',
  GOVERNMENT: '🏛️',
  CONSULTING: '💼',
  OTHER: '🏢'
}

// Popular industries that should be shown first
const POPULAR_INDUSTRIES: Industry[] = [
  'MANUFACTURING',
  'TECHNOLOGY',
  'HEALTHCARE',
  'RETAIL',
  'CONSTRUCTION',
  'CONSULTING'
]

export function IndustrySelector({
  industries,
  selectedIndustry,
  onSelect
}: IndustrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter out financial services as specified
  const availableIndustries = industries.filter(
    industry => !industry.excludeFinancialServices
  )

  // Filter industries based on search term
  const filteredIndustries = availableIndustries.filter(industry =>
    industry.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    industry.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort industries: popular first, then alphabetically
  const sortedIndustries = filteredIndustries.sort((a, b) => {
    const aIsPopular = POPULAR_INDUSTRIES.includes(a.value)
    const bIsPopular = POPULAR_INDUSTRIES.includes(b.value)
    
    if (aIsPopular && !bIsPopular) return -1
    if (!aIsPopular && bIsPopular) return 1
    
    return a.label.localeCompare(b.label)
  })

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search industries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Industry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedIndustries.map((industry, index) => (
          <motion.div
            key={industry.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`p-6 cursor-pointer transition-all hover:scale-105 ${
                selectedIndustry === industry.value
                  ? 'ring-2 ring-blue-400 bg-blue-500/10 border-blue-500/30'
                  : 'hover:border-blue-500/50'
              }`}
              onClick={() => onSelect(industry.value)}
            >
              <div className="text-center">
                <div className="text-4xl mb-3">
                  {INDUSTRY_ICONS[industry.value]}
                </div>
                
                <h3 className="text-white font-medium text-lg mb-2">
                  {industry.label}
                </h3>
                
                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                  {industry.description}
                </p>

                {industry.benchmarkData && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Score:</span>
                        <span className="text-blue-400 font-medium">
                          {industry.benchmarkData.averageMaturityScore.toFixed(1)}%
                        </span>
                      </div>
                      
                      {industry.benchmarkData.commonChallenges.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-400 block mb-1">
                            Common Challenges:
                          </span>
                          <div className="text-gray-500 text-xs">
                            • {industry.benchmarkData.commonChallenges[0]}
                            {industry.benchmarkData.commonChallenges.length > 1 && (
                              <span className="block mt-1">
                                +{industry.benchmarkData.commonChallenges.length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredIndustries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No industries found</div>
          <p className="text-gray-500 text-sm">
            Try adjusting your search terms
          </p>
        </div>
      )}

      {/* Selection Summary */}
      {selectedIndustry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6"
        >
          <Card className="p-4 bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {INDUSTRY_ICONS[selectedIndustry]}
              </div>
              <div>
                <h4 className="text-white font-medium">
                  {availableIndustries.find(i => i.value === selectedIndustry)?.label}
                </h4>
                <p className="text-blue-200 text-sm">Selected industry</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Note about Financial Services */}
      <div className="text-center">
        <p className="text-gray-500 text-sm">
          Note: Financial services assessments require specialized compliance considerations
          and are handled through our custom consultation process.
        </p>
      </div>
    </div>
  )
}