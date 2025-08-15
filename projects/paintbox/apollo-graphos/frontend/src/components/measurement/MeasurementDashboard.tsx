import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  CalculatorIcon,
  PhotoIcon,
  ColorSwatchIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { useMeasurementStore, useElevationGroups, useMeasurementActions, useElevationActions } from '@/store/measurement';
import type { ElevationType, MeasurementType } from '@/types/graphql';
import { ElevationPanel } from './ElevationPanel';
import { MeasurementForm } from './MeasurementForm';
import { PricingPanel } from './PricingPanel';
import { PhotoGallery } from './PhotoGallery';
import { ColorPalette } from './ColorPalette';
import { CollaborationIndicator } from './CollaborationIndicator';
import { MeasurementSummary } from './MeasurementSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';

interface MeasurementDashboardProps {
  estimateId: string;
  className?: string;
}

export const MeasurementDashboard: React.FC<MeasurementDashboardProps> = ({
  estimateId,
  className
}) => {
  const elevationGroups = useElevationGroups();
  const { 
    currentElevation,
    selectedMeasurements,
    isCalculating,
    lastCalculation,
  } = useMeasurementStore();
  
  const { 
    setCurrentEstimate,
    addMeasurement,
    validateAllMeasurements,
    calculateTotals,
    recalculatePricing,
    saveMeasurements,
    loadMeasurements,
  } = useMeasurementActions();
  
  const { setCurrentElevation } = useElevationActions();
  
  const [activeTab, setActiveTab] = useState<'measurements' | 'pricing' | 'photos' | 'colors'>('measurements');
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [selectedMeasurementForEdit, setSelectedMeasurementForEdit] = useState<string | null>(null);
  const [showHiddenElevations, setShowHiddenElevations] = useState(false);

  // Load measurements when component mounts
  useEffect(() => {
    setCurrentEstimate(estimateId);
    loadMeasurements(estimateId);
  }, [estimateId, setCurrentEstimate, loadMeasurements]);

  // Auto-save measurements
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveMeasurements();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [saveMeasurements]);

  const handleAddMeasurement = (elevation: ElevationType) => {
    setCurrentElevation(elevation);
    setSelectedMeasurementForEdit(null);
    setShowMeasurementForm(true);
  };

  const handleEditMeasurement = (measurementId: string) => {
    setSelectedMeasurementForEdit(measurementId);
    setShowMeasurementForm(true);
  };

  const handleCalculatePricing = async () => {
    const isValid = validateAllMeasurements();
    if (isValid) {
      calculateTotals();
      recalculatePricing();
    }
  };

  const visibleElevations = showHiddenElevations 
    ? elevationGroups 
    : elevationGroups.filter(group => group.measurements.length > 0 || group.elevation === currentElevation);

  const totalSquareFootage = elevationGroups.reduce((total, group) => total + group.totalSquareFootage, 0);
  const totalMeasurements = elevationGroups.reduce((total, group) => total + group.measurements.length, 0);

  return (
    <div className={clsx('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Measurements</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{totalMeasurements} measurements</span>
              <span>•</span>
              <span>{totalSquareFootage.toFixed(1)} sq ft</span>
              {lastCalculation > 0 && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(lastCalculation).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <CollaborationIndicator />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHiddenElevations(!showHiddenElevations)}
              className="text-gray-600"
            >
              {showHiddenElevations ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              {showHiddenElevations ? 'Hide Empty' : 'Show All'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCalculatePricing}
              disabled={isCalculating}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <CalculatorIcon className="w-4 h-4 mr-2" />
              {isCalculating ? 'Calculating...' : 'Calculate'}
            </Button>
            
            <Button
              onClick={() => setShowMeasurementForm(true)}
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Measurement
            </Button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-8 mt-4 border-b border-gray-200">
          {[
            { key: 'measurements', label: 'Measurements', icon: DocumentDuplicateIcon },
            { key: 'pricing', label: 'Pricing', icon: CalculatorIcon },
            { key: 'photos', label: 'Photos', icon: PhotoIcon },
            { key: 'colors', label: 'Colors', icon: ColorSwatchIcon },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={clsx(
                'flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Elevation/Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'measurements' && (
              <motion.div
                key="measurements"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-hidden"
              >
                <div className="h-full overflow-y-auto p-6 space-y-6">
                  {visibleElevations.map((elevationGroup) => (
                    <ElevationPanel
                      key={elevationGroup.elevation}
                      elevationGroup={elevationGroup}
                      onAddMeasurement={handleAddMeasurement}
                      onEditMeasurement={handleEditMeasurement}
                      isActive={currentElevation === elevationGroup.elevation}
                    />
                  ))}
                  
                  {visibleElevations.length === 0 && (
                    <Card className="p-8 text-center">
                      <DocumentDuplicateIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No measurements yet</h3>
                      <p className="text-gray-500 mb-4">
                        Start by adding your first measurement to any elevation.
                      </p>
                      <Button
                        onClick={() => setShowMeasurementForm(true)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add First Measurement
                      </Button>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}
            
            {activeTab === 'pricing' && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto"
              >
                <PricingPanel estimateId={estimateId} />
              </motion.div>
            )}
            
            {activeTab === 'photos' && (
              <motion.div
                key="photos"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto"
              >
                <PhotoGallery estimateId={estimateId} />
              </motion.div>
            )}
            
            {activeTab === 'colors' && (
              <motion.div
                key="colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto"
              >
                <ColorPalette estimateId={estimateId} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Summary */}
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <MeasurementSummary 
            estimateId={estimateId}
            selectedMeasurements={Array.from(selectedMeasurements)}
          />
        </div>
      </div>

      {/* Measurement Form Modal */}
      <AnimatePresence>
        {showMeasurementForm && (
          <MeasurementForm
            estimateId={estimateId}
            measurementId={selectedMeasurementForEdit}
            defaultElevation={currentElevation}
            onClose={() => {
              setShowMeasurementForm(false);
              setSelectedMeasurementForEdit(null);
            }}
            onSave={() => {
              setShowMeasurementForm(false);
              setSelectedMeasurementForEdit(null);
              calculateTotals();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};