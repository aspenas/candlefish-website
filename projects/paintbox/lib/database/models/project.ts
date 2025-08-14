/**
 * Project model - Database operations for projects
 */

import { db } from '../index';

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_id?: string;
  user_id: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date?: Date;
  end_date?: Date;
  budget?: number;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export const ProjectModel = {
  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<Project | null> {
    return db.findOne<Project>('projects', { id });
  },

  /**
   * Find projects by user ID
   */
  async findByUserId(userId: string): Promise<Project[]> {
    return db.findMany<Project>('projects', { user_id: userId }, { orderBy: 'created_at DESC' });
  },

  /**
   * Find projects by client ID
   */
  async findByClientId(clientId: string): Promise<Project[]> {
    return db.findMany<Project>('projects', { client_id: clientId }, { orderBy: 'created_at DESC' });
  },

  /**
   * Create a new project
   */
  async create(data: Partial<Project>): Promise<Project> {
    return db.insert<Project>('projects', {
      ...data,
      status: data.status || 'planning',
      created_at: new Date(),
      updated_at: new Date(),
    });
  },

  /**
   * Update a project
   */
  async update(id: string, data: Partial<Project>): Promise<Project | null> {
    const results = await db.update<Project>('projects', { id }, data);
    return results[0] || null;
  },

  /**
   * Delete a project
   */
  async delete(id: string): Promise<boolean> {
    const count = await db.delete('projects', { id });
    return count > 0;
  },

  /**
   * List active projects
   */
  async listActive(userId?: string): Promise<Project[]> {
    const conditions: any = { status: 'active' };
    if (userId) {
      conditions.user_id = userId;
    }
    return db.findMany<Project>('projects', conditions, { orderBy: 'start_date DESC' });
  },

  /**
   * Count projects by status
   */
  async countByStatus(status: string, userId?: string): Promise<number> {
    const conditions: any = { status };
    if (userId) {
      conditions.user_id = userId;
    }
    return db.count('projects', conditions);
  },

  /**
   * Get project statistics
   */
  async getStatistics(userId?: string): Promise<any> {
    let sql = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        SUM(budget) as total_budget
      FROM projects
    `;

    const params: any[] = [];
    if (userId) {
      sql += ' WHERE user_id = $1';
      params.push(userId);
    }

    const result = await db.raw<any>(sql, params);
    return result[0] || {};
  },
};
