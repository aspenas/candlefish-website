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
