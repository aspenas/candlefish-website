import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  XMarkIcon,
  PhotoIcon,
  PaintBrushIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { 
  useMeasurementStore, 
  useMeasurementActions, 
  type MeasurementEntry 
} from '@/store/measurement';
import type { 
  ElevationType, 
  MeasurementType, 
  SurfaceType, 
  SidingType, 
  DoorType,
  NailCondition,
  EdgeCondition,
  FaceCondition,
  WWTagType
} from '@/types/graphql';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';

// Validation schema
const measurementSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  elevation: z.enum(['FRONT', 'REAR', 'LEFT', 'RIGHT', 'DETACHED_GARAGE', 'ATTACHED_GARAGE', 'DECK', 'PORCH', 'SHED', 'FENCE']),
  type: z.enum(['SIDING', 'TRIM', 'FASCIA', 'SOFFIT', 'GARAGE_DOOR', 'ACCESS_DOOR', 'FRONT_DOOR', 'SLIDING_DOOR', 'WINDOW', 'WINDOW_TRIM', 'SHUTTERS', 'RAILINGS', 'BALUSTERS', 'HANDRAILS', 'COLUMNS', 'BEAMS', 'LATTICE', 'VENTS', 'GUTTERS']),
  storyLevel: z.number().min(1, 'Story level must be at least 1').max(3, 'Story level cannot exceed 3'),
  length: z.number().min(0.1, 'Length must be greater than 0').max(1000, 'Length too large'),
  width: z.number().optional(),
  height: z.number().optional(),
  surfaceType: z.enum(['SMOOTH', 'TEXTURED', 'ROUGH', 'PREVIOUSLY_PAINTED', 'BARE_WOOD', 'METAL', 'COMPOSITE', 'MASONRY']),
  sidingType: z.enum(['VINYL', 'WOOD', 'FIBER_CEMENT', 'ALUMINUM', 'BRICK', 'STONE', 'STUCCO', 'LOG', 'COMPOSITE']).optional(),
  doorType: z.enum(['GARAGE', 'ACCESS', 'FRONT', 'SLIDING_PATIO', 'FRENCH', 'STORM', 'SCREEN']).optional(),
  nailCondition: z.enum(['GOOD', 'LOOSE', 'MISSING', 'RUSTY', 'POPPED', 'REQUIRES_ATTENTION']),
  edgeCondition: z.enum(['CLEAN', 'ROUGH', 'DAMAGED', 'NEEDS_CAULKING', 'REQUIRES_REPAIR']),
  faceCondition: z.enum(['SMOOTH', 'TEXTURED', 'WEATHERED', 'DAMAGED', 'NEEDS_PREPARATION']),
  wwTags: z.array(z.enum(['WW1', 'WW2', 'WW3', 'WW4', 'WW5', 'WW6', 'WW7', 'WW8', 'WW9', 'WW10', 'WW11', 'WW12', 'WW13', 'WW14', 'WW15', 'WW16', 'WW17', 'WW18', 'WW19', 'WW20', 'WW21', 'WW22', 'WW23', 'WW24', 'WW25', 'WW26', 'WW27', 'WW28', 'WW29', 'WW30'])).default([]),
});

type MeasurementFormData = z.infer<typeof measurementSchema>;

interface MeasurementFormProps {
  estimateId: string;
  measurementId?: string | null;
  defaultElevation?: ElevationType;
  onClose: () => void;
  onSave: () => void;
  className?: string;
}

// Field configurations for conditional rendering
const fieldRequirements: Record<MeasurementType, {
  requiresWidth: boolean;
  requiresHeight: boolean;
  allowsSidingType: boolean;
  allowsDoorType: boolean;
  suggestedSurface?: SurfaceType[];
}> = {
  SIDING: {
    requiresWidth: false,
    requiresHeight: true,
    allowsSidingType: true,
    allowsDoorType: false,
    suggestedSurface: ['PREVIOUSLY_PAINTED', 'BARE_WOOD', 'COMPOSITE'],
  },
  TRIM: {
    requiresWidth: false,
    requiresHeight: false,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED'],
  },
  FASCIA: {
    requiresWidth: false,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED', 'BARE_WOOD'],
  },
  SOFFIT: {
    requiresWidth: true,
    requiresHeight: false,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'TEXTURED'],
  },
  GARAGE_DOOR: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: true,
    suggestedSurface: ['METAL', 'COMPOSITE', 'PREVIOUSLY_PAINTED'],
  },
  ACCESS_DOOR: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: true,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED'],
  },
  FRONT_DOOR: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: true,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED', 'BARE_WOOD'],
  },
  SLIDING_DOOR: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: true,
    suggestedSurface: ['SMOOTH', 'METAL'],
  },
  WINDOW: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED'],
  },
  WINDOW_TRIM: {
    requiresWidth: false,
    requiresHeight: false,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED'],
  },
  SHUTTERS: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'PREVIOUSLY_PAINTED', 'BARE_WOOD'],
  },
  RAILINGS: {
    requiresWidth: false,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['METAL', 'BARE_WOOD', 'PREVIOUSLY_PAINTED'],
  },
  BALUSTERS: {
    requiresWidth: false,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['BARE_WOOD', 'PREVIOUSLY_PAINTED'],
  },
  HANDRAILS: {
    requiresWidth: false,
    requiresHeight: false,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['BARE_WOOD', 'PREVIOUSLY_PAINTED', 'METAL'],
  },
  COLUMNS: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['SMOOTH', 'TEXTURED', 'BARE_WOOD'],
  },
  BEAMS: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['BARE_WOOD', 'PREVIOUSLY_PAINTED'],
  },
  LATTICE: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['BARE_WOOD', 'PREVIOUSLY_PAINTED'],
  },
  VENTS: {
    requiresWidth: true,
    requiresHeight: true,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['METAL', 'COMPOSITE'],
  },
  GUTTERS: {
    requiresWidth: false,
    requiresHeight: false,
    allowsSidingType: false,
    allowsDoorType: false,
    suggestedSurface: ['METAL', 'COMPOSITE'],
  },
};

export const MeasurementForm: React.FC<MeasurementFormProps> = ({
  estimateId,
  measurementId,
  defaultElevation = 'FRONT',
  onClose,
  onSave,
  className
}) => {
  const { measurements } = useMeasurementStore();
  const { addMeasurement, updateMeasurement } = useMeasurementActions();
  
  const existingMeasurement = measurementId ? measurements[measurementId] : null;
  const isEditing = !!existingMeasurement;
  
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
    reset
  } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      name: existingMeasurement?.name || '',
      description: existingMeasurement?.description || '',
      elevation: existingMeasurement?.elevation || defaultElevation,
      type: existingMeasurement?.type || 'SIDING',
      storyLevel: existingMeasurement?.storyLevel || 1,
      length: existingMeasurement?.length || 0,
      width: existingMeasurement?.width || undefined,
      height: existingMeasurement?.height || undefined,
      surfaceType: existingMeasurement?.surfaceType || 'PREVIOUSLY_PAINTED',
      sidingType: existingMeasurement?.sidingType || undefined,
      doorType: existingMeasurement?.doorType || undefined,
      nailCondition: existingMeasurement?.nailCondition || 'GOOD',
      edgeCondition: existingMeasurement?.edgeCondition || 'CLEAN',
      faceCondition: existingMeasurement?.faceCondition || 'SMOOTH',
      wwTags: existingMeasurement?.wwTags || [],
    },
    mode: 'onChange',
  });
  
  const watchedType = watch('type');
  const requirements = fieldRequirements[watchedType];
  
  // Auto-suggest surface type when measurement type changes
  useEffect(() => {
    if (requirements.suggestedSurface && requirements.suggestedSurface.length > 0) {
      setValue('surfaceType', requirements.suggestedSurface[0]);
    }
  }, [watchedType, requirements.suggestedSurface, setValue]);
  
  const onSubmit = (data: MeasurementFormData) => {
    const measurementData = {
      estimateId,
      elevation: data.elevation,
      storyLevel: data.storyLevel,
      type: data.type,
      name: data.name,
      description: data.description,
      length: data.length,
      width: data.width,
      height: data.height,
      surfaceType: data.surfaceType,
      sidingType: data.sidingType,
      doorType: data.doorType,
      nailCondition: data.nailCondition,
      edgeCondition: data.edgeCondition,
      faceCondition: data.faceCondition,
      wwTags: data.wwTags,
      associatedPhotoIds: existingMeasurement?.associatedPhotoIds || [],
      colorPlacement: existingMeasurement?.colorPlacement,
      isValid: true,
      validationErrors: {},
      isEditing: false,
      isDirty: false,
    };
    
    if (isEditing && measurementId) {
      updateMeasurement(measurementId, measurementData);
    } else {
      addMeasurement(measurementData);
    }
    
    onSave();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card className={clsx('p-6', className)}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Measurement' : 'Add New Measurement'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Front siding, Garage door"
                      error={errors.name?.message}
                    />
                  )}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional details about this measurement..."
                    />
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Elevation *
                </label>
                <Controller
                  name="elevation"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="FRONT">Front Elevation</option>
                      <option value="REAR">Rear Elevation</option>
                      <option value="LEFT">Left Elevation</option>
                      <option value="RIGHT">Right Elevation</option>
                      <option value="DETACHED_GARAGE">Detached Garage</option>
                      <option value="ATTACHED_GARAGE">Attached Garage</option>
                      <option value="DECK">Deck</option>
                      <option value="PORCH">Porch</option>
                      <option value="SHED">Shed</option>
                      <option value="FENCE">Fence</option>
                    </select>
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Measurement Type *
                </label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <optgroup label="Siding & Trim">
                        <option value="SIDING">Siding</option>
                        <option value="TRIM">Trim</option>
                        <option value="FASCIA">Fascia</option>
                        <option value="SOFFIT">Soffit</option>
                      </optgroup>
                      <optgroup label="Doors">
                        <option value="GARAGE_DOOR">Garage Door</option>
                        <option value="ACCESS_DOOR">Access Door</option>
                        <option value="FRONT_DOOR">Front Door</option>
                        <option value="SLIDING_DOOR">Sliding Door</option>
                      </optgroup>
                      <optgroup label="Windows">
                        <option value="WINDOW">Window</option>
                        <option value="WINDOW_TRIM">Window Trim</option>
                        <option value="SHUTTERS">Shutters</option>
                      </optgroup>
                      <optgroup label="Railings & Details">
                        <option value="RAILINGS">Railings</option>
                        <option value="BALUSTERS">Balusters</option>
                        <option value="HANDRAILS">Handrails</option>
                        <option value="COLUMNS">Columns</option>
                        <option value="BEAMS">Beams</option>
                        <option value="LATTICE">Lattice</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="VENTS">Vents</option>
                        <option value="GUTTERS">Gutters</option>
                      </optgroup>
                    </select>
                  )}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story Level
                </label>
                <Controller
                  name="storyLevel"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1st Story</option>
                      <option value={2}>2nd Story</option>
                      <option value={3}>3rd Story</option>
                    </select>
                  )}
                />
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Dimensions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (inches) *
                  </label>
                  <Controller
                    name="length"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.1"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        error={errors.length?.message}
                      />
                    )}
                  />
                </div>
                
                {requirements.requiresWidth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (inches) *
                    </label>
                    <Controller
                      name="width"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          error={errors.width?.message}
                        />
                      )}
                    />
                  </div>
                )}
                
                {requirements.requiresHeight && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height (inches) *
                    </label>
                    <Controller
                      name="height"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          error={errors.height?.message}
                        />
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Surface Specifications */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Surface Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Surface Type *
                  </label>
                  <Controller
                    name="surfaceType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="SMOOTH">Smooth</option>
                        <option value="TEXTURED">Textured</option>
                        <option value="ROUGH">Rough</option>
                        <option value="PREVIOUSLY_PAINTED">Previously Painted</option>
                        <option value="BARE_WOOD">Bare Wood</option>
                        <option value="METAL">Metal</option>
                        <option value="COMPOSITE">Composite</option>
                        <option value="MASONRY">Masonry</option>
                      </select>
                    )}
                  />
                </div>
                
                {requirements.allowsSidingType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Siding Type
                    </label>
                    <Controller
                      name="sidingType"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select siding type</option>
                          <option value="VINYL">Vinyl</option>
                          <option value="WOOD">Wood</option>
                          <option value="FIBER_CEMENT">Fiber Cement</option>
                          <option value="ALUMINUM">Aluminum</option>
                          <option value="BRICK">Brick</option>
                          <option value="STONE">Stone</option>
                          <option value="STUCCO">Stucco</option>
                          <option value="LOG">Log</option>
                          <option value="COMPOSITE">Composite</option>
                        </select>
                      )}
                    />
                  </div>
                )}
                
                {requirements.allowsDoorType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Door Type
                    </label>
                    <Controller
                      name="doorType"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select door type</option>
                          <option value="GARAGE">Garage</option>
                          <option value="ACCESS">Access</option>
                          <option value="FRONT">Front</option>
                          <option value="SLIDING_PATIO">Sliding Patio</option>
                          <option value="FRENCH">French</option>
                          <option value="STORM">Storm</option>
                          <option value="SCREEN">Screen</option>
                        </select>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Condition Assessment */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Condition Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nail Condition
                  </label>
                  <Controller
                    name="nailCondition"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="GOOD">Good</option>
                        <option value="LOOSE">Loose</option>
                        <option value="MISSING">Missing</option>
                        <option value="RUSTY">Rusty</option>
                        <option value="POPPED">Popped</option>
                        <option value="REQUIRES_ATTENTION">Requires Attention</option>
                      </select>
                    )}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edge Condition
                  </label>
                  <Controller
                    name="edgeCondition"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="CLEAN">Clean</option>
                        <option value="ROUGH">Rough</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="NEEDS_CAULKING">Needs Caulking</option>
                        <option value="REQUIRES_REPAIR">Requires Repair</option>
                      </select>
                    )}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Face Condition
                  </label>
                  <Controller
                    name="faceCondition"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="SMOOTH">Smooth</option>
                        <option value="TEXTURED">Textured</option>
                        <option value="WEATHERED">Weathered</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="NEEDS_PREPARATION">Needs Preparation</option>
                      </select>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* WW Tags */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Company Cam Tags</h3>
              <div className="text-sm text-gray-600 mb-3">
                Select relevant WW tags (WW1-WW30) for photo organization
              </div>
              <Controller
                name="wwTags"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {Array.from({ length: 30 }, (_, i) => {
                      const tag = `WW${i + 1}` as WWTagType;
                      const isSelected = field.value.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const newTags = isSelected
                              ? field.value.filter(t => t !== tag)
                              : [...field.value, tag];
                            field.onChange(newTags);
                          }}
                          className={clsx(
                            'px-2 py-1 text-sm font-medium rounded border transition-colors',
                            isSelected
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {!isValid && Object.keys(errors).length > 0 && (
                  <div className="flex items-center space-x-1 text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>{Object.keys(errors).length} error(s)</span>
                  </div>
                )}
                {isDirty && isValid && (
                  <div className="text-green-600">
                    <span>Ready to save</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isEditing ? 'Update Measurement' : 'Add Measurement'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
};