/**
 * API Performance Optimization Layer
 * Request batching, response compression, and parallel processing
 */

import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { z } from 'zod';
import { AdvancedCacheService } from './1-caching-strategy';

// ============================================
// 1. REQUEST BATCHING HANDLER
// ============================================

interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  params?: any;
  body?: any;
}

interface BatchResponse {
  id: string;
  status: number;
  data?: any;
  error?: string;
}

export class BatchRequestHandler {
  private limit = pLimit(10); // Process max 10 requests concurrently
  private cache = new AdvancedCacheService();

  async processBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const startTime = performance.now();

    // Group requests by endpoint for potential optimization
    const groupedRequests = this.groupRequests(requests);

    // Process requests with concurrency limit
    const responses = await Promise.all(
      requests.map(request =>
        this.limit(() => this.processRequest(request))
      )
    );

    const duration = performance.now() - startTime;
    console.log(`Batch processed ${requests.length} requests in ${duration.toFixed(2)}ms`);

    return responses;
  }

  private groupRequests(requests: BatchRequest[]): Map<string, BatchRequest[]> {
    const grouped = new Map<string, BatchRequest[]>();

    requests.forEach(request => {
      const key = `${request.method}:${request.endpoint}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(request);
    });

    return grouped;
  }

  private async processRequest(request: BatchRequest): Promise<BatchResponse> {
    try {
      // Check cache for GET requests
      if (request.method === 'GET') {
        const cacheKey = this.cache.generateKey(
          'api',
          request.endpoint,
          request.params
        );

        const cached = await this.cache.getWithStale(
          cacheKey,
          300, // 5 min TTL
          600, // 10 min stale
          async () => this.executeRequest(request)
        );

        if (cached) {
          return {
            id: request.id,
            status: 200,
            data: cached,
          };
        }
      }

      // Execute request
      const data = await this.executeRequest(request);

      return {
        id: request.id,
        status: 200,
        data,
      };
    } catch (error) {
      return {
        id: request.id,
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeRequest(request: BatchRequest): Promise<any> {
    // Simulate API execution (replace with actual logic)
    const handler = this.getHandler(request.endpoint);
    return handler(request);
  }

  private getHandler(endpoint: string): (request: BatchRequest) => Promise<any> {
    // Map endpoints to handlers
    const handlers: Record<string, any> = {
      '/estimates': this.handleEstimates,
      '/projects': this.handleProjects,
      '/customers': this.handleCustomers,
      // Add more handlers
    };

    return handlers[endpoint] || this.defaultHandler;
  }

  private async handleEstimates(request: BatchRequest): Promise<any> {
    // Implement estimate-specific logic
    return { estimates: [] };
  }

  private async handleProjects(request: BatchRequest): Promise<any> {
    // Implement project-specific logic
    return { projects: [] };
  }

  private async handleCustomers(request: BatchRequest): Promise<any> {
    // Implement customer-specific logic
    return { customers: [] };
  }

  private async defaultHandler(request: BatchRequest): Promise<any> {
    return { message: 'Handler not implemented' };
  }
}

// ============================================
// 2. RESPONSE COMPRESSION MIDDLEWARE
// ============================================

export function compressionMiddleware() {
  return async (req: NextRequest, res: NextResponse) => {
    const acceptEncoding = req.headers.get('accept-encoding') || '';

    // Check if client supports compression
    const supportsGzip = acceptEncoding.includes('gzip');
    const supportsBrotli = acceptEncoding.includes('br');

    if (supportsBrotli) {
      res.headers.set('Content-Encoding', 'br');
      // Apply Brotli compression (better compression ratio)
    } else if (supportsGzip) {
      res.headers.set('Content-Encoding', 'gzip');
      // Apply Gzip compression
    }

    // Set vary header for caching
    res.headers.set('Vary', 'Accept-Encoding');

    return res;
  };
}

// ============================================
// 3. OPTIMIZED PDF GENERATION SERVICE
// ============================================

interface PDFGenerationJob {
  id: string;
  estimateId: string;
  options: any;
  priority: 'high' | 'normal' | 'low';
}

export class OptimizedPDFService {
  private queue: PDFGenerationJob[] = [];
  private processing = false;
  private concurrency = 3; // Process 3 PDFs simultaneously
  private cache = new AdvancedCacheService();

  async generatePDF(estimateId: string, options: any): Promise<string> {
    // Check cache first
    const cacheKey = this.cache.generateKey('pdf', estimateId, options);
    const cached = await this.cache.getWithStale(
      cacheKey,
      604800, // 1 week TTL
      1209600, // 2 week stale
      async () => this.processPDF(estimateId, options)
    );

    if (cached) {
      return cached;
    }

    // Add to queue
    const job: PDFGenerationJob = {
      id: crypto.randomUUID(),
      estimateId,
      options,
      priority: options.priority || 'normal',
    };

    this.addToQueue(job);

    // Return job ID for tracking
    return job.id;
  }

  private addToQueue(job: PDFGenerationJob): void {
    // Add job based on priority
    if (job.priority === 'high') {
      this.queue.unshift(job);
    } else if (job.priority === 'low') {
      this.queue.push(job);
    } else {
      // Normal priority - add in middle
      const midIndex = Math.floor(this.queue.length / 2);
      this.queue.splice(midIndex, 0, job);
    }

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;

    // Process jobs with concurrency limit
    const limit = pLimit(this.concurrency);
    const batch = this.queue.splice(0, this.concurrency);

    await Promise.all(
      batch.map(job =>
        limit(() => this.processPDF(job.estimateId, job.options))
      )
    );

    // Continue processing
    this.processQueue();
  }

  private async processPDF(estimateId: string, options: any): Promise<string> {
    const startTime = performance.now();

    try {
      // Optimize PDF generation
      const optimizedOptions = {
        ...options,
        compress: true,
        embedFonts: false, // Use system fonts
        optimizeImages: true,
        jpegQuality: 80,
      };

      // Generate PDF (implement actual logic)
      const pdfUrl = await this.generatePDFDocument(estimateId, optimizedOptions);

      const duration = performance.now() - startTime;
      console.log(`PDF generated in ${duration.toFixed(2)}ms`);

      // Cache the result
      const cacheKey = this.cache.generateKey('pdf', estimateId, options);
      await this.cache.set(cacheKey, pdfUrl, 604800); // 1 week

      return pdfUrl;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  private async generatePDFDocument(estimateId: string, options: any): Promise<string> {
    // Implement actual PDF generation
    return `/api/pdf/${estimateId}.pdf`;
  }
}

// ============================================
// 4. DATABASE CONNECTION POOLING
// ============================================

import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool;
  private prisma: PrismaClient;

  private constructor() {
    // PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
    });

    // Prisma with connection pooling
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    });

    // Enable query caching
    this.setupQueryCaching();
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  private setupQueryCaching(): void {
    // Implement query result caching
    const cache = new AdvancedCacheService();

    // Middleware for Prisma to cache queries
    this.prisma.$use(async (params, next) => {
      // Only cache SELECT queries
      if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
        const cacheKey = cache.generateKey(
          'db',
          `${params.model}.${params.action}`,
          params.args
        );

        const cached = await cache.getWithStale(
          cacheKey,
          60, // 1 min TTL
          120, // 2 min stale
          () => next(params)
        );

        if (cached) {
          return cached;
        }
      }

      return next(params);
    });
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
    await this.pool.end();
  }
}

export const db = DatabasePool.getInstance();

// ============================================
// 5. RATE LIMITING WITH REDIS
// ============================================

export class RateLimiter {
  private cache = new AdvancedCacheService();

  async checkLimit(
    identifier: string,
    limit: number = 100,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (window * 1000);

    // Get current count
    const count = await this.cache.incr(key, window);

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + (window * 1000),
      };
    }

    return {
      allowed: true,
      remaining: limit - count,
      resetAt: now + (window * 1000),
    };
  }
}

// ============================================
// 6. API RESPONSE OPTIMIZATION
// ============================================

export class ResponseOptimizer {
  /**
   * Paginate large datasets
   */
  static paginate<T>(
    data: T[],
    page: number = 1,
    pageSize: number = 50
  ): {
    data: T[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  } {
    const start = (page - 1) * pageSize;
    const paginatedData = data.slice(start, start + pageSize);

    return {
      data: paginatedData,
      meta: {
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize),
      },
    };
  }

  /**
   * Filter sensitive fields from response
   */
  static sanitize<T extends object>(
    data: T,
    excludeFields: string[] = ['password', 'apiKey', 'secret']
  ): Partial<T> {
    const sanitized = { ...data };

    excludeFields.forEach(field => {
      delete (sanitized as any)[field];
    });

    return sanitized;
  }

  /**
   * Add ETags for caching
   */
  static addETag(res: NextResponse, data: any): void {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');

    res.headers.set('ETag', `"${hash}"`);
  }

  /**
   * Enable partial responses with field selection
   */
  static selectFields<T extends object>(
    data: T,
    fields: string[]
  ): Partial<T> {
    const selected: any = {};

    fields.forEach(field => {
      if (field in data) {
        selected[field] = (data as any)[field];
      }
    });

    return selected;
  }
}

// ============================================
// 7. PARALLEL DATA FETCHING
// ============================================

export class ParallelFetcher {
  private limit = pLimit(5); // Max 5 concurrent requests

  async fetchAll<T>(
    requests: Array<() => Promise<T>>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(request => this.limit(request))
    );
  }

  async fetchWithFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    try {
      return await Promise.race([
        primary(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);
    } catch {
      return fallback();
    }
  }
}

// ============================================
// 8. OPTIMIZED API ROUTE HANDLER
// ============================================

export function optimizedApiHandler(
  handler: (req: NextRequest) => Promise<any>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = performance.now();

    try {
      // Rate limiting
      const rateLimiter = new RateLimiter();
      const ip = req.ip || 'anonymous';
      const { allowed, remaining, resetAt } = await rateLimiter.checkLimit(ip);

      if (!allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetAt.toString(),
            },
          }
        );
      }

      // Process request
      const data = await handler(req);

      // Create optimized response
      const response = NextResponse.json(data, {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetAt.toString(),
          'X-Response-Time': `${(performance.now() - startTime).toFixed(2)}ms`,
        },
      });

      // Add caching headers
      ResponseOptimizer.addETag(response, data);

      return response;
    } catch (error) {
      console.error('API error:', error);

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
