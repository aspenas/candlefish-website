// Base types from web frontend with mobile-specific additions
export type Category =
  | 'Furniture'
  | 'Art / Decor'
  | 'Electronics'
  | 'Lighting'
  | 'Rug / Carpet'
  | 'Plant (Indoor)'
  | 'Planter (Indoor)'
  | 'Outdoor Planter/Plant'
  | 'Planter Accessory'
  | 'Other';

export type DecisionStatus = 'Keep' | 'Sell' | 'Unsure' | 'Sold' | 'Donated';
export type FloorLevel = 'Lower Level' | 'Main Floor' | 'Upper Floor' | 'Outdoor' | 'Garage';

// Valuation System Types
export type ValuationType = 'ai_estimated' | 'market_analysis' | 'professional_appraisal' | 'user_override';
export type MarketDataSource = 'ebay' | 'auction_houses' | 'retail' | 'insurance' | 'estate_sales';
export type AppraisalStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PriceAlertType = 'above_threshold' | 'below_threshold' | 'significant_change' | 'market_opportunity';

export interface Room {
  id: string;
  name: string;
  floor: FloorLevel;
  square_footage?: number;
  description?: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
  total_value?: number;
}

export interface Item {
  id: string;
  room_id: string;
  name: string;
  description?: string;
  category: Category;
  decision: DecisionStatus;
  purchase_price?: number;
  invoice_ref?: string;
  designer_invoice_price?: number;
  asking_price?: number;
  sold_price?: number;
  quantity: number;
  is_fixture: boolean;
  source?: string;
  placement_notes?: string;
  condition?: string;
  purchase_date?: string;
  created_at: string;
  updated_at: string;
  room?: Room;
  images?: Image[];
  plant?: Plant;
  valuations?: Valuation[];
}

export interface Image {
  id: string;
  item_id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  is_primary: boolean;
  uploaded_at: string;
}

export interface Plant {
  id: string;
  item_id: string;
  plant_type?: string;
  planter_type?: string;
  indoor_outdoor?: string;
  care_instructions?: string;
  last_maintenance?: string;
  next_maintenance?: string;
}

export interface Valuation {
  id: string;
  item_id: string;
  valuation_type: ValuationType;
  estimated_value: number;
  confidence_score: number;
  low_estimate?: number;
  high_estimate?: number;
  currency: string;
  effective_date: string;
  expires_at?: string;
  data_sources: MarketDataSource[];
  methodology_notes?: string;
  appraiser_id?: string;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface MarketComparison {
  id: string;
  valuation_id: string;
  source: MarketDataSource;
  comparable_item_title: string;
  comparable_item_description?: string;
  sale_price: number;
  sale_date: string;
  similarity_score: number;
  condition_adjustment: number;
  market_adjustment: number;
  source_url?: string;
  source_reference?: string;
  images?: string[];
  created_at: string;
}

export interface PriceHistory {
  id: string;
  item_id: string;
  valuation_type: ValuationType;
  price: number;
  effective_date: string;
  confidence_score?: number;
  market_conditions?: string;
  notes?: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  item_id: string;
  alert_type: PriceAlertType;
  threshold_value?: number;
  percentage_change?: number;
  is_active: boolean;
  last_triggered?: string;
  notification_method: 'email' | 'sms' | 'push' | 'in_app';
  created_at: string;
  updated_at: string;
  item?: Item;
}

// Mobile-Specific Types
export interface MobileSession {
  id: string;
  userId?: string;
  deviceId: string;
  lastSync: Date;
  offlineQueueCount: number;
  cacheSize: number;
}

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'item' | 'valuation' | 'image' | 'room';
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  error?: string;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt?: Date;
}

// Camera and Scanner Types
export interface CapturedImage {
  id: string;
  uri: string;
  base64?: string;
  width: number;
  height: number;
  fileSize: number;
  timestamp: Date;
  processed: boolean;
  uploaded: boolean;
}

export interface ScanResult {
  type: 'QR' | 'BARCODE' | 'UPC' | 'EAN';
  data: string;
  timestamp: Date;
  confidence: number;
}

export interface AIValuationRequest {
  imageUri: string;
  description?: string;
  category?: Category;
  condition?: string;
  additionalContext?: string;
}

export interface AIValuationResponse {
  estimated_value: number;
  confidence_score: number;
  category: Category;
  condition: string;
  description: string;
  comparisons: {
    title: string;
    price: number;
    source: string;
    similarity: number;
  }[];
  reasoning: string;
}

// Performance and Security Types
export interface PerformanceMetrics {
  id: string;
  screen: string;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  batteryLevel: number;
  networkLatency?: number;
  timestamp: Date;
}

export interface SecurityEvent {
  id: string;
  type: 'LOGIN' | 'LOGOUT' | 'BIOMETRIC_AUTH' | 'LOCATION_THREAT' | 'DATA_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

// Push Notification Types
export interface PushNotification {
  id: string;
  type: 'PRICE_ALERT' | 'VALUATION_UPDATE' | 'MARKET_OPPORTUNITY' | 'SYNC_COMPLETE';
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  delivered: boolean;
  opened: boolean;
  timestamp: Date;
}

// Settings and Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    priceAlerts: boolean;
    valuationUpdates: boolean;
    marketOpportunities: boolean;
    syncStatus: boolean;
  };
  camera: {
    quality: 'low' | 'medium' | 'high';
    autoFocus: boolean;
    flashAuto: boolean;
    saveToGallery: boolean;
  };
  security: {
    biometricAuth: boolean;
    autoLockTimeout: number; // minutes
    requireAuthForSensitiveData: boolean;
  };
  sync: {
    wifiOnly: boolean;
    backgroundSync: boolean;
    syncFrequency: number; // minutes
  };
}

// Location and Threat Detection
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface ThreatAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendations: string[];
  location: LocationData;
  timestamp: Date;
}

// Request/Response Types
export interface ValuationRequest {
  item_id: string;
  valuation_type: ValuationType;
  force_refresh?: boolean;
  include_comparisons?: boolean;
}

export interface PriceAlertRequest {
  item_id: string;
  alert_type: PriceAlertType;
  threshold_value?: number;
  percentage_change?: number;
  notification_method: 'email' | 'sms' | 'push' | 'in_app';
}

export interface FilterRequest {
  rooms: string[];
  categories: Category[];
  decisions: DecisionStatus[];
  minPrice?: number;
  maxPrice?: number;
  isFixture?: boolean;
  source?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface SearchRequest {
  query: string;
  rooms: string[];
  categories: Category[];
  page: number;
  limit: number;
}

// Theme Types
export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}