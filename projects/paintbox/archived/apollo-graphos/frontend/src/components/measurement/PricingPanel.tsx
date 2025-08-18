import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalculatorIcon,
  ChartBarIcon,
  TagIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { usePricing, useMeasurements, useElevationGroups } from '@/store/measurement';
import type { PricingTier } from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PricingCalculator } from './PricingCalculator';
import { DiscountModal } from './DiscountModal';
import { MarginAnalyzer } from './MarginAnalyzer';
import { clsx } from 'clsx';

interface PricingPanelProps {
  estimateId: string;
  className?: string;
}

// Mock pricing data - in real app this would come from GraphQL
const mockPricingTiers = {
  good: {
    tier: 'GOOD' as PricingTier,
    laborCost: 2800,
    materialCost: 1200,
    subtotal: 4000,
    basePrice: 8888.89, // (4000 / 0.45)
    discountAmount: 0,
    finalPrice: 8888.89,
    marginPercentage: 55,
    profitAmount: 4888.89,
    productSelection: {
      paint: 'Sherwin-Williams ProClassic',
      primer: 'Sherwin-Williams ProBlock',
      warranty: '5 years',
      features: ['Standard prep', 'One coat primer', 'Two coats finish', 'Basic cleanup']
    },
    warranty: {
      years: 5,
      coverage: 'Paint and labor warranty'
    },
    laborSpecifications: {
      hours: 56,
      crew: '2-person crew',
      timeline: '3-4 days'
    }
  },
  better: {
    tier: 'BETTER' as PricingTier,
    laborCost: 3500,
    materialCost: 1800,
    subtotal: 5300,
    basePrice: 11777.78, // (5300 / 0.45)
    discountAmount: 0,
    finalPrice: 11777.78,
    marginPercentage: 55,
    profitAmount: 6477.78,
    productSelection: {
      paint: 'Sherwin-Williams Duration',
      primer: 'Sherwin-Williams PrepRite ProBlock',
      warranty: '7 years',
      features: ['Enhanced prep', 'Premium primer', 'Two coats finish', 'Detailed cleanup', 'Touch-up kit']
    },
    warranty: {
      years: 7,
      coverage: 'Paint, labor, and material warranty'
    },
    laborSpecifications: {
      hours: 70,
      crew: '2-person crew',
      timeline: '4-5 days'
    }
  },
  best: {
    tier: 'BEST' as PricingTier,
    laborCost: 4200,
    materialCost: 2400,
    subtotal: 6600,
    basePrice: 14666.67, // (6600 / 0.45)
    discountAmount: 0,
    finalPrice: 14666.67,
    marginPercentage: 55,
    profitAmount: 8066.67,
    productSelection: {
      paint: 'Sherwin-Williams Emerald Urethane',
      primer: 'Sherwin-Williams Extreme Bond Primer',
      warranty: '10 years',
      features: ['Complete surface prep', 'Premium primer system', 'Two premium coats', 'Full cleanup', 'Touch-up kit', 'Annual inspection']
    },
    warranty: {
      years: 10,
      coverage: 'Comprehensive warranty including paint, labor, materials, and annual maintenance'
    },
    laborSpecifications: {
      hours: 84,
      crew: '3-person crew',
      timeline: '5-6 days'
    }
  }
};

const tierColors = {
  GOOD: 'green',
  BETTER: 'blue',
  BEST: 'purple'
};

const tierIcons = {
  GOOD: CheckCircleIcon,
  BETTER: StarIcon,
  BEST: ShieldCheckIcon
};

export const PricingPanel: React.FC<PricingPanelProps> = ({
  estimateId,
  className
}) => {
  const { pricing, selectedTier, appliedDiscount } = usePricing();
  const measurements = useMeasurements();
  const elevationGroups = useElevationGroups();

  const [showCalculator, setShowCalculator] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showMarginAnalyzer, setShowMarginAnalyzer] = useState(false);
  const [selectedTierForComparison, setSelectedTierForComparison] = useState<PricingTier>(selectedTier);

  // Calculate totals from measurements
  const totalSquareFootage = elevationGroups.reduce((total, group) => total + group.totalSquareFootage, 0);
  const totalMeasurements = Object.keys(measurements).length;

  // Use mock data for now - replace with actual pricing data
  const pricingTiers = pricing || mockPricingTiers;
  const currentTierData = pricingTiers[selectedTier.toLowerCase() as keyof typeof pricingTiers];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateDiscountedPrice = (basePrice: number) => {
    if (!appliedDiscount) return basePrice;

    if (appliedDiscount.type === 'PERCENTAGE') {
      return basePrice - (basePrice * appliedDiscount.value / 100);
    } else {
      return basePrice - appliedDiscount.value;
    }
  };

  const getPricePerSquareFoot = (finalPrice: number) => {
    return totalSquareFootage > 0 ? finalPrice / totalSquareFootage : 0;
  };

  return (
    <div className={clsx('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Pricing Tiers</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{totalSquareFootage.toFixed(0)} sq ft</span>
              <span>•</span>
              <span>{totalMeasurements} measurements</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMarginAnalyzer(true)}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Analyze Margins
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <CalculatorIcon className="w-4 h-4 mr-2" />
              Recalculate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscountModal(true)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <TagIcon className="w-4 h-4 mr-2" />
              Apply Discount
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Current Selection Summary */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={clsx(
                'p-3 rounded-full',
                `bg-${tierColors[selectedTier]}-100`
              )}>
                {React.createElement(tierIcons[selectedTier], {
                  className: clsx('w-6 h-6', `text-${tierColors[selectedTier]}-600`)
                })}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTier} Tier Selected
                </h3>
                <p className="text-gray-600">{currentTierData.productSelection.paint}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(calculateDiscountedPrice(currentTierData.finalPrice))}
              </div>
              <div className="text-sm text-gray-500">
                {formatCurrency(getPricePerSquareFoot(calculateDiscountedPrice(currentTierData.finalPrice)))} per sq ft
              </div>
              {appliedDiscount && (
                <div className="text-sm text-green-600 font-medium">
                  {appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}% off` : formatCurrency(appliedDiscount.value) + ' off'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Tier Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {Object.entries(pricingTiers).map(([tier, data]) => (
            <TierCard
              key={tier}
              tier={data.tier}
              data={data}
              isSelected={selectedTier === data.tier}
              appliedDiscount={appliedDiscount}
              totalSquareFootage={totalSquareFootage}
              onSelect={() => setSelectedTierForComparison(data.tier)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-600" />
              Cost Breakdown - {selectedTier} Tier
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Labor Cost:</span>
                <span className="font-medium">{formatCurrency(currentTierData.laborCost)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Material Cost:</span>
                <span className="font-medium">{formatCurrency(currentTierData.materialCost)}</span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Subtotal (Labor + Materials):</span>
                <span className="font-medium">{formatCurrency(currentTierData.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Base Price (÷ 0.45):</span>
                <span className="font-medium">{formatCurrency(currentTierData.basePrice)}</span>
              </div>

              {appliedDiscount && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}%` : 'Fixed'}):</span>
                  <span className="font-medium">
                    -{formatCurrency(appliedDiscount.type === 'PERCENTAGE'
                      ? currentTierData.basePrice * appliedDiscount.value / 100
                      : appliedDiscount.value)}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Final Price:</span>
                <span>{formatCurrency(calculateDiscountedPrice(currentTierData.finalPrice))}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>Per Square Foot:</span>
                <span>{formatCurrency(getPricePerSquareFoot(calculateDiscountedPrice(currentTierData.finalPrice)))}</span>
              </div>
            </div>
          </Card>

          {/* Project Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-blue-600" />
              Project Details
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Labor Specifications</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Hours:</span>
                    <span>{currentTierData.laborSpecifications.hours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Crew Size:</span>
                    <span>{currentTierData.laborSpecifications.crew}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timeline:</span>
                    <span>{currentTierData.laborSpecifications.timeline}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Warranty Coverage</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{currentTierData.warranty.years} years</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Coverage:</span>
                    <p className="text-gray-900 mt-1">{currentTierData.warranty.coverage}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Included Features</h4>
                <ul className="space-y-1 text-sm">
                  {currentTierData.productSelection.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              Export Quote
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-gray-600"
            >
              <PrinterIcon className="w-4 h-4 mr-2" />
              Print Estimate
            </Button>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                // Save as draft
              }}
            >
              Save Draft
            </Button>

            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                // Send to customer
              }}
            >
              Send to Customer
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCalculator && (
          <PricingCalculator
            estimateId={estimateId}
            currentPricing={pricingTiers}
            onClose={() => setShowCalculator(false)}
            onUpdate={(newPricing) => {
              // Update pricing
              setShowCalculator(false);
            }}
          />
        )}

        {showDiscountModal && (
          <DiscountModal
            currentDiscount={appliedDiscount}
            onApply={(discount) => {
              // Apply discount
              setShowDiscountModal(false);
            }}
            onClose={() => setShowDiscountModal(false)}
          />
        )}

        {showMarginAnalyzer && (
          <MarginAnalyzer
            pricingTiers={pricingTiers}
            onClose={() => setShowMarginAnalyzer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Tier Card Component
interface TierCardProps {
  tier: PricingTier;
  data: any;
  isSelected: boolean;
  appliedDiscount: any;
  totalSquareFootage: number;
  onSelect: () => void;
  formatCurrency: (amount: number) => string;
}

const TierCard: React.FC<TierCardProps> = ({
  tier,
  data,
  isSelected,
  appliedDiscount,
  totalSquareFootage,
  onSelect,
  formatCurrency,
}) => {
  const color = tierColors[tier];
  const Icon = tierIcons[tier];

  const calculateDiscountedPrice = (basePrice: number) => {
    if (!appliedDiscount) return basePrice;
    return appliedDiscount.type === 'PERCENTAGE'
      ? basePrice - (basePrice * appliedDiscount.value / 100)
      : basePrice - appliedDiscount.value;
  };

  const finalPrice = calculateDiscountedPrice(data.finalPrice);
  const pricePerSqFt = totalSquareFootage > 0 ? finalPrice / totalSquareFootage : 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={clsx(
        'p-6 cursor-pointer transition-all duration-200 relative overflow-hidden',
        isSelected
          ? `ring-2 ring-${color}-500 bg-${color}-50 border-${color}-200`
          : 'hover:shadow-lg border-gray-200'
      )}>
        {/* Popular badge for BETTER tier */}
        {tier === 'BETTER' && (
          <div className={clsx(
            'absolute -top-1 -right-1 px-3 py-1 text-xs font-bold text-white rounded-bl-lg',
            `bg-${color}-500`
          )}>
            MOST POPULAR
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={clsx(
              'p-2 rounded-lg',
              `bg-${color}-100`
            )}>
              <Icon className={clsx('w-5 h-5', `text-${color}-600`)} />
            </div>
            <div>
              <h3 className={clsx('text-lg font-bold', `text-${color}-700`)}>
                {tier}
              </h3>
              <p className="text-sm text-gray-600">{data.productSelection.paint}</p>
            </div>
          </div>

          {isSelected && (
            <CheckCircleIcon className={clsx('w-6 h-6', `text-${color}-600`)} />
          )}
        </div>

        <div className="mb-4">
          <div className={clsx('text-2xl font-bold', `text-${color}-700`)}>
            {formatCurrency(finalPrice)}
          </div>
          <div className="text-sm text-gray-500">
            {formatCurrency(pricePerSqFt)} per sq ft
          </div>
          {appliedDiscount && (
            <div className="text-sm text-green-600 font-medium">
              {appliedDiscount.type === 'PERCENTAGE' ? `${appliedDiscount.value}% off` : formatCurrency(appliedDiscount.value) + ' off'}
            </div>
          )}
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400 mr-2" />
            <span>{data.warranty.years}-year warranty</span>
          </div>
          <div className="flex items-center text-sm">
            <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
            <span>{data.laborSpecifications.timeline}</span>
          </div>
          <div className="flex items-center text-sm">
            <UserGroupIcon className="w-4 h-4 text-gray-400 mr-2" />
            <span>{data.laborSpecifications.crew}</span>
          </div>
        </div>

        <Button
          onClick={onSelect}
          className={clsx(
            'w-full',
            isSelected
              ? `bg-${color}-600 text-white hover:bg-${color}-700`
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
        >
          {isSelected ? 'Selected' : `Select ${tier}`}
        </Button>
      </Card>
    </motion.div>
  );
};
