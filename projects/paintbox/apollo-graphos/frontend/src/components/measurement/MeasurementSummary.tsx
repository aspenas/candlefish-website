import React from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CalculatorIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SwatchIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useElevationGroups, useMeasurements, usePricing } from '@/store/measurement';
import type { ElevationType, MeasurementType } from '@/types/graphql';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

interface MeasurementSummaryProps {
  estimateId: string;
  selectedMeasurements: string[];
  className?: string;
}

export const MeasurementSummary: React.FC<MeasurementSummaryProps> = ({
  estimateId,
  selectedMeasurements,
  className
}) => {
  const elevationGroups = useElevationGroups();
  const measurements = useMeasurements();
  const { pricing, selectedTier } = usePricing();

  // Calculate summary statistics
  const totalSquareFootage = elevationGroups.reduce((total, group) => total + group.totalSquareFootage, 0);
  const totalMeasurements = Object.keys(measurements).length;
  const measurementsWithErrors = Object.values(measurements).filter(m => !m.isValid).length;
  const measurementsWithPhotos = Object.values(measurements).filter(m => m.associatedPhotoIds.length > 0).length;
  const measurementsWithColors = Object.values(measurements).filter(m => m.colorPlacement).length;

  // Group measurements by type
  const measurementsByType = Object.values(measurements).reduce((acc, measurement) => {
    if (!acc[measurement.type]) {
      acc[measurement.type] = { count: 0, squareFootage: 0 };
    }
    acc[measurement.type].count++;
    
    // Calculate square footage based on type
    let sqft = 0;
    switch (measurement.type) {
      case 'SIDING':
      case 'TRIM':
      case 'FASCIA':
      case 'SOFFIT':
        sqft = measurement.length * (measurement.height || 1);
        break;
      case 'GARAGE_DOOR':
      case 'ACCESS_DOOR':
      case 'FRONT_DOOR':
      case 'WINDOW':
        sqft = (measurement.width || 1) * (measurement.height || 1);
        break;
      case 'RAILINGS':
      case 'HANDRAILS':
        sqft = measurement.length; // Linear footage
        break;
      default:
        sqft = measurement.length * (measurement.height || measurement.width || 1);
    }
    acc[measurement.type].squareFootage += sqft;
    return acc;
  }, {} as Record<MeasurementType, { count: number; squareFootage: number }>);

  // Selected measurements summary
  const selectedMeasurementData = selectedMeasurements.map(id => measurements[id]).filter(Boolean);
  const selectedSquareFootage = selectedMeasurementData.reduce((total, measurement) => {
    let sqft = 0;
    switch (measurement.type) {
      case 'SIDING':
      case 'TRIM':
      case 'FASCIA':
      case 'SOFFIT':
        sqft = measurement.length * (measurement.height || 1);
        break;
      case 'GARAGE_DOOR':
      case 'ACCESS_DOOR':
      case 'FRONT_DOOR':
      case 'WINDOW':
        sqft = (measurement.width || 1) * (measurement.height || 1);
        break;
      case 'RAILINGS':
      case 'HANDRAILS':
        sqft = measurement.length;
        break;
      default:
        sqft = measurement.length * (measurement.height || measurement.width || 1);
    }
    return total + sqft;
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={clsx('bg-white border-l border-gray-200 overflow-y-auto', className)}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Summary</h3>
          <div className="text-sm text-gray-500">
            Real-time calculations and insights
          </div>
        </div>

        {/* Overall Statistics */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <ChartBarIcon className="w-4 h-4 mr-2 text-blue-600" />
            Overall Statistics
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Square Footage:</span>
              <span className="font-medium">{totalSquareFootage.toFixed(1)} sq ft</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total Measurements:</span>
              <span className="font-medium">{totalMeasurements}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Elevations:</span>
              <span className="font-medium">{elevationGroups.filter(g => g.measurements.length > 0).length}</span>
            </div>
            
            {measurementsWithErrors > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">Validation Errors:</span>
                <Badge variant="error" size="sm">{measurementsWithErrors}</Badge>
              </div>
            )}
          </div>
        </Card>

        {/* Elevation Breakdown */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">By Elevation</h4>
          
          <div className="space-y-3">
            {elevationGroups.filter(group => group.measurements.length > 0).map(group => (
              <div key={group.elevation} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className={clsx(
                    'w-3 h-3 rounded-full',
                    group.isSelected ? 'bg-blue-500' : 'bg-gray-300'
                  )} />
                  <span className="text-sm text-gray-600">
                    {group.elevation.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{group.totalSquareFootage.toFixed(1)} sq ft</div>
                  <div className="text-gray-500">{group.measurements.length} items</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Measurement Types */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">By Type</h4>
          
          <div className="space-y-2">
            {Object.entries(measurementsByType)
              .sort(([,a], [,b]) => b.squareFootage - a.squareFootage)
              .slice(0, 5)
              .map(([type, data]) => (
                <div key={type} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{type.replace('_', ' ')}:</span>
                  <div className="text-right">
                    <div className="font-medium">{data.squareFootage.toFixed(1)} sq ft</div>
                    <div className="text-gray-500">{data.count} items</div>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Current Pricing */}
        {pricing && (
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CurrencyDollarIcon className="w-4 h-4 mr-2 text-green-600" />
              Current Pricing - {selectedTier}
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(pricing[selectedTier.toLowerCase() as keyof typeof pricing]?.finalPrice || 0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Per Square Foot:</span>
                <span className="font-medium">
                  {formatCurrency(totalSquareFootage > 0 
                    ? (pricing[selectedTier.toLowerCase() as keyof typeof pricing]?.finalPrice || 0) / totalSquareFootage 
                    : 0
                  )}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Selected Measurements */}
        {selectedMeasurements.length > 0 && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">
              Selected ({selectedMeasurements.length})
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Square Footage:</span>
                <span className="font-medium text-blue-900">{selectedSquareFootage.toFixed(1)} sq ft</span>
              </div>
              
              <div className="text-sm text-blue-700">
                {selectedMeasurementData.map(m => m.name).join(', ')}
              </div>
            </div>
          </Card>
        )}

        {/* Progress Indicators */}
        <Card className="p-4">
          <h4 className="font-medium text-gray-900 mb-3">Completion Status</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PhotoIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Photos Added</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{measurementsWithPhotos}/{totalMeasurements}</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ 
                      width: `${totalMeasurements > 0 ? (measurementsWithPhotos / totalMeasurements) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SwatchIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Colors Applied</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{measurementsWithColors}/{totalMeasurements}</span>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ 
                      width: `${totalMeasurements > 0 ? (measurementsWithColors / totalMeasurements) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {measurementsWithErrors === 0 ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600">Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                {measurementsWithErrors === 0 ? (
                  <Badge variant="success" size="sm">Complete</Badge>
                ) : (
                  <Badge variant="error" size="sm">{measurementsWithErrors} errors</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Quick Actions</h4>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Recalculate totals
            }}
          >
            <CalculatorIcon className="w-4 h-4 mr-2" />
            Recalculate Totals
          </Button>
          
          {measurementsWithErrors > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                // Show errors
              }}
            >
              <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
              Fix {measurementsWithErrors} Error{measurementsWithErrors !== 1 ? 's' : ''}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Generate report
            }}
          >
            <ClockIcon className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
};