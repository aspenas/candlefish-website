export interface Assessment {
  id: string;
  title: string;
  description?: string;
  status: AssessmentStatus;
  progress: number; // 0.0 to 1.0
  
  // Configuration
  assessmentType: string;
  industry: IndustryVertical;
  complexity: number; // 1-10 scale
  estimatedDuration: number; // minutes
  
  // Relationships
  operator: Operator;
  operatorId: string;
  documents: Document[];
  responses: AssessmentResponse[];
  reports: Report[];
  
  // Results
  score?: number;
  recommendations: Recommendation[];
  benchmarks: Benchmark[];
  nextSteps: ActionItem[];
  
  // Processing metadata
  processedTokens?: number;
  processingTime?: number; // seconds
  aiConfidenceScore?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  version: number;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  tier: OperatorTier;
  
  // Business information
  companyName?: string;
  industry?: IndustryVertical;
  employeeCount?: number;
  revenue?: number;
  
  // System access
  permissions: string[];
  quotas: OperatorQuotas;
  usage: OperatorUsage;
  
  // Relationships
  assessments: Assessment[];
  solutions: Solution[];
  reports: Report[];
  
  // Configuration
  preferences?: any;
  customizations?: any;
  integrations: Integration[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: DocumentType;
  
  // Processing status
  status: ProcessingStage;
  processingProgress: number; // 0.0 to 1.0
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingError?: string;
  
  // Content
  extractedText?: string;
  metadata?: any;
  annotations: Annotation[];
  
  // AI Analysis
  aiSummary?: string;
  keyInsights: string[];
  topics: string[];
  sentiment?: number; // -1.0 to 1.0
  
  // Relationships
  assessment: Assessment;
  assessmentId: string;
  
  // File management
  url?: string;
  thumbnailUrl?: string;
  localUri?: string; // For offline mobile storage
  
  createdAt: string;
  updatedAt: string;
}

// Enums
export enum AssessmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

export enum OperatorTier {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM'
}

export enum DocumentType {
  PDF = 'PDF',
  WORD = 'WORD',
  EXCEL = 'EXCEL',
  PRESENTATION = 'PRESENTATION',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  TEXT = 'TEXT'
}

export enum IndustryVertical {
  MANUFACTURING = 'MANUFACTURING',
  HEALTHCARE = 'HEALTHCARE',
  FINANCE = 'FINANCE',
  RETAIL = 'RETAIL',
  TECHNOLOGY = 'TECHNOLOGY',
  LOGISTICS = 'LOGISTICS',
  EDUCATION = 'EDUCATION',
  GOVERNMENT = 'GOVERNMENT',
  CONSTRUCTION = 'CONSTRUCTION',
  HOSPITALITY = 'HOSPITALITY'
}

export enum ProcessingStage {
  UPLOAD = 'UPLOAD',
  PARSING = 'PARSING',
  ANALYSIS = 'ANALYSIS',
  EXTRACTION = 'EXTRACTION',
  VALIDATION = 'VALIDATION',
  COMPLETION = 'COMPLETION'
}

// Supporting interfaces
export interface AssessmentResponse {
  questionId: string;
  response: any;
  confidence?: number;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: number; // 1-10
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  resources: string[];
}

export interface Benchmark {
  id: string;
  metric: string;
  value: number;
  percentile: number; // 0-100
  industryAverage: number;
  bestInClass: number;
  unit?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: number;
  dueDate?: string;
  assignee?: string;
  status: string;
  dependencies: string[];
}

export interface OperatorQuotas {
  maxAssessments: number;
  maxDocuments: number;
  maxTokensPerMonth: number;
  maxStorageGB: number;
  maxConcurrentProcessing: number;
}

export interface OperatorUsage {
  assessmentsUsed: number;
  documentsUsed: number;
  tokensUsed: number;
  storageUsedGB: number;
  currentProcessing: number;
  resetDate: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  configuration: any;
  status: string;
  lastSync?: string;
}

export interface Solution {
  id: string;
  name: string;
  description: string;
  category: string;
  industry?: IndustryVertical;
  features: string[];
  requirements: string[];
  pricing: SolutionPricing;
  deliverables: string[];
  timeline: number; // days
  complexity: number; // 1-10 scale
  successRate: number;
  averageImplementationTime?: number;
  clientSatisfaction?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SolutionPricing {
  basePrice: number;
  currency: string;
  billingCycle: string;
  customPricingAvailable: boolean;
}

export interface Report {
  id: string;
  title: string;
  format: string;
  summary: string;
  findings: Finding[];
  recommendations: Recommendation[];
  charts: Chart[];
  generatedAt: string;
  generatedBy: string;
  parameters: any;
  assessmentId: string;
  url?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Finding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  evidence: string[];
  recommendations: string[];
}

export interface Chart {
  id: string;
  type: string;
  title: string;
  data: any;
  config?: any;
}

export interface Annotation {
  id: string;
  type: string;
  content: string;
  position: any;
  confidence: number;
  createdAt: string;
}

// Mobile-specific types
export interface OfflineAssessment extends Omit<Assessment, 'id'> {
  tempId: string;
  synced: boolean;
  lastModified: string;
}

export interface OfflineDocument extends Omit<Document, 'id'> {
  tempId: string;
  localUri: string;
  synced: boolean;
  uploadQueued: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'assessment' | 'document' | 'response';
  action: 'create' | 'update' | 'delete';
  data: any;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
}

export interface CameraCapture {
  uri: string;
  type: 'image' | 'video';
  filename: string;
  size: number;
  width?: number;
  height?: number;
}

export interface NotificationPayload {
  assessmentId?: string;
  type: 'assessment_update' | 'processing_complete' | 'sync_error' | 'reminder';
  title: string;
  body: string;
  data?: any;
}