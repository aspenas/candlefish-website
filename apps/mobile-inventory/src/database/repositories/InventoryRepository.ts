import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase, InventoryItem, generateId, getCurrentTimestamp } from '../schema';

export class InventoryRepository {
  private db: SQLiteDatabase;

  constructor() {
    this.db = getDatabase();
  }

  async create(item: Omit<InventoryItem, 'id' | 'dateAdded' | 'lastUpdated' | 'version'>): Promise<InventoryItem> {
    const newItem: InventoryItem = {
      ...item,
      id: generateId(),
      dateAdded: getCurrentTimestamp(),
      lastUpdated: getCurrentTimestamp(),
      version: 1,
      syncStatus: 'pending',
    };

    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO inventory_items (
              id, name, description, barcode, sku, category, quantity, min_quantity,
              max_quantity, unit_price, total_value, location, supplier, date_added,
              last_updated, image_uri, tags, is_active, sync_status, version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newItem.id,
              newItem.name,
              newItem.description || null,
              newItem.barcode || null,
              newItem.sku,
              newItem.category,
              newItem.quantity,
              newItem.minQuantity,
              newItem.maxQuantity || null,
              newItem.unitPrice,
              newItem.totalValue,
              newItem.location,
              newItem.supplier || null,
              newItem.dateAdded,
              newItem.lastUpdated,
              newItem.imageUri || null,
              newItem.tags,
              newItem.isActive ? 1 : 0,
              newItem.syncStatus,
              newItem.version,
            ],
            (_, result) => {
              resolve(newItem);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findById(id: string): Promise<InventoryItem | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM inventory_items WHERE id = ? AND is_active = 1',
            [id],
            (_, { rows }) => {
              if (rows.length > 0) {
                resolve(this.mapRowToItem(rows.item(0)));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findByBarcode(barcode: string): Promise<InventoryItem | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM inventory_items WHERE barcode = ? AND is_active = 1',
            [barcode],
            (_, { rows }) => {
              if (rows.length > 0) {
                resolve(this.mapRowToItem(rows.item(0)));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findBySku(sku: string): Promise<InventoryItem | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM inventory_items WHERE sku = ? AND is_active = 1',
            [sku],
            (_, { rows }) => {
              if (rows.length > 0) {
                resolve(this.mapRowToItem(rows.item(0)));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findAll(
    offset: number = 0,
    limit: number = 50,
    category?: string,
    searchQuery?: string
  ): Promise<InventoryItem[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM inventory_items WHERE is_active = 1';
      const params: any[] = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (searchQuery) {
        query += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)';
        const searchParam = `%${searchQuery}%`;
        params.push(searchParam, searchParam, searchParam);
      }

      query += ' ORDER BY last_updated DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      this.db.transaction(
        (tx) => {
          tx.executeSql(
            query,
            params,
            (_, { rows }) => {
              const items: InventoryItem[] = [];
              for (let i = 0; i < rows.length; i++) {
                items.push(this.mapRowToItem(rows.item(i)));
              }
              resolve(items);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findLowStock(): Promise<InventoryItem[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM inventory_items WHERE is_active = 1 AND quantity <= min_quantity ORDER BY quantity ASC',
            [],
            (_, { rows }) => {
              const items: InventoryItem[] = [];
              for (let i = 0; i < rows.length; i++) {
                items.push(this.mapRowToItem(rows.item(i)));
              }
              resolve(items);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async getCategories(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT DISTINCT category FROM inventory_items WHERE is_active = 1 ORDER BY category',
            [],
            (_, { rows }) => {
              const categories: string[] = [];
              for (let i = 0; i < rows.length; i++) {
                categories.push(rows.item(i).category);
              }
              resolve(categories);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async update(id: string, updates: Partial<Omit<InventoryItem, 'id' | 'dateAdded' | 'version'>>): Promise<InventoryItem> {
    return new Promise((resolve, reject) => {
      // First get the current item
      this.findById(id).then((currentItem) => {
        if (!currentItem) {
          reject(new Error('Item not found'));
          return;
        }

        const updatedItem: InventoryItem = {
          ...currentItem,
          ...updates,
          lastUpdated: getCurrentTimestamp(),
          version: currentItem.version + 1,
          syncStatus: 'pending',
        };

        this.db.transaction(
          (tx) => {
            tx.executeSql(
              `UPDATE inventory_items SET
                name = ?, description = ?, barcode = ?, sku = ?, category = ?,
                quantity = ?, min_quantity = ?, max_quantity = ?, unit_price = ?,
                total_value = ?, location = ?, supplier = ?, last_updated = ?,
                image_uri = ?, tags = ?, is_active = ?, sync_status = ?, version = ?
              WHERE id = ?`,
              [
                updatedItem.name,
                updatedItem.description || null,
                updatedItem.barcode || null,
                updatedItem.sku,
                updatedItem.category,
                updatedItem.quantity,
                updatedItem.minQuantity,
                updatedItem.maxQuantity || null,
                updatedItem.unitPrice,
                updatedItem.totalValue,
                updatedItem.location,
                updatedItem.supplier || null,
                updatedItem.lastUpdated,
                updatedItem.imageUri || null,
                updatedItem.tags,
                updatedItem.isActive ? 1 : 0,
                updatedItem.syncStatus,
                updatedItem.version,
                id,
              ],
              (_, result) => {
                if (result.rowsAffected > 0) {
                  resolve(updatedItem);
                } else {
                  reject(new Error('Update failed'));
                }
              },
              (_, error) => {
                reject(error);
                return false;
              }
            );
          },
          reject
        );
      }).catch(reject);
    });
  }

  async updateQuantity(id: string, quantity: number): Promise<InventoryItem> {
    return new Promise((resolve, reject) => {
      this.findById(id).then((currentItem) => {
        if (!currentItem) {
          reject(new Error('Item not found'));
          return;
        }

        const totalValue = quantity * currentItem.unitPrice;

        this.update(id, {
          quantity,
          totalValue,
        }).then(resolve).catch(reject);
      }).catch(reject);
    });
  }

  async delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'UPDATE inventory_items SET is_active = 0, sync_status = ?, last_updated = ?, version = version + 1 WHERE id = ?',
            ['pending', getCurrentTimestamp(), id],
            (_, result) => {
              resolve(result.rowsAffected > 0);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async getTotalValue(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT SUM(total_value) as total FROM inventory_items WHERE is_active = 1',
            [],
            (_, { rows }) => {
              resolve(rows.item(0).total || 0);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async getCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT COUNT(*) as count FROM inventory_items WHERE is_active = 1',
            [],
            (_, { rows }) => {
              resolve(rows.item(0).count);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async findPendingSync(): Promise<InventoryItem[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM inventory_items WHERE sync_status = ? ORDER BY last_updated ASC',
            ['pending'],
            (_, { rows }) => {
              const items: InventoryItem[] = [];
              for (let i = 0; i < rows.length; i++) {
                items.push(this.mapRowToItem(rows.item(i)));
              }
              resolve(items);
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  async markAsSynced(id: string, remoteId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'UPDATE inventory_items SET sync_status = ?, last_sync_at = ?, remote_id = ? WHERE id = ?',
            ['synced', getCurrentTimestamp(), remoteId || null, id],
            (_, result) => {
              resolve();
            },
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        reject
      );
    });
  }

  private mapRowToItem(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      barcode: row.barcode,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      minQuantity: row.min_quantity,
      maxQuantity: row.max_quantity,
      unitPrice: row.unit_price,
      totalValue: row.total_value,
      location: row.location,
      supplier: row.supplier,
      dateAdded: row.date_added,
      lastUpdated: row.last_updated,
      imageUri: row.image_uri,
      tags: row.tags,
      isActive: Boolean(row.is_active),
      syncStatus: row.sync_status,
      lastSyncAt: row.last_sync_at,
      remoteId: row.remote_id,
      version: row.version,
    };
  }
}

export const inventoryRepository = new InventoryRepository();
