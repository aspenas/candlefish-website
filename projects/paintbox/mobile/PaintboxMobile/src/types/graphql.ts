// GraphQL Types for Paintbox Mobile App
// Based on the Apollo Federation GraphQL schemas

// Base Types
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Estimate Types
export interface Estimate {
  id: string;
  customerId: string;
  projectId?: string;
  
  // Pricing tiers
  goodPrice: number;
  betterPrice: number;
  bestPrice: number;
  selectedTier: PricingTier;
  
  // Metadata
  status: EstimateStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Calculations
  totalSquareFootage: number;
  laborHours: number;
  materialCost: number;
  
  // Documents
  pdfUrl?: string;
  notes?: string;
}

export interface EstimateConnection {
  edges: EstimateEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface EstimateEdge {
  node: Estimate;
  cursor: string;
}

export interface PricingCalculation {
  laborCost: number;
  materialCost: number;
  overheadCost: number;
  profitMargin: number;
  subtotal: number;
  tax: number;
  total: number;
}

// Project Types
export interface Project {
  id: string;
  customerId: string;
  companyCamId?: string;
  
  // Basic Information
  name: string;
  description?: string;
  type: ProjectType;
  priority: ProjectPriority;
  
  // Timeline & Scheduling
  status: ProjectStatus;
  scheduledStartDate?: string;
  actualStartDate?: string;
  scheduledEndDate?: string;
  actualEndDate?: string;
  estimatedDuration?: number; // in days
  
  // Location
  serviceAddress: Address;
  jobSite?: JobSite;
  
  // Team & Resources
  assignedCrew: CrewMember[];
  projectManager?: ProjectManager;
  
  // Financial
  budgetAmount?: number;
  actualCost?: number;
  profitMargin?: number;
  
  // Company Cam Integration
  photos: ProjectPhoto[];
  photoCount: number;
  lastPhotoSync?: string;
  
  // Weather & Conditions
  weatherRestrictions: WeatherRestriction[];
  optimalConditions?: WeatherConditions;
  
  // Documentation
  notes?: string;
  specifications?: any; // JSON
  permits: Permit[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  // Computed Fields
  daysUntilDeadline?: number;
  completionPercentage: number;
  isOverdue: boolean;
  weatherRisk: WeatherRisk;
}

export interface ProjectPhoto {
  id: string;
  projectId: string;
  companyCamId?: string;
  
  // Photo Details
  url: string;
  thumbnailUrl?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType: string;
  
  // Metadata
  category: PhotoCategory;
  tags: string[];
  description?: string;
  capturedAt: string;
  uploadedAt: string;
  
  // Location
  coordinates?: Coordinates;
  location?: PhotoLocation;
  
  // Organization
  phase?: ProjectPhase;
  room?: string;
  surface?: string;
  
  // Company Cam Specific
  companyCamMetadata?: any; // JSON
  syncStatus: PhotoSyncStatus;
  
  // AI Analysis
  aiAnalysis?: PhotoAIAnalysis;
}

export interface PhotoLocation {
  address?: string;
  floor?: string;
  room?: string;
  coordinates?: Coordinates;
}

export interface PhotoAIAnalysis {
  detectedObjects: string[];
  surfaceType?: string;
  conditionAssessment?: string;
  qualityScore?: number;
  suggestedTags: string[];
  confidence: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  email?: string;
  phone?: string;
  skillLevel: SkillLevel;
  hourlyRate?: number;
  availableFrom?: string;
  availableUntil?: string;
}

export interface ProjectManager {
  id: string;
  name: string;
  email: string;
  phone?: string;
  territory?: string;
  experienceYears?: number;
}

export interface JobSite {
  id: string;
  name: string;
  address: Address;
  accessInstructions?: string;
  keyLocation?: string;
  emergencyContact?: ContactInfo;
  restrictions: string[];
  utilities?: UtilitiesInfo;
}

export interface UtilitiesInfo {
  electricalShutoff?: string;
  waterShutoff?: string;
  gasShutoff?: string;
  internetAccess?: boolean;
  parkingAvailable?: boolean;
}

export interface ContactInfo {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
}

export interface Permit {
  id: string;
  type: PermitType;
  number: string;
  issuer: string;
  issuedDate: string;
  expirationDate: string;
  status: PermitStatus;
  cost?: number;
  documentUrl?: string;
}

export interface WeatherRestriction {
  condition: WeatherCondition;
  threshold: number;
  unit: WeatherUnit;
  severity: RestrictionSeverity;
}

export interface WeatherConditions {
  minTemperature?: number;
  maxTemperature?: number;
  maxWindSpeed?: number;
  maxHumidity?: number;
  precipitationAllowed?: boolean;
}

// Customer Types (Extended from other subgraph)
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  // Additional fields would come from customer subgraph
}

// Input Types
export interface CreateEstimateInput {
  customerId: string;
  projectId?: string;
  notes?: string;
}

export interface UpdateEstimateInput {
  selectedTier?: PricingTier;
  status?: EstimateStatus;
  notes?: string;
}

export interface CreateProjectInput {
  customerId: string;
  name: string;
  description?: string;
  type: ProjectType;
  priority: ProjectPriority;
  serviceAddress: AddressInput;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  estimatedDuration?: number;
  budgetAmount?: number;
  companyCamId?: string;
  notes?: string;
  specifications?: any;
}

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface PhotoUploadInput {
  category: PhotoCategory;
  description?: string;
  tags?: string[];
  phase?: ProjectPhase;
  room?: string;
  surface?: string;
  coordinates?: CoordinatesInput;
}

export interface CoordinatesInput {
  latitude: number;
  longitude: number;
}

// Enums
export enum EstimateStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum PricingTier {
  GOOD = 'GOOD',
  BETTER = 'BETTER',
  BEST = 'BEST',
}

export enum MaterialType {
  ECONOMY = 'ECONOMY',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  LUXURY = 'LUXURY',
}

export enum ComplexityLevel {
  SIMPLE = 'SIMPLE',
  MODERATE = 'MODERATE',
  COMPLEX = 'COMPLEX',
  HIGHLY_COMPLEX = 'HIGHLY_COMPLEX',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectType {
  INTERIOR_PAINTING = 'INTERIOR_PAINTING',
  EXTERIOR_PAINTING = 'EXTERIOR_PAINTING',
  CABINET_REFINISHING = 'CABINET_REFINISHING',
  DECK_STAINING = 'DECK_STAINING',
  PRESSURE_WASHING = 'PRESSURE_WASHING',
  DRYWALL_REPAIR = 'DRYWALL_REPAIR',
  WALLPAPER_REMOVAL = 'WALLPAPER_REMOVAL',
  TOUCH_UP = 'TOUCH_UP',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ProjectPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum ProjectPhase {
  PREPARATION = 'PREPARATION',
  PRIMER = 'PRIMER',
  BASE_COAT = 'BASE_COAT',
  FINAL_COAT = 'FINAL_COAT',
  TOUCH_UP = 'TOUCH_UP',
  CLEANUP = 'CLEANUP',
  COMPLETION = 'COMPLETION',
}

export enum PhotoCategory {
  BEFORE = 'BEFORE',
  PROGRESS = 'PROGRESS',
  AFTER = 'AFTER',
  DAMAGE = 'DAMAGE',
  PREPARATION = 'PREPARATION',
  MATERIALS = 'MATERIALS',
  TEAM = 'TEAM',
  SITE_CONDITIONS = 'SITE_CONDITIONS',
  QUALITY_CONTROL = 'QUALITY_CONTROL',
}

export enum PhotoSyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum CrewRole {
  LEAD_PAINTER = 'LEAD_PAINTER',
  PAINTER = 'PAINTER',
  PREP_WORKER = 'PREP_WORKER',
  HELPER = 'HELPER',
  SUPERVISOR = 'SUPERVISOR',
  SPECIALIST = 'SPECIALIST',
}

export enum SkillLevel {
  TRAINEE = 'TRAINEE',
  APPRENTICE = 'APPRENTICE',
  JOURNEYMAN = 'JOURNEYMAN',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER',
}

export enum PermitType {
  BUILDING = 'BUILDING',
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  SAFETY = 'SAFETY',
  PARKING = 'PARKING',
}

export enum PermitStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum WeatherCondition {
  TEMPERATURE = 'TEMPERATURE',
  HUMIDITY = 'HUMIDITY',
  WIND_SPEED = 'WIND_SPEED',
  PRECIPITATION = 'PRECIPITATION',
  UV_INDEX = 'UV_INDEX',
}

export enum WeatherUnit {
  FAHRENHEIT = 'FAHRENHEIT',
  CELSIUS = 'CELSIUS',
  PERCENTAGE = 'PERCENTAGE',
  MPH = 'MPH',
  KPH = 'KPH',
  INCHES = 'INCHES',
  MM = 'MM',
}

export enum RestrictionSeverity {
  ADVISORY = 'ADVISORY',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
}

export enum WeatherRisk {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  EXTREME = 'EXTREME',
}

// Company Cam WW Tag Types
export type WWTag = 'WW1' | 'WW2' | 'WW3' | 'WW4' | 'WW5' | 'WW6' | 'WW7' | 'WW8' | 'WW9' | 'WW10' |
                   'WW11' | 'WW12' | 'WW13' | 'WW14' | 'WW15' | 'WW16' | 'WW17' | 'WW18' | 'WW19' | 'WW20' |
                   'WW21' | 'WW22' | 'WW23' | 'WW24' | 'WW25' | 'WW26' | 'WW27' | 'WW28' | 'WW29' | 'WW30';

export interface WWTagMapping {
  tag: WWTag;
  surface: string;
  description: string;
  elevation?: string;
  room?: string;
}