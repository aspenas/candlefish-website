/**
 * User model - Database operations for users
 */

import { db } from '../index';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user' | 'estimator';
  company?: string;
  phone?: string;
  avatar_url?: string;
  settings?: any;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export const UserModel = {
  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return db.findOne<User>('users', { id });
  },

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return db.findOne<User>('users', { email });
  },

  /**
   * Create a new user
   */
  async create(data: Partial<User>): Promise<User> {
    return db.insert<User>('users', {
      ...data,
      role: data.role || 'user',
      created_at: new Date(),
      updated_at: new Date(),
    });
  },

  /**
   * Update a user
   */
  async update(id: string, data: Partial<User>): Promise<User | null> {
    const results = await db.update<User>('users', { id }, data);
    return results[0] || null;
  },

  /**
   * Update last login
   */
  async updateLastLogin(id: string): Promise<void> {
    await db.update('users', { id }, { last_login: new Date() });
  },

  /**
   * Delete a user
   */
  async delete(id: string): Promise<boolean> {
    const count = await db.delete('users', { id });
    return count > 0;
  },

  /**
   * List all users
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<User[]> {
    return db.findMany<User>('users', {}, {
      orderBy: 'created_at DESC',
      limit: options.limit,
      offset: options.offset,
    });
  },

  /**
   * Count users
   */
  async count(role?: string): Promise<number> {
    const conditions = role ? { role } : {};
    return db.count('users', conditions);
  },
};
