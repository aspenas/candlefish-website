import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Measurement,
  MeasurementInput,
  ColorPlacement,
  ColorPlacementInput,
  ElevationType,
  MeasurementType,
  SurfaceType,
  SidingType,
  DoorType,
  NailCondition,
  EdgeCondition,
  FaceCondition,
  WWTagType,
  PricingTier,
  PricingTiers,
  FinishType,
  SheenLevel,
} from '@/types/graphql';

// Measurement Entry State
export interface MeasurementEntry {
  id?: string;
  estimateId: string;
  elevation: ElevationType;
  storyLevel: number;
  type: MeasurementType;
  name: string;
  description?: string;

  // Dimensions
  length: number;
  width?: number;
  height?: number;

  // Surface specifications
  surfaceType: SurfaceType;
  sidingType?: SidingType;
  doorType?: DoorType;

  // Conditions
  nailCondition: NailCondition;
  edgeCondition: EdgeCondition;
  faceCondition: FaceCondition;

  // Color placement
  colorPlacement?: ColorPlacementInput;

  // Company Cam integration
  wwTags: WWTagType[];
  associatedPhotoIds: string[];

  // Validation and UI state
  isValid: boolean;
  validationErrors: Record<string, string>;
  isEditing: boolean;
  isDirty: boolean;
}

export interface ElevationGroup {
  elevation: ElevationType;
  measurements: MeasurementEntry[];
  totalSquareFootage: number;
  isExpanded: boolean;
  isSelected: boolean;
}

export interface ColorSwatch {
  id: string;
  name: string;
  brand: string;
  productCode: string;
  hex: string;
  rgb: string;
  finish: FinishType;
}

export interface PhotoUpload {
  id: string;
  file: File;
  preview: string;
  wwTags: WWTagType[];
  associatedMeasurements: string[];
  uploadProgress: number;
  uploaded: boolean;
  companyCamId?: string;
  error?: string;
}

export interface PricingCalculation {
  tier: PricingTier;
  laborCost: number;
  materialCost: number;
  subtotal: number;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  marginPercentage: number;
}

// Real-time collaboration state
export interface CollaborationState {
  connectedUsers: Array<{
    userId: string;
    userName: string;
    cursor: { x: number; y: number } | null;
    currentMeasurement?: string;
    editingField?: string;
  }>;
  lockedMeasurements: Set<string>;
  lastSync: number;
}

// Main measurement store interface
export interface MeasurementStore {
  // State
  currentEstimateId?: string;
  measurements: Record<string, MeasurementEntry>;
  elevationGroups: ElevationGroup[];
  colorSwatches: ColorSwatch[];
  photoUploads: Record<string, PhotoUpload>;
  pricing: PricingTiers | null;
  selectedTier: PricingTier;
  appliedDiscount: { type: string; value: number; reason: string } | null;
  collaboration: CollaborationState;

  // UI state
  currentElevation: ElevationType;
  selectedMeasurements: Set<string>;
  measurementFilter: {
    elevation?: ElevationType;
    type?: MeasurementType;
    searchQuery?: string;
  };
  isCalculating: boolean;
  lastCalculation: number;

  // Actions - Measurement Management
  setCurrentEstimate: (estimateId: string) => void;
  addMeasurement: (measurement: Omit<MeasurementEntry, 'id' | 'isDirty' | 'isValid' | 'validationErrors'>) => string;
  updateMeasurement: (id: string, updates: Partial<MeasurementEntry>) => void;
  deleteMeasurement: (id: string) => void;
  bulkUpdateMeasurements: (updates: Array<{ id: string; updates: Partial<MeasurementEntry> }>) => void;
  duplicateMeasurement: (id: string) => string;

  // Actions - Elevation Management
  setCurrentElevation: (elevation: ElevationType) => void;
  toggleElevationExpanded: (elevation: ElevationType) => void;
  toggleElevationSelection: (elevation: ElevationType) => void;
  excludeElevation: (elevation: ElevationType) => void;
  includeElevation: (elevation: ElevationType) => void;

  // Actions - Selection and Filtering
  selectMeasurement: (id: string) => void;
  selectMeasurements: (ids: string[]) => void;
  deselectMeasurement: (id: string) => void;
  deselectAllMeasurements: () => void;
  setMeasurementFilter: (filter: Partial<typeof MeasurementStore.prototype.measurementFilter>) => void;
  clearMeasurementFilter: () => void;

  // Actions - Color Management
  addColorSwatch: (swatch: Omit<ColorSwatch, 'id'>) => void;
  updateColorSwatch: (id: string, updates: Partial<ColorSwatch>) => void;
  removeColorSwatch: (id: string) => void;
  applyColorToMeasurement: (measurementId: string, colorPlacement: ColorPlacementInput) => void;

  // Actions - Photo Management
  addPhotoUpload: (file: File) => string;
  updatePhotoUpload: (id: string, updates: Partial<PhotoUpload>) => void;
  removePhotoUpload: (id: string) => void;
  associatePhotoWithMeasurement: (photoId: string, measurementId: string) => void;
  disassociatePhotoFromMeasurement: (photoId: string, measurementId: string) => void;
  setPhotoWWTags: (photoId: string, tags: WWTagType[]) => void;

  // Actions - Pricing
  updatePricing: (pricing: PricingTiers) => void;
  selectPricingTier: (tier: PricingTier) => void;
  applyDiscount: (discount: { type: string; value: number; reason: string }) => void;
  removeDiscount: () => void;

  // Actions - Collaboration
  updateCollaboration: (state: Partial<CollaborationState>) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number } | null) => void;
  lockMeasurement: (measurementId: string, userId: string) => void;
  unlockMeasurement: (measurementId: string) => void;
  setUserEditingField: (userId: string, measurementId?: string, field?: string) => void;

  // Actions - Validation and Calculation
  validateMeasurement: (id: string) => boolean;
  validateAllMeasurements: () => boolean;
  calculateTotals: () => void;
  recalculatePricing: () => void;

  // Actions - Persistence
  saveMeasurements: () => Promise<void>;
  loadMeasurements: (estimateId: string) => Promise<void>;
  exportMeasurements: () => string; // JSON export
  importMeasurements: (data: string) => void;

  // Reset
  reset: () => void;
  resetForNewEstimate: () => void;
}

// Initial state
const initialCollaborationState: CollaborationState = {
  connectedUsers: [],
  lockedMeasurements: new Set(),
  lastSync: 0,
};

// Validation functions
const validateMeasurement = (measurement: MeasurementEntry): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!measurement.name.trim()) {
    errors.name = 'Name is required';
  }

  if (!measurement.length || measurement.length <= 0) {
    errors.length = 'Length must be greater than 0';
  }

  if (measurement.type === 'SIDING' && !measurement.height) {
    errors.height = 'Height is required for siding measurements';
  }

  if (measurement.type === 'WINDOW' && (!measurement.width || measurement.width <= 0)) {
    errors.width = 'Width is required for window measurements';
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
};

// Utility function to calculate square footage
const calculateSquareFootage = (measurement: MeasurementEntry): number => {
  switch (measurement.type) {
    case 'SIDING':
    case 'TRIM':
    case 'FASCIA':
    case 'SOFFIT':
      return measurement.length * (measurement.height || 1);
    case 'GARAGE_DOOR':
    case 'ACCESS_DOOR':
    case 'FRONT_DOOR':
    case 'WINDOW':
      return (measurement.width || 1) * (measurement.height || 1);
    case 'RAILINGS':
    case 'HANDRAILS':
      return measurement.length; // Linear footage for railings
    default:
      return measurement.length * (measurement.height || measurement.width || 1);
  }
};

// Generate unique ID
const generateId = () => `measurement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create store
export const useMeasurementStore = create<MeasurementStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      measurements: {},
      elevationGroups: [
        { elevation: 'FRONT', measurements: [], totalSquareFootage: 0, isExpanded: true, isSelected: false },
        { elevation: 'REAR', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
        { elevation: 'LEFT', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
        { elevation: 'RIGHT', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
        { elevation: 'DETACHED_GARAGE', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
      ],
      colorSwatches: [],
      photoUploads: {},
      pricing: null,
      selectedTier: 'BETTER',
      appliedDiscount: null,
      collaboration: initialCollaborationState,
      currentElevation: 'FRONT',
      selectedMeasurements: new Set(),
      measurementFilter: {},
      isCalculating: false,
      lastCalculation: 0,

      // Measurement Management
      setCurrentEstimate: (estimateId) => set((state) => {
        state.currentEstimateId = estimateId;
      }),

      addMeasurement: (measurementData) => {
        const id = generateId();
        return set((state) => {
          const measurement: MeasurementEntry = {
            ...measurementData,
            id,
            isDirty: true,
            isEditing: false,
            ...validateMeasurement(measurementData as MeasurementEntry),
          };

          state.measurements[id] = measurement;

          // Add to elevation group
          const elevationGroup = state.elevationGroups.find(g => g.elevation === measurement.elevation);
          if (elevationGroup) {
            elevationGroup.measurements.push(measurement);
            elevationGroup.totalSquareFootage += calculateSquareFootage(measurement);
          }
        }), id;
      },

      updateMeasurement: (id, updates) => set((state) => {
        const measurement = state.measurements[id];
        if (measurement) {
          const updatedMeasurement = { ...measurement, ...updates, isDirty: true };
          const validation = validateMeasurement(updatedMeasurement);

          state.measurements[id] = {
            ...updatedMeasurement,
            ...validation,
          };

          // Update elevation group
          const oldElevationGroup = state.elevationGroups.find(g => g.elevation === measurement.elevation);
          const newElevationGroup = state.elevationGroups.find(g => g.elevation === updatedMeasurement.elevation);

          if (oldElevationGroup) {
            const index = oldElevationGroup.measurements.findIndex(m => m.id === id);
            if (index >= 0) {
              oldElevationGroup.totalSquareFootage -= calculateSquareFootage(measurement);

              if (oldElevationGroup === newElevationGroup) {
                oldElevationGroup.measurements[index] = state.measurements[id];
                oldElevationGroup.totalSquareFootage += calculateSquareFootage(state.measurements[id]);
              } else {
                oldElevationGroup.measurements.splice(index, 1);
                if (newElevationGroup) {
                  newElevationGroup.measurements.push(state.measurements[id]);
                  newElevationGroup.totalSquareFootage += calculateSquareFootage(state.measurements[id]);
                }
              }
            }
          }
        }
      }),

      deleteMeasurement: (id) => set((state) => {
        const measurement = state.measurements[id];
        if (measurement) {
          // Remove from elevation group
          const elevationGroup = state.elevationGroups.find(g => g.elevation === measurement.elevation);
          if (elevationGroup) {
            const index = elevationGroup.measurements.findIndex(m => m.id === id);
            if (index >= 0) {
              elevationGroup.measurements.splice(index, 1);
              elevationGroup.totalSquareFootage -= calculateSquareFootage(measurement);
            }
          }

          delete state.measurements[id];
          state.selectedMeasurements.delete(id);
        }
      }),

      bulkUpdateMeasurements: (updates) => set((state) => {
        updates.forEach(({ id, updates: measurementUpdates }) => {
          const measurement = state.measurements[id];
          if (measurement) {
            const updatedMeasurement = { ...measurement, ...measurementUpdates, isDirty: true };
            const validation = validateMeasurement(updatedMeasurement);

            state.measurements[id] = {
              ...updatedMeasurement,
              ...validation,
            };
          }
        });

        // Recalculate elevation totals
        state.elevationGroups.forEach(group => {
          group.measurements = Object.values(state.measurements).filter(m => m.elevation === group.elevation);
          group.totalSquareFootage = group.measurements.reduce((total, m) => total + calculateSquareFootage(m), 0);
        });
      }),

      duplicateMeasurement: (id) => {
        const measurement = get().measurements[id];
        if (measurement) {
          const duplicateData = {
            ...measurement,
            name: `${measurement.name} (Copy)`,
            isDirty: true,
            isEditing: false,
          };
          delete duplicateData.id;
          return get().addMeasurement(duplicateData);
        }
        return '';
      },

      // Elevation Management
      setCurrentElevation: (elevation) => set((state) => {
        state.currentElevation = elevation;
      }),

      toggleElevationExpanded: (elevation) => set((state) => {
        const group = state.elevationGroups.find(g => g.elevation === elevation);
        if (group) {
          group.isExpanded = !group.isExpanded;
        }
      }),

      toggleElevationSelection: (elevation) => set((state) => {
        const group = state.elevationGroups.find(g => g.elevation === elevation);
        if (group) {
          group.isSelected = !group.isSelected;
        }
      }),

      excludeElevation: (elevation) => set((state) => {
        const group = state.elevationGroups.find(g => g.elevation === elevation);
        if (group) {
          group.isSelected = false;
        }
      }),

      includeElevation: (elevation) => set((state) => {
        const group = state.elevationGroups.find(g => g.elevation === elevation);
        if (group) {
          group.isSelected = true;
        }
      }),

      // Selection and Filtering
      selectMeasurement: (id) => set((state) => {
        state.selectedMeasurements.add(id);
      }),

      selectMeasurements: (ids) => set((state) => {
        ids.forEach(id => state.selectedMeasurements.add(id));
      }),

      deselectMeasurement: (id) => set((state) => {
        state.selectedMeasurements.delete(id);
      }),

      deselectAllMeasurements: () => set((state) => {
        state.selectedMeasurements.clear();
      }),

      setMeasurementFilter: (filter) => set((state) => {
        state.measurementFilter = { ...state.measurementFilter, ...filter };
      }),

      clearMeasurementFilter: () => set((state) => {
        state.measurementFilter = {};
      }),

      // Color Management
      addColorSwatch: (swatchData) => set((state) => {
        const swatch: ColorSwatch = {
          ...swatchData,
          id: generateId(),
        };
        state.colorSwatches.push(swatch);
      }),

      updateColorSwatch: (id, updates) => set((state) => {
        const index = state.colorSwatches.findIndex(s => s.id === id);
        if (index >= 0) {
          state.colorSwatches[index] = { ...state.colorSwatches[index], ...updates };
        }
      }),

      removeColorSwatch: (id) => set((state) => {
        state.colorSwatches = state.colorSwatches.filter(s => s.id !== id);
      }),

      applyColorToMeasurement: (measurementId, colorPlacement) => set((state) => {
        const measurement = state.measurements[measurementId];
        if (measurement) {
          measurement.colorPlacement = colorPlacement;
          measurement.isDirty = true;
        }
      }),

      // Photo Management
      addPhotoUpload: (file) => {
        const id = generateId();
        return set((state) => {
          state.photoUploads[id] = {
            id,
            file,
            preview: URL.createObjectURL(file),
            wwTags: [],
            associatedMeasurements: [],
            uploadProgress: 0,
            uploaded: false,
          };
        }), id;
      },

      updatePhotoUpload: (id, updates) => set((state) => {
        const photo = state.photoUploads[id];
        if (photo) {
          state.photoUploads[id] = { ...photo, ...updates };
        }
      }),

      removePhotoUpload: (id) => set((state) => {
        const photo = state.photoUploads[id];
        if (photo) {
          URL.revokeObjectURL(photo.preview);
          delete state.photoUploads[id];
        }
      }),

      associatePhotoWithMeasurement: (photoId, measurementId) => set((state) => {
        const photo = state.photoUploads[photoId];
        if (photo && !photo.associatedMeasurements.includes(measurementId)) {
          photo.associatedMeasurements.push(measurementId);
        }
      }),

      disassociatePhotoFromMeasurement: (photoId, measurementId) => set((state) => {
        const photo = state.photoUploads[photoId];
        if (photo) {
          photo.associatedMeasurements = photo.associatedMeasurements.filter(id => id !== measurementId);
        }
      }),

      setPhotoWWTags: (photoId, tags) => set((state) => {
        const photo = state.photoUploads[photoId];
        if (photo) {
          photo.wwTags = tags;
        }
      }),

      // Pricing
      updatePricing: (pricing) => set((state) => {
        state.pricing = pricing;
      }),

      selectPricingTier: (tier) => set((state) => {
        state.selectedTier = tier;
      }),

      applyDiscount: (discount) => set((state) => {
        state.appliedDiscount = discount;
      }),

      removeDiscount: () => set((state) => {
        state.appliedDiscount = null;
      }),

      // Collaboration
      updateCollaboration: (collaborationState) => set((state) => {
        state.collaboration = { ...state.collaboration, ...collaborationState };
      }),

      updateUserCursor: (userId, cursor) => set((state) => {
        const user = state.collaboration.connectedUsers.find(u => u.userId === userId);
        if (user) {
          user.cursor = cursor;
        }
      }),

      lockMeasurement: (measurementId, userId) => set((state) => {
        state.collaboration.lockedMeasurements.add(measurementId);
        const user = state.collaboration.connectedUsers.find(u => u.userId === userId);
        if (user) {
          user.currentMeasurement = measurementId;
        }
      }),

      unlockMeasurement: (measurementId) => set((state) => {
        state.collaboration.lockedMeasurements.delete(measurementId);
        state.collaboration.connectedUsers.forEach(user => {
          if (user.currentMeasurement === measurementId) {
            user.currentMeasurement = undefined;
            user.editingField = undefined;
          }
        });
      }),

      setUserEditingField: (userId, measurementId, field) => set((state) => {
        const user = state.collaboration.connectedUsers.find(u => u.userId === userId);
        if (user) {
          user.currentMeasurement = measurementId;
          user.editingField = field;
        }
      }),

      // Validation and Calculation
      validateMeasurement: (id) => {
        const measurement = get().measurements[id];
        if (measurement) {
          const validation = validateMeasurement(measurement);
          set((state) => {
            state.measurements[id] = { ...measurement, ...validation };
          });
          return validation.isValid;
        }
        return false;
      },

      validateAllMeasurements: () => {
        const measurements = get().measurements;
        let allValid = true;

        set((state) => {
          Object.keys(measurements).forEach(id => {
            const measurement = measurements[id];
            const validation = validateMeasurement(measurement);
            state.measurements[id] = { ...measurement, ...validation };
            if (!validation.isValid) {
              allValid = false;
            }
          });
        });

        return allValid;
      },

      calculateTotals: () => set((state) => {
        state.elevationGroups.forEach(group => {
          group.totalSquareFootage = Object.values(state.measurements)
            .filter(m => m.elevation === group.elevation)
            .reduce((total, m) => total + calculateSquareFootage(m), 0);
        });
        state.lastCalculation = Date.now();
      }),

      recalculatePricing: () => set((state) => {
        state.isCalculating = true;
        // This would trigger a GraphQL mutation to recalculate pricing
        // For now, just update the timestamp
        setTimeout(() => {
          set((state) => {
            state.isCalculating = false;
            state.lastCalculation = Date.now();
          });
        }, 1000);
      }),

      // Persistence (these would integrate with Apollo Client)
      saveMeasurements: async () => {
        // Implementation would use Apollo Client mutations
        console.log('Saving measurements...');
      },

      loadMeasurements: async (estimateId) => {
        // Implementation would use Apollo Client queries
        console.log('Loading measurements for estimate:', estimateId);
        set((state) => {
          state.currentEstimateId = estimateId;
        });
      },

      exportMeasurements: () => {
        const state = get();
        return JSON.stringify({
          measurements: state.measurements,
          colorSwatches: state.colorSwatches,
          selectedTier: state.selectedTier,
          appliedDiscount: state.appliedDiscount,
        }, null, 2);
      },

      importMeasurements: (data) => {
        try {
          const imported = JSON.parse(data);
          set((state) => {
            state.measurements = imported.measurements || {};
            state.colorSwatches = imported.colorSwatches || [];
            state.selectedTier = imported.selectedTier || 'BETTER';
            state.appliedDiscount = imported.appliedDiscount || null;

            // Rebuild elevation groups
            state.elevationGroups.forEach(group => {
              group.measurements = Object.values(state.measurements).filter(m => m.elevation === group.elevation);
              group.totalSquareFootage = group.measurements.reduce((total, m) => total + calculateSquareFootage(m), 0);
            });
          });
        } catch (error) {
          console.error('Failed to import measurements:', error);
        }
      },

      // Reset
      reset: () => set(() => ({
        measurements: {},
        elevationGroups: [
          { elevation: 'FRONT', measurements: [], totalSquareFootage: 0, isExpanded: true, isSelected: false },
          { elevation: 'REAR', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
          { elevation: 'LEFT', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
          { elevation: 'RIGHT', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
          { elevation: 'DETACHED_GARAGE', measurements: [], totalSquareFootage: 0, isExpanded: false, isSelected: false },
        ],
        colorSwatches: [],
        photoUploads: {},
        pricing: null,
        selectedTier: 'BETTER',
        appliedDiscount: null,
        collaboration: initialCollaborationState,
        currentElevation: 'FRONT',
        selectedMeasurements: new Set(),
        measurementFilter: {},
        isCalculating: false,
        lastCalculation: 0,
      })),

      resetForNewEstimate: () => set((state) => {
        // Keep color swatches but reset everything else
        const colorSwatches = state.colorSwatches;
        state.measurements = {};
        state.photoUploads = {};
        state.pricing = null;
        state.selectedTier = 'BETTER';
        state.appliedDiscount = null;
        state.collaboration = initialCollaborationState;
        state.selectedMeasurements = new Set();
        state.measurementFilter = {};
        state.isCalculating = false;
        state.lastCalculation = 0;

        state.elevationGroups.forEach(group => {
          group.measurements = [];
          group.totalSquareFootage = 0;
          group.isExpanded = group.elevation === 'FRONT';
          group.isSelected = false;
        });

        state.colorSwatches = colorSwatches;
      }),
    })),
    {
      name: 'paintbox-measurement-store',
    }
  )
);

// Selectors
export const useMeasurements = () => useMeasurementStore((state) => state.measurements);
export const useElevationGroups = () => useMeasurementStore((state) => state.elevationGroups);
export const useCurrentElevation = () => useMeasurementStore((state) => state.currentElevation);
export const useSelectedMeasurements = () => useMeasurementStore((state) => state.selectedMeasurements);
export const useColorSwatches = () => useMeasurementStore((state) => state.colorSwatches);
export const usePhotoUploads = () => useMeasurementStore((state) => state.photoUploads);
export const usePricing = () => useMeasurementStore((state) => ({
  pricing: state.pricing,
  selectedTier: state.selectedTier,
  appliedDiscount: state.appliedDiscount,
}));
export const useCollaboration = () => useMeasurementStore((state) => state.collaboration);

// Actions
export const useMeasurementActions = () => useMeasurementStore((state) => ({
  setCurrentEstimate: state.setCurrentEstimate,
  addMeasurement: state.addMeasurement,
  updateMeasurement: state.updateMeasurement,
  deleteMeasurement: state.deleteMeasurement,
  bulkUpdateMeasurements: state.bulkUpdateMeasurements,
  duplicateMeasurement: state.duplicateMeasurement,
  validateMeasurement: state.validateMeasurement,
  validateAllMeasurements: state.validateAllMeasurements,
  calculateTotals: state.calculateTotals,
  recalculatePricing: state.recalculatePricing,
  saveMeasurements: state.saveMeasurements,
  loadMeasurements: state.loadMeasurements,
}));

export const useElevationActions = () => useMeasurementStore((state) => ({
  setCurrentElevation: state.setCurrentElevation,
  toggleElevationExpanded: state.toggleElevationExpanded,
  toggleElevationSelection: state.toggleElevationSelection,
  excludeElevation: state.excludeElevation,
  includeElevation: state.includeElevation,
}));

export const useColorActions = () => useMeasurementStore((state) => ({
  addColorSwatch: state.addColorSwatch,
  updateColorSwatch: state.updateColorSwatch,
  removeColorSwatch: state.removeColorSwatch,
  applyColorToMeasurement: state.applyColorToMeasurement,
}));

export const usePhotoActions = () => useMeasurementStore((state) => ({
  addPhotoUpload: state.addPhotoUpload,
  updatePhotoUpload: state.updatePhotoUpload,
  removePhotoUpload: state.removePhotoUpload,
  associatePhotoWithMeasurement: state.associatePhotoWithMeasurement,
  disassociatePhotoFromMeasurement: state.disassociatePhotoFromMeasurement,
  setPhotoWWTags: state.setPhotoWWTags,
}));
