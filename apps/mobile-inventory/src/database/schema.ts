import * as SQLite from 'expo-sqlite';

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
  tags: string; // JSON array as string
  isActive: boolean;
  // Sync fields
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAt?: string;
  remoteId?: string;
  version: number;
}

export interface OfflineMutation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  data: string; // JSON data
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  errorMessage?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  operation: string;
  status: 'success' | 'error';
  details?: string;
  recordsProcessed: number;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  biometricEnabled: boolean;
  lastActivity: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

const DATABASE_NAME = 'inventory.db';
const DATABASE_VERSION = 1;

// SQLite database instance
let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabase(DATABASE_NAME);
  }
  return db;
};

export const initDatabase = async (): Promise<void> => {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.transaction(
      (tx) => {
        // Create inventory_items table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            barcode TEXT,
            sku TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_quantity INTEGER NOT NULL DEFAULT 0,
            max_quantity INTEGER,
            unit_price REAL NOT NULL DEFAULT 0,
            total_value REAL NOT NULL DEFAULT 0,
            location TEXT NOT NULL,
            supplier TEXT,
            date_added TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            image_uri TEXT,
            tags TEXT, -- JSON array
            is_active BOOLEAN NOT NULL DEFAULT 1,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            last_sync_at TEXT,
            remote_id TEXT,
            version INTEGER NOT NULL DEFAULT 1
          );
        `);

        // Create offline_mutations table for sync queue
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS offline_mutations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            table_name TEXT NOT NULL,
            data TEXT NOT NULL, -- JSON
            timestamp TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            error_message TEXT
          );
        `);

        // Create sync_logs table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            details TEXT,
            records_processed INTEGER NOT NULL DEFAULT 0
          );
        `);

        // Create user_sessions table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            biometric_enabled BOOLEAN NOT NULL DEFAULT 0,
            last_activity TEXT NOT NULL
          );
        `);

        // Create app_settings table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

        // Create indexes for better query performance
        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_inventory_sync_status ON inventory_items(sync_status);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_mutations_status ON offline_mutations(status);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_mutations_timestamp ON offline_mutations(timestamp);
        `);
      },
      (error) => {
        console.error('Database initialization failed:', error);
        reject(error);
      },
      () => {
        console.log('Database initialized successfully');
        resolve();
      }
    );
  });
};

export const dropTables = async (): Promise<void> => {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.transaction(
      (tx) => {
        tx.executeSql('DROP TABLE IF EXISTS inventory_items;');
        tx.executeSql('DROP TABLE IF EXISTS offline_mutations;');
        tx.executeSql('DROP TABLE IF EXISTS sync_logs;');
        tx.executeSql('DROP TABLE IF EXISTS user_sessions;');
        tx.executeSql('DROP TABLE IF EXISTS app_settings;');
      },
      reject,
      resolve
    );
  });
};

// Helper function to generate UUID
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to get current timestamp
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};
