/**
 * Estimate model - Database operations for estimates
 */

import { db } from '../index';

export interface Estimate {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  property_address: string;
  estimate_data: any;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: Date;
  updated_at: Date;
  user_id?: string;
  project_id?: string;
}

export const EstimateModel = {
  /**
   * Find an estimate by ID
   */
  async findById(id: string): Promise<Estimate | null> {
    return db.findOne<Estimate>('estimates', { id });
  },

  /**
   * Find estimates by user ID
   */
  async findByUserId(userId: string): Promise<Estimate[]> {
    return db.findMany<Estimate>('estimates', { user_id: userId }, { orderBy: 'created_at DESC' });
  },

  /**
   * Create a new estimate
   */
  async create(data: Partial<Estimate>): Promise<Estimate> {
    return db.insert<Estimate>('estimates', {
      ...data,
      status: data.status || 'draft',
      created_at: new Date(),
      updated_at: new Date(),
    });
  },

  /**
   * Update an estimate
   */
  async update(id: string, data: Partial<Estimate>): Promise<Estimate | null> {
    const results = await db.update<Estimate>('estimates', { id }, data);
    return results[0] || null;
  },

  /**
   * Delete an estimate
   */
  async delete(id: string): Promise<boolean> {
    const count = await db.delete('estimates', { id });
    return count > 0;
  },

  /**
   * Search estimates
   */
  async search(query: string, userId?: string): Promise<Estimate[]> {
    let sql = `
      SELECT * FROM estimates
      WHERE (
        client_name ILIKE $1 OR
        client_email ILIKE $1 OR
        property_address ILIKE $1
      )
    `;
    const params: any[] = [`%${query}%`];

    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }

    sql += ' ORDER BY created_at DESC';

    return db.raw<Estimate>(sql, params);
  },
};
