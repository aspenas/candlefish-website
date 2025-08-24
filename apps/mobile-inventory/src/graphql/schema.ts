import { gql } from '@apollo/client';

// Inventory Item Types
export const INVENTORY_ITEM_FRAGMENT = gql`
  fragment InventoryItemFragment on InventoryItem {
    id
    name
    description
    barcode
    sku
    category
    quantity
    minQuantity
    maxQuantity
    unitPrice
    totalValue
    location
    supplier
    dateAdded
    lastUpdated
    imageUri
    tags
    isActive
  }
`;

// Queries
export const GET_INVENTORY_ITEMS = gql`
  query GetInventoryItems($offset: Int, $limit: Int, $category: String, $searchQuery: String) {
    inventoryItems(offset: $offset, limit: $limit, category: $category, searchQuery: $searchQuery) {
      items {
        ...InventoryItemFragment
      }
      totalCount
      hasMore
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const GET_INVENTORY_ITEM = gql`
  query GetInventoryItem($id: ID!) {
    inventoryItem(id: $id) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const GET_INVENTORY_ITEM_BY_BARCODE = gql`
  query GetInventoryItemByBarcode($barcode: String!) {
    inventoryItemByBarcode(barcode: $barcode) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const GET_INVENTORY_CATEGORIES = gql`
  query GetInventoryCategories {
    inventoryCategories {
      category
      count
    }
  }
`;

export const GET_LOW_STOCK_ITEMS = gql`
  query GetLowStockItems {
    lowStockItems {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const GET_INVENTORY_STATS = gql`
  query GetInventoryStats {
    inventoryStats {
      totalItems
      totalValue
      lowStockCount
      categoriesCount
      lastUpdated
    }
  }
`;

// Mutations
export const CREATE_INVENTORY_ITEM = gql`
  mutation CreateInventoryItem($input: CreateInventoryItemInput!) {
    createInventoryItem(input: $input) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const UPDATE_INVENTORY_ITEM = gql`
  mutation UpdateInventoryItem($id: ID!, $input: UpdateInventoryItemInput!) {
    updateInventoryItem(id: $id, input: $input) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const DELETE_INVENTORY_ITEM = gql`
  mutation DeleteInventoryItem($id: ID!) {
    deleteInventoryItem(id: $id)
  }
`;

export const UPDATE_INVENTORY_QUANTITY = gql`
  mutation UpdateInventoryQuantity($id: ID!, $quantity: Int!, $operation: QuantityOperation!) {
    updateInventoryQuantity(id: $id, quantity: $quantity, operation: $operation) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const BULK_UPDATE_INVENTORY = gql`
  mutation BulkUpdateInventory($updates: [BulkUpdateInput!]!) {
    bulkUpdateInventory(updates: $updates) {
      success
      processed
      errors {
        itemId
        error
      }
      items {
        ...InventoryItemFragment
      }
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

// Subscriptions
export const INVENTORY_ITEM_UPDATED = gql`
  subscription InventoryItemUpdated($itemId: ID) {
    inventoryItemUpdated(itemId: $itemId) {
      ...InventoryItemFragment
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const LOW_STOCK_ALERT = gql`
  subscription LowStockAlert {
    lowStockAlert {
      item {
        ...InventoryItemFragment
      }
      threshold
      currentQuantity
      alertType
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const INVENTORY_SYNC_STATUS = gql`
  subscription InventorySyncStatus {
    inventorySyncStatus {
      status
      progress
      itemsProcessed
      totalItems
      errors {
        itemId
        error
      }
    }
  }
`;

// Input Types (TypeScript interfaces)
export interface CreateInventoryItemInput {
  name: string;
  description?: string;
  barcode?: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unitPrice: number;
  location: string;
  supplier?: string;
  imageUri?: string;
  tags?: string[];
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  unitPrice?: number;
  location?: string;
  supplier?: string;
  imageUri?: string;
  tags?: string[];
}

export interface BulkUpdateInput {
  id: string;
  updates: UpdateInventoryItemInput;
}

export type QuantityOperation = 'SET' | 'ADD' | 'SUBTRACT';

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  categoriesCount: number;
  lastUpdated: string;
}

export interface LowStockAlert {
  item: InventoryItem;
  threshold: number;
  currentQuantity: number;
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'REORDER_POINT';
}

export interface SyncStatus {
  status: 'IDLE' | 'SYNCING' | 'ERROR' | 'COMPLETED';
  progress: number;
  itemsProcessed: number;
  totalItems: number;
  errors?: Array<{
    itemId: string;
    error: string;
  }>;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  sku: string;
  category: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unitPrice: number;
  totalValue: number;
  location: string;
  supplier?: string;
  dateAdded: string;
  lastUpdated: string;
  imageUri?: string;
  tags: string[];
  isActive: boolean;
}
