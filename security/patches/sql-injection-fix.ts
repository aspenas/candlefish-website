/**
 * SQL Injection Security Patch
 * Fixes SQL injection vulnerabilities by implementing parameterized queries
 * and input validation across the application
 */

import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';

/**
 * Secure database query wrapper with parameterized queries
 * Prevents SQL injection by using placeholders and parameter binding
 */
export class SecureDatabase {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Execute a SELECT query with parameterized inputs
   */
  async secureSelect(table: string, conditions: Record<string, any> = {}, orderBy?: string) {
    // Validate table name against whitelist
    const validTables = ['services', 'users', 'nanda_agents', 'agent_decisions', 'health_metrics'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Build parameterized query
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => {
          // Validate column names
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            throw new Error(`Invalid column name: ${key}`);
          }
          params.push(conditions[key]);
          return `${key} = ?`;
        })
        .join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    if (orderBy) {
      // Validate ORDER BY clause
      if (!/^[a-zA-Z_][a-zA-Z0-9_,\s]*$/.test(orderBy)) {
        throw new Error(`Invalid ORDER BY clause: ${orderBy}`);
      }
      query += ` ORDER BY ${orderBy}`;
    }

    return await this.db.all(query, params);
  }

  /**
   * Execute an UPDATE query with parameterized inputs
   */
  async secureUpdate(table: string, updates: Record<string, any>, conditions: Record<string, any>) {
    // Validate table name
    const validTables = ['services', 'users', 'nanda_agents', 'agent_decisions'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    const setParams: any[] = [];
    const whereParams: any[] = [];
    
    // Build SET clause
    const setClause = Object.keys(updates)
      .map(key => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
        setParams.push(updates[key]);
        return `${key} = ?`;
      })
      .join(', ');

    // Build WHERE clause
    const whereClause = Object.keys(conditions)
      .map(key => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
        whereParams.push(conditions[key]);
        return `${key} = ?`;
      })
      .join(' AND ');

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...setParams, ...whereParams];
    
    return await this.db.run(query, params);
  }

  /**
   * Execute an INSERT query with parameterized inputs
   */
  async secureInsert(table: string, data: Record<string, any>) {
    // Validate table name
    const validTables = ['services', 'users', 'nanda_agents', 'agent_decisions', 'health_metrics'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    const columns = Object.keys(data);
    const params = Object.values(data);
    
    // Validate column names
    columns.forEach(col => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
        throw new Error(`Invalid column name: ${col}`);
      }
    });

    const columnList = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`;
    
    return await this.db.run(query, params);
  }

  /**
   * Execute a DELETE query with parameterized inputs
   */
  async secureDelete(table: string, conditions: Record<string, any>) {
    // Validate table name
    const validTables = ['services', 'users', 'nanda_agents', 'agent_decisions', 'health_metrics'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    const params: any[] = [];
    const whereClause = Object.keys(conditions)
      .map(key => {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
        params.push(conditions[key]);
        return `${key} = ?`;
      })
      .join(' AND ');

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    return await this.db.run(query, params);
  }

  /**
   * Get the underlying database connection for complex queries
   * Use with caution and always use parameterized queries
   */
  getConnection() {
    return this.db;
  }
}

/**
 * Input validation and sanitization utilities
 */
export class InputValidator {
  /**
   * Validate and sanitize user ID
   */
  static validateUserId(id: any): number {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error('Invalid user ID');
    }
    return parsed;
  }

  /**
   * Validate and sanitize service ID
   */
  static validateServiceId(id: any): number {
    const parsed = parseInt(id, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error('Invalid service ID');
    }
    return parsed;
  }

  /**
   * Validate and sanitize string input
   */
  static validateString(input: any, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Remove any SQL special characters
    const sanitized = input
      .replace(/['";\\]/g, '')
      .trim()
      .substring(0, maxLength);
    
    if (sanitized.length === 0) {
      throw new Error('Input cannot be empty');
    }
    
    return sanitized;
  }

  /**
   * Validate email address
   */
  static validateEmail(email: any): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }
    return email.toLowerCase().trim();
  }

  /**
   * Validate status values
   */
  static validateStatus(status: any): string {
    const validStatuses = ['running', 'stopped', 'crashed', 'pending', 'unknown'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return status;
  }

  /**
   * Validate port number
   */
  static validatePort(port: any): number {
    const parsed = parseInt(port, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('Invalid port number');
    }
    return parsed;
  }

  /**
   * Validate URL
   */
  static validateUrl(url: any): string {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      return url;
    } catch {
      throw new Error('Invalid URL');
    }
  }

  /**
   * Sanitize output to prevent XSS
   */
  static sanitizeOutput(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => InputValidator.sanitizeOutput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = InputValidator.sanitizeOutput(data[key]);
      }
      return sanitized;
    }
    
    return data;
  }
}

/**
 * Rate limiting for database queries
 */
export class QueryRateLimiter {
  private queryCount: Map<string, number[]> = new Map();
  private readonly maxQueries: number;
  private readonly windowMs: number;

  constructor(maxQueries: number = 100, windowMs: number = 60000) {
    this.maxQueries = maxQueries;
    this.windowMs = windowMs;
  }

  /**
   * Check if a user/IP has exceeded rate limits
   */
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const queries = this.queryCount.get(identifier) || [];
    
    // Remove old queries outside the window
    const recentQueries = queries.filter(time => now - time < this.windowMs);
    
    if (recentQueries.length >= this.maxQueries) {
      return false; // Rate limit exceeded
    }
    
    recentQueries.push(now);
    this.queryCount.set(identifier, recentQueries);
    return true;
  }

  /**
   * Clear old entries to prevent memory leak
   */
  cleanup() {
    const now = Date.now();
    for (const [key, queries] of this.queryCount.entries()) {
      const recentQueries = queries.filter(time => now - time < this.windowMs);
      if (recentQueries.length === 0) {
        this.queryCount.delete(key);
      } else {
        this.queryCount.set(key, recentQueries);
      }
    }
  }
}

/**
 * Example usage in the CLOS API server
 */
export function applySecurityPatch(db: Database) {
  const secureDb = new SecureDatabase(db);
  const rateLimiter = new QueryRateLimiter();
  
  // Clean up rate limiter periodically
  setInterval(() => rateLimiter.cleanup(), 60000);
  
  return {
    secureDb,
    rateLimiter,
    InputValidator
  };
}