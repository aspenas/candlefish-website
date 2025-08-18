// Generated GraphQL types for Paintbox Federation

export interface Maybe<T> {
  value?: T;
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

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PROSPECT = 'PROSPECT',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export enum IntegrationType {
  SALESFORCE = 'SALESFORCE',
  COMPANY_CAM = 'COMPANY_CAM',
  QUICKBOOKS = 'QUICKBOOKS',
  STRIPE = 'STRIPE',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE',
}

// Core Types
export interface Estimate {
  id: string;
  customerId: string;
  projectId?: string;
  goodPrice: number;
  betterPrice: number;
  bestPrice: number;
  selectedTier: PricingTier;
  status: EstimateStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  totalSquareFootage: number;
  laborHours: number;
  materialCost: number;
  pdfUrl?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  salesforceId?: string;
  lastSync?: string;
  totalProjects: number;
  totalRevenue: number;
  notes?: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: string;
  updatedAt: string;
  companyCamId?: string;
  photos: ProjectPhoto[];
  timeline: ProjectTimelineEvent[];
  address?: Address;
  totalValue: number;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  status: HealthStatus;
  lastHealthCheck: string;
  config: IntegrationConfig;
  metrics: IntegrationMetrics;
  errorMessage?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface ProjectPhoto {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  takenAt: string;
  companyCamId?: string;
  metadata: PhotoMetadata;
}

export interface ProjectTimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface PhotoMetadata {
  fileName: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  cameraInfo?: {
    make: string;
    model: string;
  };
}

export interface IntegrationConfig {
  endpoint?: string;
  apiKey?: string;
  syncInterval: number;
  retryAttempts: number;
  timeout: number;
  customSettings: Record<string, unknown>;
}

export interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestAt?: string;
  uptime: number;
}

// Connection types for pagination
export interface EstimateConnection {
  edges: EstimateEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface EstimateEdge {
  node: Estimate;
  cursor: string;
}

export interface CustomerConnection {
  edges: CustomerEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CustomerEdge {
  node: Customer;
  cursor: string;
}

export interface ProjectConnection {
  edges: ProjectEdge[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface ProjectEdge {
  node: Project;
  cursor: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

// Calculation types
export interface PricingCalculation {
  laborCost: number;
  materialCost: number;
  overheadCost: number;
  profitMargin: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface PDFResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface CalculationProgress {
  estimateId: string;
  stage: string;
  progress: number;
  message?: string;
  completed: boolean;
}

// Input types
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

export interface EstimateFilter {
  customerId?: string;
  projectId?: string;
  status?: EstimateStatus;
  createdAfter?: string;
  createdBefore?: string;
}

export interface PricingInput {
  squareFootage: number;
  laborHours: number;
  materialType: MaterialType;
  complexity: ComplexityLevel;
}

export interface CustomerFilter {
  status?: CustomerStatus;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ProjectFilter {
  customerId?: string;
  status?: ProjectStatus;
  startDateAfter?: string;
  startDateBefore?: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: AddressInput;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: AddressInput;
  status?: CustomerStatus;
  notes?: string;
}

export interface CreateProjectInput {
  customerId: string;
  name: string;
  description?: string;
  startDate?: string;
  estimatedDuration?: number;
  address?: AddressInput;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  estimatedDuration?: number;
}

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

// Subscription types
export interface EstimateUpdatedSubscription {
  estimateUpdated: Estimate;
}

export interface CalculationProgressSubscription {
  calculationProgress: CalculationProgress;
}

export interface CustomerUpdatedSubscription {
  customerUpdated: Customer;
}

export interface ProjectProgressSubscription {
  projectProgress: ProjectTimelineEvent;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  loading: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// UI State types
export interface LoadingState {
  estimates: boolean;
  customers: boolean;
  projects: boolean;
  integrations: boolean;
  calculations: boolean;
}

export interface ErrorState {
  estimates?: string;
  customers?: string;
  projects?: string;
  integrations?: string;
  calculations?: string;
}

// Form types
export interface EstimateFormData {
  customerId: string;
  projectId?: string;
  notes?: string;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: AddressInput;
  notes?: string;
}

export interface ProjectFormData {
  customerId: string;
  name: string;
  description?: string;
  startDate?: string;
  estimatedDuration?: number;
  address?: AddressInput;
}

export interface PricingFormData {
  squareFootage: number;
  laborHours: number;
  materialType: MaterialType;
  complexity: ComplexityLevel;
}
