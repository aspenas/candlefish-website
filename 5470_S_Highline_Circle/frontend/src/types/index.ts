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

export interface Transaction {
  id: string;
  item_id: string;
  transaction_type: 'purchase' | 'sale' | 'donation';
  amount: number;
  transaction_date: string;
  party_name?: string;
  notes?: string;
  created_at: string;
  item?: Item;
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
  page: number;
  limit: number;
}

export interface BulkUpdateRequest {
  itemIds: string[];
  decision?: DecisionStatus;
  askingPrice?: number;
}

// Photo Capture System Types
export interface PhotoSession {
  id: string;
  roomId: string;
  roomName: string;
  itemsTotal: number;
  itemsCaptured: number;
  currentItemIndex: number;
  startTime: Date;
  lastSaveTime: Date;
  status: 'active' | 'paused' | 'completed';
  photos: Map<string, CapturedPhoto[]>;
}

export interface CapturedPhoto {
  id: string;
  itemId: string;
  file: File;
  blob: Blob;
  dataUrl: string;
  thumbnail: string;
  angle: PhotoAngle;
  timestamp: Date;
  metadata: PhotoMetadata;
  uploaded: boolean;
  compressed: boolean;
}

export type PhotoAngle = 'main' | 'detail' | 'label' | 'damage' | 'angle2' | 'angle3';

export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  quality: number;
  compression: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export interface QRLabel {
  itemId: string;
  qrCode: string;
  itemName: string;
  room: string;
  category: Category;
  coordinates: { x: number; y: number };
}

export interface PhotoCaptureSettings {
  multipleAngles: boolean;
  autoAdvance: boolean;
  compressionQuality: number;
  maxResolution: number;
  requireConfirmation: boolean;
  saveToLocal: boolean;
  autoUpload: boolean;
}

// Collaboration Types
export type InterestLevel = 'high' | 'medium' | 'low' | 'none';
export type BundleStatus = 'draft' | 'proposed' | 'accepted' | 'rejected' | 'withdrawn';
export type UserRole = 'owner' | 'buyer';

export interface ItemNote {
  id: string;
  item_id: string;
  author: UserRole;
  note: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface BuyerInterest {
  id: string;
  item_id: string;
  interest_level: InterestLevel;
  max_price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface BundleProposal {
  id: string;
  name: string;
  proposed_by: UserRole;
  total_price?: number;
  status: BundleStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: Item[];
  item_count?: number;
}

export interface CollaborationOverview {
  summary: {
    total_items_for_sale: number;
    items_with_interest: number;
    high_interest: number;
    medium_interest: number;
    low_interest: number;
    active_bundles: number;
    total_notes: number;
  };
  recent_activity: CollaborationActivity[];
}

export interface CollaborationActivity {
  type: 'interest' | 'note' | 'bundle';
  item_name: string;
  level?: InterestLevel;
  author?: UserRole;
  created_at: string;
}

// Request types for collaboration
export interface NoteRequest {
  note: string;
  is_private: boolean;
}

export interface InterestRequest {
  interest_level: InterestLevel;
  max_price?: number;
  notes?: string;
}

export interface BundleRequest {
  name: string;
  item_ids: string[];
  total_price?: number;
  notes?: string;
}

export interface BundleUpdateRequest {
  status?: BundleStatus;
  total_price?: number;
  notes?: string;
}
