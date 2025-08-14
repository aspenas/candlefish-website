/**
 * Database service - Main entry point for database operations
 */

import {
  query,
  transaction,
  checkHealth,
  getPoolStats,
  closePool,
  PoolClient,
} from './connection-pool';

// Re-export connection pool functions
export {
  query,
  transaction,
  checkHealth,
  getPoolStats,
  closePool,
};

// Export db first before using it in models
export const db = {
  /**
   * Find one record
   */
  async findOne<T = any>(
    table: string,
    conditions: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

    const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
    const result = await query<T>(sql, values);

    return result.rows[0] || null;
  },

  /**
   * Find multiple records
   */
  async findMany<T = any>(
    table: string,
    conditions: Record<string, any> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
    } = {}
  ): Promise<T[]> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.length > 0
      ? 'WHERE ' + keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
      : '';

    let sql = `SELECT * FROM ${table} ${whereClause}`;

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const result = await query<T>(sql, values);
    return result.rows;
  },

  /**
   * Insert a record
   */
  async insert<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query<T>(sql, values);
    return result.rows[0];
  },

  /**
   * Update records
   */
  async update<T = any>(
    table: string,
    conditions: Record<string, any>,
    data: Record<string, any>
  ): Promise<T[]> {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const conditionKeys = Object.keys(conditions);
    const conditionValues = Object.values(conditions);

    const setClause = dataKeys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const whereClause = conditionKeys
      .map((key, i) => `${key} = $${dataKeys.length + i + 1}`)
      .join(' AND ');

    const sql = `
      UPDATE ${table}
      SET ${setClause}, updated_at = NOW()
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await query<T>(sql, [...dataValues, ...conditionValues]);
    return result.rows;
  },

  /**
   * Delete records
   */
  async delete(
    table: string,
    conditions: Record<string, any>
  ): Promise<number> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await query(sql, values);

    return result.rowCount;
  },

  /**
   * Count records
   */
  async count(
    table: string,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.length > 0
      ? 'WHERE ' + keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
      : '';

    const sql = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const result = await query<{ count: string }>(sql, values);

    return parseInt(result.rows[0].count);
  },

  /**
   * Execute raw SQL
   */
  async raw<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await query<T>(sql, params);
    return result.rows;
  },
};

// Note: Model services are available in their respective files
// Import them directly when needed:
// import { EstimateModel } from '@/lib/database/models/estimate';
// import { UserModel } from '@/lib/database/models/user';
// import { ProjectModel } from '@/lib/database/models/project';
