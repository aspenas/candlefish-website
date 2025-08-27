'use client'

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  TruckIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { 
  CREATE_SOLUTION_PACKAGE,
  GET_SOLUTION_PACKAGES 
} from '@/lib/graphql/queries'
import type { 
  SolutionPackage, 
  Recommendation,
  FranchiseTier,
  MaturityLevel,
  Service,
  Deliverable
} from '@/lib/graphql/types'

interface SolutionPackageBuilderProps {
  assessmentId: string
  recommendations: Recommendation[]
  franchiseTier: FranchiseTier
  maturityLevel: MaturityLevel
  onComplete: (packageId: string) => void
}

interface CustomPackage {
  name: string
  description: string
  selectedRecommendations: string[]
  customServices: Service[]
  customDeliverables: Deliverable[]
  timeline: string
  estimatedPrice: {
    min: number
    max: number
  }
}

const FRANCHISE_TIER_LIMITS = {
  STARTER: { maxPrice: 75000, maxServices: 5, maxDeliverables: 8 },
  PROFESSIONAL: { maxPrice: 250000, maxServices: 10, maxDeliverables: 15 },
  ENTERPRISE: { maxPrice: 500000, maxServices: 20, maxDeliverables: 30 },
  CUSTOM: { maxPrice: 750000, maxServices: 50, maxDeliverables: 100 }
}

const BASE_PACKAGE_TEMPLATES = {
  STARTER: {
    name: 'Operational Foundation',
    description: 'Essential improvements to establish operational stability',
    priceRange: { min: 50000, max: 75000 },
    timeline: '3-6 months'
  },
  PROFESSIONAL: {
    name: 'Systematic Enhancement',
    description: 'Comprehensive improvements for systematic operations',
    priceRange: { min: 100000, max: 250000 },
    timeline: '6-12 months'
  },
  ENTERPRISE: {
    name: 'Optimized Operations',
    description: 'Advanced optimization for enterprise-level operations',
    priceRange: { min: 200000, max: 500000 },
    timeline: '12-18 months'
  },
  CUSTOM: {
    name: 'Autonomous Transformation',
    description: 'Full transformation to autonomous operational excellence',
    priceRange: { min: 300000, max: 700000 },
    timeline: '18-24 months'
  }
}

export function SolutionPackageBuilder({
  assessmentId,
  recommendations,
  franchiseTier,
  maturityLevel,
  onComplete
}: SolutionPackageBuilderProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<'custom' | FranchiseTier>('custom')
  const [customPackage, setCustomPackage] = useState<CustomPackage>({
    name: '',
    description: '',
    selectedRecommendations: [],
    customServices: [],
    customDeliverables: [],
    timeline: '',
    estimatedPrice: { min: 0, max: 0 }
  })

  const { data: existingPackages } = useQuery(GET_SOLUTION_PACKAGES, {
    variables: { franchiseTier, maturityLevel }
  })

  const [createSolutionPackage, { loading: creating }] = useMutation(CREATE_SOLUTION_PACKAGE, {
    onCompleted: (data) => {
      onComplete(data.createSolutionPackage.id)
    }
  })

  const tierLimits = FRANCHISE_TIER_LIMITS[franchiseTier]
  
  // Filter recommendations by priority and impact
  const prioritizedRecommendations = recommendations
    .filter(rec => rec.priority === 'HIGH' || rec.priority === 'CRITICAL')
    .slice(0, 10)

  const mediumPriorityRecommendations = recommendations
    .filter(rec => rec.priority === 'MEDIUM')
    .slice(0, 8)

  const lowPriorityRecommendations = recommendations
    .filter(rec => rec.priority === 'LOW')
    .slice(0, 5)

  // Calculate estimated price based on selected recommendations
  useEffect(() => {
    const basePrice = selectedTemplate !== 'custom' 
      ? BASE_PACKAGE_TEMPLATES[selectedTemplate].priceRange.min
      : 25000

    const recommendationCost = customPackage.selectedRecommendations.length * 8000
    const serviceCost = customPackage.customServices.length * 12000
    const deliverableCost = customPackage.customDeliverables.length * 3000

    const minPrice = Math.max(basePrice + recommendationCost + serviceCost + deliverableCost, 25000)
    const maxPrice = Math.min(minPrice * 1.4, tierLimits.maxPrice)

    setCustomPackage(prev => ({
      ...prev,
      estimatedPrice: { min: minPrice, max: maxPrice }
    }))
  }, [customPackage.selectedRecommendations, customPackage.customServices, customPackage.customDeliverables, selectedTemplate, tierLimits])

  const handleRecommendationToggle = (recommendationId: string) => {
    setCustomPackage(prev => ({
      ...prev,
      selectedRecommendations: prev.selectedRecommendations.includes(recommendationId)
        ? prev.selectedRecommendations.filter(id => id !== recommendationId)
        : [...prev.selectedRecommendations, recommendationId]
    }))
  }

  const addCustomService = () => {
    if (customPackage.customServices.length >= tierLimits.maxServices) return

    setCustomPackage(prev => ({
      ...prev,
      customServices: [...prev.customServices, {
        name: '',
        description: '',
        duration: '1 month'
      }]
    }))
  }

  const updateCustomService = (index: number, field: keyof Service, value: string) => {
    setCustomPackage(prev => ({
      ...prev,
      customServices: prev.customServices.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }))
  }

  const removeCustomService = (index: number) => {
    setCustomPackage(prev => ({
      ...prev,
      customServices: prev.customServices.filter((_, i) => i !== index)
    }))
  }

  const addCustomDeliverable = () => {
    if (customPackage.customDeliverables.length >= tierLimits.maxDeliverables) return

    setCustomPackage(prev => ({
      ...prev,
      customDeliverables: [...prev.customDeliverables, {
        name: '',
        description: '',
        timeline: '4 weeks'
      }]
    }))
  }

  const updateCustomDeliverable = (index: number, field: keyof Deliverable, value: string) => {
    setCustomPackage(prev => ({
      ...prev,
      customDeliverables: prev.customDeliverables.map((deliverable, i) => 
        i === index ? { ...deliverable, [field]: value } : deliverable
      )
    }))
  }

  const removeCustomDeliverable = (index: number) => {
    setCustomPackage(prev => ({
      ...prev,
      customDeliverables: prev.customDeliverables.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    try {
      const packageData = selectedTemplate !== 'custom' 
        ? {
            ...BASE_PACKAGE_TEMPLATES[selectedTemplate],
            selectedRecommendations: customPackage.selectedRecommendations,
            customServices: customPackage.customServices,
            customDeliverables: customPackage.customDeliverables
          }
        : customPackage

      await createSolutionPackage({
        variables: {
          assessmentId,
          recommendations: packageData.selectedRecommendations || customPackage.selectedRecommendations,
          customizations: {
            includedServices: packageData.customServices?.map(s => s.name) || [],
            timeline: packageData.timeline || customPackage.timeline,
            priceAdjustment: 0,
            customDeliverables: packageData.customDeliverables || customPackage.customDeliverables
          }
        }
      })
    } catch (error) {
      console.error('Failed to create solution package:', error)
    }
  }

  const isValid = () => {
    if (selectedTemplate !== 'custom') return customPackage.selectedRecommendations.length > 0

    return (
      customPackage.name.trim() &&
      customPackage.description.trim() &&
      customPackage.selectedRecommendations.length > 0 &&
      customPackage.timeline.trim()
    )
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Solution Package Builder
        </h2>
        <p className="text-gray-400">
          Create a customized solution package based on assessment recommendations
        </p>
        <Badge className="mt-2">
          {franchiseTier} Tier • Up to {formatPrice(tierLimits.maxPrice)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Package Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Package Template
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <motion.div
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedTemplate === 'custom'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => setSelectedTemplate('custom')}
                whileHover={{ scale: 1.02 }}
              >
                <h4 className="text-white font-medium mb-1">Custom Package</h4>
                <p className="text-gray-400 text-sm">
                  Build a completely customized solution
                </p>
              </motion.div>

              {Object.entries(BASE_PACKAGE_TEMPLATES).map(([tier, template]) => (
                <motion.div
                  key={tier}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplate === tier
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  } ${tier === franchiseTier ? 'ring-1 ring-green-500/30' : ''}`}
                  onClick={() => setSelectedTemplate(tier as FranchiseTier)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{template.name}</h4>
                    {tier === franchiseTier && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        Your Tier
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-400">
                      {formatPrice(template.priceRange.min)} - {formatPrice(template.priceRange.max)}
                    </span>
                    <span className="text-gray-500">{template.timeline}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Custom Package Fields */}
            {selectedTemplate === 'custom' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Package Name
                    </label>
                    <Input
                      value={customPackage.name}
                      onChange={(e) => setCustomPackage(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="Enter package name..."
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Description
                    </label>
                    <Textarea
                      value={customPackage.description}
                      onChange={(e) => setCustomPackage(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Describe this solution package..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Timeline
                    </label>
                    <Input
                      value={customPackage.timeline}
                      onChange={(e) => setCustomPackage(prev => ({
                        ...prev,
                        timeline: e.target.value
                      }))}
                      placeholder="e.g., 6-12 months"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </Card>

          {/* Recommendations Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Select Recommendations
              <span className="text-gray-400 text-sm ml-2">
                ({customPackage.selectedRecommendations.length} selected)
              </span>
            </h3>

            {/* High Priority */}
            <div className="space-y-4">
              <h4 className="text-white font-medium text-sm">High Priority</h4>
              <div className="space-y-2">
                {prioritizedRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      customPackage.selectedRecommendations.includes(rec.id)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => handleRecommendationToggle(rec.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <h5 className="text-white font-medium text-sm mb-1">
                          {rec.title}
                        </h5>
                        <p className="text-gray-400 text-sm">
                          {rec.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs">
                          <Badge className={`${
                            rec.impact === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                            rec.impact === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {rec.impact} Impact
                          </Badge>
                          <Badge className={`${
                            rec.effort === 'LOW' ? 'bg-green-500/20 text-green-400' :
                            rec.effort === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {rec.effort} Effort
                          </Badge>
                          <span className="text-gray-500">{rec.timeline}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {customPackage.selectedRecommendations.includes(rec.id) ? (
                          <CheckCircleIcon className="w-5 h-5 text-blue-400" />
                        ) : (
                          <div className="w-5 h-5 border border-gray-600 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Medium Priority (Collapsible) */}
              {mediumPriorityRecommendations.length > 0 && (
                <details className="mt-6">
                  <summary className="text-white font-medium text-sm cursor-pointer">
                    Medium Priority ({mediumPriorityRecommendations.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {mediumPriorityRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          customPackage.selectedRecommendations.includes(rec.id)
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                        onClick={() => handleRecommendationToggle(rec.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-white font-medium text-sm">
                              {rec.title}
                            </h5>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {rec.impact} Impact
                              </Badge>
                              <span className="text-gray-500 text-xs">{rec.timeline}</span>
                            </div>
                          </div>
                          {customPackage.selectedRecommendations.includes(rec.id) ? (
                            <CheckCircleIcon className="w-4 h-4 text-blue-400" />
                          ) : (
                            <div className="w-4 h-4 border border-gray-600 rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>

          {/* Custom Services */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Custom Services
                <span className="text-gray-400 text-sm ml-2">
                  ({customPackage.customServices.length}/{tierLimits.maxServices})
                </span>
              </h3>
              <Button
                size="sm"
                onClick={addCustomService}
                disabled={customPackage.customServices.length >= tierLimits.maxServices}
                className="flex items-center space-x-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Service</span>
              </Button>
            </div>

            <div className="space-y-3">
              {customPackage.customServices.map((service, index) => (
                <div key={index} className="p-3 border border-gray-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-grow space-y-2">
                      <Input
                        value={service.name}
                        onChange={(e) => updateCustomService(index, 'name', e.target.value)}
                        placeholder="Service name"
                        className="text-sm"
                      />
                      <Textarea
                        value={service.description}
                        onChange={(e) => updateCustomService(index, 'description', e.target.value)}
                        placeholder="Service description"
                        rows={2}
                        className="text-sm"
                      />
                      <Input
                        value={service.duration}
                        onChange={(e) => updateCustomService(index, 'duration', e.target.value)}
                        placeholder="Duration (e.g., 2 months)"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeCustomService(index)}
                      className="p-1 w-8 h-8 text-red-400 hover:text-red-300"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {customPackage.customServices.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  No custom services added yet
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Package Summary */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Package Summary
            </h3>

            <div className="space-y-4">
              {/* Price Estimate */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Estimated Price</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatPrice(customPackage.estimatedPrice.min)} - {formatPrice(customPackage.estimatedPrice.max)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Based on selected recommendations and services
                </div>
              </div>

              {/* Timeline */}
              {(customPackage.timeline || (selectedTemplate !== 'custom' && BASE_PACKAGE_TEMPLATES[selectedTemplate]?.timeline)) && (
                <div className="flex items-center space-x-2 p-3 bg-gray-800/50 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-white font-medium text-sm">Timeline</div>
                    <div className="text-gray-400 text-xs">
                      {customPackage.timeline || BASE_PACKAGE_TEMPLATES[selectedTemplate as FranchiseTier]?.timeline}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Items Count */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Recommendations:</span>
                  <span className="text-white">{customPackage.selectedRecommendations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Custom Services:</span>
                  <span className="text-white">{customPackage.customServices.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Deliverables:</span>
                  <span className="text-white">{customPackage.customDeliverables.length}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={!isValid() || creating}
              className="w-full flex items-center justify-center space-x-2"
              size="lg"
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Package...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Create Solution Package</span>
                </>
              )}
            </Button>

            <Button variant="outline" className="w-full" size="sm">
              Save as Draft
            </Button>
            
            <Button variant="outline" className="w-full" size="sm">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Preview Proposal
            </Button>
          </div>

          {/* Tier Benefits */}
          <Card className="p-4">
            <h4 className="text-white font-medium text-sm mb-3">
              {franchiseTier} Tier Benefits
            </h4>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="w-3 h-3" />
                <span>Up to {tierLimits.maxServices} services</span>
              </div>
              <div className="flex items-center space-x-2">
                <TruckIcon className="w-3 h-3" />
                <span>Up to {tierLimits.maxDeliverables} deliverables</span>
              </div>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="w-3 h-3" />
                <span>Up to {formatPrice(tierLimits.maxPrice)} budget</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}