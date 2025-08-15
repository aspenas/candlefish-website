import { gql } from '@apollo/client';

// Core measurement fragments
export const MEASUREMENT_FRAGMENT = gql`
  fragment MeasurementFragment on Measurement {
    id
    estimateId
    elevationId
    storyId
    type
    name
    description
    length
    width
    height
    squareFootage
    surfaceType
    sidingType
    doorType
    nailCondition
    edgeCondition
    faceCondition
    laborHours
    materialQuantity
    difficulty
    createdAt
    updatedAt
    lastEditedBy
    colorPlacement {
      id
      primaryColor {
        name
        brand
        productCode
        hex
        rgb
        finish
      }
      accentColor {
        name
        brand
        productCode
        hex
        rgb
        finish
      }
      trimColor {
        name
        brand
        productCode
        hex
        rgb
        finish
      }
      coats
      primerRequired
      finish
      sheen
    }
    associatedPhotos {
      id
      companyCamId
      url
      thumbnailUrl
      description
      capturedAt
      wwTags {
        id
        tag
        description
        category
      }
    }
    wwTags {
      id
      tag
      description
      category
    }
  }
`;

export const ELEVATION_FRAGMENT = gql`
  fragment ElevationFragment on Elevation {
    id
    estimateId
    type
    name
    description
    isIncludedInPainting
    totalSquareFootage
    accessDifficulty
    specialConditions
    stories {
      id
      level
      name
      squareFootage
    }
    measurements {
      ...MeasurementFragment
    }
  }
  ${MEASUREMENT_FRAGMENT}
`;

export const PRICING_FRAGMENT = gql`
  fragment PricingFragment on PricingTiers {
    good {
      tier
      laborCost
      materialCost
      subtotal
      basePrice
      discountAmount
      finalPrice
      marginPercentage
      profitAmount
      productSelection {
        tier
      }
      warranty {
        years
      }
      laborSpecifications {
        hours
      }
    }
    better {
      tier
      laborCost
      materialCost
      subtotal
      basePrice
      discountAmount
      finalPrice
      marginPercentage
      profitAmount
      productSelection {
        tier
      }
      warranty {
        years
      }
      laborSpecifications {
        hours
      }
    }
    best {
      tier
      laborCost
      materialCost
      subtotal
      basePrice
      discountAmount
      finalPrice
      marginPercentage
      profitAmount
      productSelection {
        tier
      }
      warranty {
        years
      }
      laborSpecifications {
        hours
      }
    }
  }
`;

export const ESTIMATE_FRAGMENT = gql`
  fragment EstimateFragment on Estimate {
    id
    customerId
    projectId
    name
    description
    status
    version
    totalSquareFootage
    laborHours
    materialCost
    selectedTier
    finalPricing {
      selectedTier
      finalPrice
      marginAnalysis {
        percentage
      }
    }
    excludedElevations
    createdAt
    updatedAt
    createdBy
    lastModifiedBy
    currentCollaborators {
      userId
      userName
      role
      joinedAt
      currentlyEditing
      lastActivity
    }
    notes
    elevations {
      ...ElevationFragment
    }
    pricingTiers {
      ...PricingFragment
    }
    appliedDiscount {
      type
      value
      reason
    }
  }
  ${ELEVATION_FRAGMENT}
  ${PRICING_FRAGMENT}
`;

// Queries
export const GET_ESTIMATE_WITH_MEASUREMENTS = gql`
  query GetEstimateWithMeasurements($id: ID!) {
    estimate(id: $id) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const GET_MEASUREMENTS_BY_ELEVATION = gql`
  query GetMeasurementsByElevation($estimateId: ID!, $elevation: ElevationType!) {
    measurementsByElevation(estimateId: $estimateId, elevation: $elevation) {
      ...MeasurementFragment
    }
  }
  ${MEASUREMENT_FRAGMENT}
`;

export const GET_MEASUREMENT_SUMMARY = gql`
  query GetMeasurementSummary($estimateId: ID!) {
    measurementSummary(estimateId: $estimateId) {
      estimateId
      elevationTotals {
        elevation
        squareFootage
        laborHours
        materialCost
        measurementCount
      }
      typeTotals {
        type
        squareFootage
        count
        averageSize
      }
      totalSquareFootage
      totalLaborHours
      totalMaterialCost
      conditionBreakdown {
        good
        needsAttention
      }
      overallComplexity
      accessAnalysis {
        difficulty
      }
    }
  }
`;

export const GET_PRICING_CALCULATION = gql`
  query GetPricingCalculation($input: ComprehensivePricingInput!) {
    calculatePricingTiers(input: $input) {
      ...PricingFragment
    }
  }
  ${PRICING_FRAGMENT}
`;

export const GET_COLOR_PLACEMENT_OPTIONS = gql`
  query GetColorPlacementOptions($roomType: RoomType!, $measurements: [MeasurementInput!]!) {
    colorPlacementOptions(roomType: $roomType, measurements: $measurements) {
      id
      description
      primaryColor {
        name
        brand
        hex
      }
      accentColor {
        name
        brand
        hex
      }
      trimColor {
        name
        brand
        hex
      }
    }
  }
`;

// Mutations
export const CREATE_ESTIMATE = gql`
  mutation CreateEstimate($input: CreateEstimateInput!) {
    createEstimate(input: $input) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const UPDATE_ESTIMATE = gql`
  mutation UpdateEstimate($id: ID!, $input: UpdateEstimateInput!) {
    updateEstimate(id: $id, input: $input) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const ADD_MEASUREMENT = gql`
  mutation AddMeasurement($estimateId: ID!, $input: MeasurementInput!) {
    addMeasurement(estimateId: $estimateId, input: $input) {
      ...MeasurementFragment
    }
  }
  ${MEASUREMENT_FRAGMENT}
`;

export const UPDATE_MEASUREMENT = gql`
  mutation UpdateMeasurement($measurementId: ID!, $input: UpdateMeasurementInput!) {
    updateMeasurement(measurementId: $measurementId, input: $input) {
      ...MeasurementFragment
    }
  }
  ${MEASUREMENT_FRAGMENT}
`;

export const DELETE_MEASUREMENT = gql`
  mutation DeleteMeasurement($measurementId: ID!) {
    deleteMeasurement(measurementId: $measurementId)
  }
`;

export const BULK_UPDATE_MEASUREMENTS = gql`
  mutation BulkUpdateMeasurements($estimateId: ID!, $measurements: [BulkMeasurementInput!]!) {
    bulkUpdateMeasurements(estimateId: $estimateId, measurements: $measurements) {
      updated
      failed
    }
  }
`;

export const UPDATE_COLOR_PLACEMENT = gql`
  mutation UpdateColorPlacement($measurementId: ID!, $input: ColorPlacementInput!) {
    updateColorPlacement(measurementId: $measurementId, input: $input) {
      ...MeasurementFragment
    }
  }
  ${MEASUREMENT_FRAGMENT}
`;

export const SELECT_PRICING_TIER = gql`
  mutation SelectPricingTier($estimateId: ID!, $tier: PricingTier!) {
    selectPricingTier(estimateId: $estimateId, tier: $tier) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const APPLY_DISCOUNT = gql`
  mutation ApplyDiscount($estimateId: ID!, $input: DiscountInput!) {
    applyDiscount(estimateId: $estimateId, input: $input) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const EXCLUDE_ELEVATION = gql`
  mutation ExcludeElevation($estimateId: ID!, $elevation: ElevationType!) {
    excludeElevationFromPainting(estimateId: $estimateId, elevation: $elevation) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const INCLUDE_ELEVATION = gql`
  mutation IncludeElevation($estimateId: ID!, $elevation: ElevationType!) {
    includeElevationInPainting(estimateId: $estimateId, elevation: $elevation) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const GENERATE_PDF = gql`
  mutation GeneratePDF($estimateId: ID!, $options: PDFGenerationOptions) {
    generatePDF(estimateId: $estimateId, options: $options) {
      success
      url
      error
    }
  }
`;

export const GENERATE_MEASUREMENT_REPORT = gql`
  mutation GenerateMeasurementReport($estimateId: ID!) {
    generateMeasurementReport(estimateId: $estimateId) {
      success
      url
      error
    }
  }
`;

// Subscriptions
export const ESTIMATE_UPDATED_SUBSCRIPTION = gql`
  subscription EstimateUpdated($id: ID!) {
    estimateUpdated(id: $id) {
      ...EstimateFragment
    }
  }
  ${ESTIMATE_FRAGMENT}
`;

export const MEASUREMENT_UPDATED_SUBSCRIPTION = gql`
  subscription MeasurementUpdated($estimateId: ID!) {
    measurementUpdated(estimateId: $estimateId) {
      measurementId
      change
      user
    }
  }
`;

export const CALCULATION_PROGRESS_SUBSCRIPTION = gql`
  subscription CalculationProgress($estimateId: ID!) {
    calculationProgress(estimateId: $estimateId) {
      stage
      progress
      completed
    }
  }
`;

export const USER_JOINED_ESTIMATE_SUBSCRIPTION = gql`
  subscription UserJoinedEstimate($estimateId: ID!) {
    userJoinedEstimate(estimateId: $estimateId) {
      userId
      userName
      role
      joinedAt
      currentlyEditing
      lastActivity
    }
  }
`;

export const USER_LEFT_ESTIMATE_SUBSCRIPTION = gql`
  subscription UserLeftEstimate($estimateId: ID!) {
    userLeftEstimate(estimateId: $estimateId) {
      userId
      userName
      role
      joinedAt
      currentlyEditing
      lastActivity
    }
  }
`;

export const MEASUREMENT_BEING_EDITED_SUBSCRIPTION = gql`
  subscription MeasurementBeingEdited($estimateId: ID!) {
    measurementBeingEdited(estimateId: $estimateId) {
      measurementId
      userId
      userName
      editingField
      lockedAt
    }
  }
`;

// Custom hooks for the operations
export interface MeasurementOperations {
  // Queries
  useGetEstimate: (id: string) => any;
  useGetMeasurementsByElevation: (estimateId: string, elevation: string) => any;
  useGetMeasurementSummary: (estimateId: string) => any;
  useGetPricingCalculation: (input: any) => any;
  
  // Mutations
  useCreateEstimate: () => any;
  useUpdateEstimate: () => any;
  useAddMeasurement: () => any;
  useUpdateMeasurement: () => any;
  useDeleteMeasurement: () => any;
  useBulkUpdateMeasurements: () => any;
  useUpdateColorPlacement: () => any;
  useSelectPricingTier: () => any;
  useApplyDiscount: () => any;
  useExcludeElevation: () => any;
  useIncludeElevation: () => any;
  useGeneratePDF: () => any;
  useGenerateMeasurementReport: () => any;
  
  // Subscriptions
  useEstimateUpdatedSubscription: (id: string) => any;
  useMeasurementUpdatedSubscription: (estimateId: string) => any;
  useCalculationProgressSubscription: (estimateId: string) => any;
  useUserJoinedEstimateSubscription: (estimateId: string) => any;
  useUserLeftEstimateSubscription: (estimateId: string) => any;
  useMeasurementBeingEditedSubscription: (estimateId: string) => any;
}

// Type definitions for TypeScript
export interface MeasurementInput {
  type: string;
  name: string;
  elevation: string;
  story?: number;
  length: number;
  width?: number;
  height?: number;
  surfaceType: string;
  sidingType?: string;
  doorType?: string;
  nailCondition: string;
  edgeCondition: string;
  faceCondition: string;
  colorPlacement?: ColorPlacementInput;
  wwTags?: string[];
  photoIds?: string[];
  description?: string;
}

export interface ColorPlacementInput {
  primaryColor: ColorSpecificationInput;
  accentColor?: ColorSpecificationInput;
  trimColor?: ColorSpecificationInput;
  coats: number;
  primerRequired: boolean;
  finish: string;
  sheen: string;
}

export interface ColorSpecificationInput {
  name: string;
  brand: string;
  productCode?: string;
  rgb?: string;
  hex?: string;
  finish: string;
}

export interface DiscountInput {
  type: string;
  value: number;
  reason: string;
  expiresAt?: string;
}

export interface ComprehensivePricingInput {
  estimateId: string;
  laborRatePerHour: number;
  materialMarkup: number;
  overheadPercentage: number;
  desiredMarginPercentage: number;
  goodTierProducts: ProductSelectionInput;
  betterTierProducts: ProductSelectionInput;
  bestTierProducts: ProductSelectionInput;
}

export interface ProductSelectionInput {
  paint: string;
  primer: string;
  warranty?: number;
  features?: string[];
}

export interface PDFGenerationOptions {
  includePhotos?: boolean;
  includeColorSwatches?: boolean;
  includeDetailedBreakdown?: boolean;
  template?: string;
}

// Error types
export interface MeasurementError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: MeasurementError[];
  warnings?: MeasurementError[];
}

// Real-time event types
export interface MeasurementUpdateEvent {
  measurementId: string;
  change: string;
  user: string;
  timestamp: string;
}

export interface CollaboratorEvent {
  userId: string;
  userName: string;
  action: 'joined' | 'left' | 'editing' | 'idle';
  measurementId?: string;
  field?: string;
  timestamp: string;
}

export interface CalculationProgressEvent {
  stage: string;
  progress: number;
  completed: boolean;
  message?: string;
  errors?: string[];
}