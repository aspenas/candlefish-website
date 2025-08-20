// Core API Types for Candlefish.ai

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client' | 'user';
  avatar?: string;
  company?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
}

// Content Management
export interface Page {
  id: string;
  slug: string;
  title: string;
  metaDescription?: string;
  content: ContentBlock[];
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  id: string;
  type: 'hero' | 'text' | 'image' | 'cta' | 'testimonial' | 'features' | 'stats';
  data: Record<string, any>;
  order: number;
}

// Lead Management
export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed' | 'lost';
  score?: number;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFormData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  message?: string;
  source: string;
  interests?: string[];
}

// Assessment System
export interface Assessment {
  id: string;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  categories: AssessmentCategory[];
  estimatedTime: number; // minutes
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'scale' | 'text';
  required: boolean;
  options?: AssessmentOption[];
  category: string;
  weight: number;
}

export interface AssessmentOption {
  id: string;
  text: string;
  value: number;
  description?: string;
}

export interface AssessmentCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  color: string;
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  userId?: string;
  email?: string;
  company?: string;
  answers: AssessmentAnswer[];
  score: number;
  categoryScores: Record<string, number>;
  recommendations: string[];
  completedAt: string;
  createdAt: string;
}

export interface AssessmentAnswer {
  questionId: string;
  value: any;
  text?: string;
}

export interface AssessmentResult {
  overall: {
    score: number;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    description: string;
  };
  categories: Array<{
    name: string;
    score: number;
    level: string;
    recommendations: string[];
  }>;
  nextSteps: string[];
  estimatedROI?: {
    timeframe: string;
    savings: number;
    efficiency: number;
  };
}

// Case Studies
export interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  client: string;
  industry: string;
  challenge: string;
  solution: string;
  results: CaseStudyResult[];
  technologies: string[];
  timeline: string;
  teamSize: number;
  featured: boolean;
  thumbnail: string;
  images: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseStudyResult {
  metric: string;
  before: string;
  after: string;
  improvement: string;
  description: string;
}

export interface CaseStudyFilters {
  industry?: string;
  technology?: string;
  resultType?: string;
  search?: string;
}

// Blog/Insights
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: BlogAuthor;
  categories: string[];
  tags: string[];
  featuredImage?: string;
  readTime: number; // minutes
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  title?: string;
}

export interface BlogFilters {
  category?: string;
  tag?: string;
  author?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Contact Forms
export interface ContactForm {
  id: string;
  name: string;
  fields: ContactFormField[];
  submitEndpoint: string;
  successMessage: string;
  emailNotifications: string[];
  active: boolean;
}

export interface ContactFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ContactSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  email?: string;
  status: 'new' | 'processed' | 'responded';
  createdAt: string;
}

// Analytics
export interface AnalyticsData {
  visitors: {
    total: number;
    unique: number;
    returning: number;
    trend: number;
  };
  pageViews: {
    total: number;
    trend: number;
    topPages: Array<{
      path: string;
      views: number;
    }>;
  };
  conversions: {
    leads: number;
    assessments: number;
    downloads: number;
    rate: number;
  };
  traffic: {
    sources: Array<{
      source: string;
      visitors: number;
      percentage: number;
    }>;
  };
}

// Newsletter
export interface Newsletter {
  id: string;
  email: string;
  preferences: {
    frequency: 'weekly' | 'monthly' | 'quarterly';
    topics: string[];
    format: 'html' | 'text';
  };
  status: 'active' | 'paused' | 'unsubscribed';
  source: string;
  subscribedAt: string;
  updatedAt: string;
}

export interface NewsletterPreferences {
  frequency: 'weekly' | 'monthly' | 'quarterly';
  topics: string[];
  format: 'html' | 'text';
}

// Proposals
export interface Proposal {
  id: string;
  title: string;
  clientId: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  sections: ProposalSection[];
  pricing: ProposalPricing;
  timeline: ProposalTimeline[];
  terms: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface ProposalPricing {
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
}

export interface ProposalTimeline {
  phase: string;
  duration: string;
  deliverables: string[];
  startDate?: string;
  endDate?: string;
}

// Client Portal
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  progress: number; // 0-100
  startDate: string;
  endDate?: string;
  team: ProjectMember[];
  milestones: Milestone[];
  documents: Document[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

// Common utility types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterState {
  [key: string]: string | string[] | undefined;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface SearchParams {
  query?: string;
  filters?: FilterState;
  sort?: SortOption;
  page?: number;
  limit?: number;
}