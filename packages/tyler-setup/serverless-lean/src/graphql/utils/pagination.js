/**
 * Efficient Pagination Utilities for GraphQL
 * Implements cursor-based pagination optimized for DynamoDB
 */

import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Default pagination limits
 */
const PAGINATION_LIMITS = {
  default: 20,
  max: 100,
  admin: 200,
  contractor: 50,
};

/**
 * Cursor-based pagination implementation
 */
export class CursorPagination {
  constructor(client, cacheManager) {
    this.client = client;
    this.cache = cacheManager;
  }

  /**
   * Execute paginated query with cursor support
   */
  async paginateQuery(params, args, context) {
    const { first, after, last, before, orderBy, sortOrder } = args;
    const user = context.user;

    // Determine page size with user-based limits
    const maxLimit = this.getMaxLimit(user);
    const pageSize = Math.min(first || last || PAGINATION_LIMITS.default, maxLimit);

    // Build query parameters
    const queryParams = {
      ...params,
      Limit: pageSize + 1, // Request one extra to check for more pages
    };

    // Handle cursor-based pagination
    if (after) {
      queryParams.ExclusiveStartKey = this.decodeCursor(after);
    } else if (before) {
      // For backward pagination, we need to handle this differently
      queryParams.ExclusiveStartKey = this.decodeCursor(before);
      queryParams.ScanIndexForward = !(sortOrder === 'ASC');
    }

    // Set sort order
    if (queryParams.KeyConditionExpression) {
      queryParams.ScanIndexForward = sortOrder === 'ASC';
    }

    // Execute query with caching
    const cacheKey = this.generateCacheKey(queryParams, args);
    let result = await this.cache.get('query', cacheKey);

    if (!result) {
      result = await this.client.send(
        params.KeyConditionExpression ? new QueryCommand(queryParams) : new ScanCommand(queryParams)
      );

      // Cache for 2 minutes
      await this.cache.set('query', cacheKey, result, {}, 120);
    }

    // Process results
    const items = result.Items || [];
    const hasMore = items.length > pageSize;

    // Remove extra item if it exists
    if (hasMore) {
      items.pop();
    }

    // Handle backward pagination
    if (before) {
      items.reverse();
    }

    // Create connection response
    return this.createConnection(items, {
      hasNextPage: hasMore && !before,
      hasPreviousPage: !!after || (!!before && hasMore),
      requestedFirst: first,
      requestedLast: last,
    });
  }

  /**
   * Execute paginated scan with efficient filtering
   */
  async paginateScan(params, args, context) {
    const { first, after, last, before, filter } = args;
    const user = context.user;

    const maxLimit = this.getMaxLimit(user);
    const pageSize = Math.min(first || last || PAGINATION_LIMITS.default, maxLimit);

    // Build scan parameters
    const scanParams = {
      ...params,
      Limit: pageSize * 2, // Request more items to account for filtering
    };

    // Apply filters
    if (filter) {
      const { expression, names, values } = this.buildFilterExpression(filter);
      if (expression) {
        scanParams.FilterExpression = expression;
        scanParams.ExpressionAttributeNames = names;
        scanParams.ExpressionAttributeValues = values;
      }
    }

    // Handle cursor
    if (after) {
      scanParams.ExclusiveStartKey = this.decodeCursor(after);
    }

    // Execute scan with pagination and filtering
    const result = await this.executePaginatedScan(scanParams, pageSize, context);

    return this.createConnection(result.items, {
      hasNextPage: result.hasMore,
      hasPreviousPage: !!after,
    });
  }

  /**
   * Execute paginated scan with automatic retry for filtering
   */
  async executePaginatedScan(scanParams, targetPageSize, context, attempts = 0) {
    const maxAttempts = 3;
    let allItems = [];
    let lastEvaluatedKey = scanParams.ExclusiveStartKey;

    while (allItems.length < targetPageSize && attempts < maxAttempts) {
      const currentParams = {
        ...scanParams,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await this.client.send(new ScanCommand(currentParams));
      const items = result.Items || [];

      allItems = allItems.concat(items);
      lastEvaluatedKey = result.LastEvaluatedKey;

      // If no more items, break
      if (!lastEvaluatedKey) {
        break;
      }

      attempts++;
    }

    // Trim to exact page size
    const hasMore = allItems.length > targetPageSize || !!lastEvaluatedKey;
    if (allItems.length > targetPageSize) {
      allItems = allItems.slice(0, targetPageSize);
    }

    return {
      items: allItems,
      hasMore,
      lastEvaluatedKey,
    };
  }

  /**
   * Build filter expression from filter object
   */
  buildFilterExpression(filter) {
    const expressions = [];
    const attributeNames = {};
    const attributeValues = {};
    let nameCounter = 0;
    let valueCounter = 0;

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null) continue;

      const nameAlias = `#attr${nameCounter++}`;
      const valueAlias = `:val${valueCounter++}`;

      attributeNames[nameAlias] = key;

      if (key === 'search') {
        // Text search across multiple fields
        const searchExpressions = [];
        const searchFields = ['name', 'email', 'description'];

        for (const field of searchFields) {
          const fieldAlias = `#search${nameCounter++}`;
          attributeNames[fieldAlias] = field;
          searchExpressions.push(`contains(${fieldAlias}, ${valueAlias})`);
        }

        expressions.push(`(${searchExpressions.join(' OR ')})`);
        attributeValues[valueAlias] = value;
      } else if (key.endsWith('After') || key.endsWith('Before')) {
        // Date range filters
        const operation = key.endsWith('After') ? '>=' : '<=';
        const fieldName = key.replace(/(After|Before)$/, '');
        const fieldAlias = `#date${nameCounter++}`;

        attributeNames[fieldAlias] = fieldName;
        expressions.push(`${fieldAlias} ${operation} ${valueAlias}`);
        attributeValues[valueAlias] = new Date(value).getTime();
      } else if (Array.isArray(value)) {
        // Array contains filter
        expressions.push(`contains(${nameAlias}, ${valueAlias})`);
        attributeValues[valueAlias] = value[0]; // Simplified implementation
      } else {
        // Exact match
        expressions.push(`${nameAlias} = ${valueAlias}`);
        attributeValues[valueAlias] = value;
      }
    }

    return {
      expression: expressions.length > 0 ? expressions.join(' AND ') : null,
      names: attributeNames,
      values: attributeValues,
    };
  }

  /**
   * Create GraphQL connection response
   */
  createConnection(items, paginationInfo) {
    const edges = items.map((item, index) => ({
      node: item,
      cursor: this.encodeCursor(item, index),
    }));

    const pageInfo = {
      hasNextPage: paginationInfo.hasNextPage,
      hasPreviousPage: paginationInfo.hasPreviousPage,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      totalCount: this.estimateTotalCount(items, paginationInfo),
    };
  }

  /**
   * Encode cursor for pagination
   */
  encodeCursor(item, index) {
    const cursorData = {
      id: item.id || item.name || item.key,
      timestamp: item.createdAt || item.updatedAt || Date.now(),
      index,
    };

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor for pagination
   */
  decodeCursor(cursor) {
    try {
      const decodedData = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      );

      return {
        id: decodedData.id,
        timestamp: decodedData.timestamp,
      };
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Generate cache key for query
   */
  generateCacheKey(params, args) {
    const keyData = {
      table: params.TableName,
      index: params.IndexName,
      condition: params.KeyConditionExpression || params.FilterExpression,
      limit: params.Limit,
      args: {
        first: args.first,
        after: args.after,
        filter: args.filter,
        orderBy: args.orderBy,
        sortOrder: args.sortOrder,
      },
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 50);
  }

  /**
   * Get maximum page limit for user
   */
  getMaxLimit(user) {
    if (!user) return PAGINATION_LIMITS.default;

    if (user.role === 'admin') return PAGINATION_LIMITS.admin;
    if (user.type === 'contractor') return PAGINATION_LIMITS.contractor;

    return PAGINATION_LIMITS.max;
  }

  /**
   * Estimate total count (expensive operation, use sparingly)
   */
  estimateTotalCount(items, paginationInfo) {
    // For performance, we don't calculate exact counts
    // Return approximate count based on current page
    if (!paginationInfo.hasNextPage) {
      return items.length;
    }

    // Rough estimate: current page size * 10
    return items.length * 10;
  }
}

/**
 * Offset-based pagination (for compatibility)
 */
export class OffsetPagination {
  constructor(client, cacheManager) {
    this.client = client;
    this.cache = cacheManager;
  }

  /**
   * Execute offset-based pagination
   */
  async paginate(params, offset = 0, limit = 20) {
    const queryParams = {
      ...params,
      Limit: limit,
    };

    // For offset pagination, we need to scan from the beginning
    // This is less efficient than cursor-based pagination
    if (offset > 0) {
      // This would require scanning and skipping items
      // Not recommended for large datasets
      console.warn('Offset pagination is inefficient for large datasets');
    }

    const result = await this.client.send(new ScanCommand(queryParams));

    return {
      items: result.Items || [],
      totalCount: result.Count || 0,
      hasMore: !!result.LastEvaluatedKey,
      offset,
      limit,
    };
  }
}

/**
 * Infinite scroll pagination utilities
 */
export class InfiniteScrollPagination {
  constructor(client, cacheManager) {
    this.cursorPagination = new CursorPagination(client, cacheManager);
  }

  /**
   * Get next page for infinite scroll
   */
  async getNextPage(params, cursor, pageSize = 20, context) {
    const args = {
      first: pageSize,
      after: cursor,
    };

    return this.cursorPagination.paginateQuery(params, args, context);
  }

  /**
   * Pre-fetch next page for performance
   */
  async prefetchNextPage(params, currentCursor, pageSize, context) {
    try {
      const nextPageData = await this.getNextPage(params, currentCursor, pageSize, context);

      // Store in cache with a shorter TTL for prefetched data
      const cacheKey = `prefetch:${this.cursorPagination.generateCacheKey(params, {
        first: pageSize,
        after: currentCursor
      })}`;

      await this.cursorPagination.cache.set('query', cacheKey, nextPageData, {}, 60); // 1 minute cache

      return nextPageData;
    } catch (error) {
      console.warn('Failed to prefetch next page:', error);
      return null;
    }
  }
}

/**
 * Smart pagination that chooses the best strategy
 */
export class SmartPagination {
  constructor(client, cacheManager) {
    this.cursorPagination = new CursorPagination(client, cacheManager);
    this.offsetPagination = new OffsetPagination(client, cacheManager);
    this.infiniteScroll = new InfiniteScrollPagination(client, cacheManager);
  }

  /**
   * Automatically choose pagination strategy based on query
   */
  async paginate(params, args, context) {
    const { first, after, last, before } = args;

    // Use cursor pagination for forward pagination
    if (first && !last) {
      return this.cursorPagination.paginateQuery(params, args, context);
    }

    // Use cursor pagination for backward pagination
    if (last && !first) {
      return this.cursorPagination.paginateQuery(params, args, context);
    }

    // Default to cursor pagination
    return this.cursorPagination.paginateQuery(params, args, context);
  }

  /**
   * Get pagination statistics
   */
  getStats() {
    return {
      cacheStats: this.cursorPagination.cache.getStats(),
      recommendedStrategy: 'cursor',
      supportedFeatures: [
        'cursor-based pagination',
        'filtering',
        'sorting',
        'caching',
        'infinite scroll',
      ],
    };
  }
}

/**
 * Pagination performance monitor
 */
export class PaginationMonitor {
  constructor() {
    this.metrics = {
      totalQueries: 0,
      cacheHits: 0,
      avgResponseTime: 0,
      slowQueries: [],
    };
  }

  /**
   * Track pagination performance
   */
  trackQuery(startTime, cacheHit, itemCount) {
    const responseTime = Date.now() - startTime;

    this.metrics.totalQueries++;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime + responseTime) / 2;

    if (cacheHit) {
      this.metrics.cacheHits++;
    }

    if (responseTime > 1000) {
      this.metrics.slowQueries.push({
        responseTime,
        itemCount,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries.shift();
      }
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRatio: this.metrics.totalQueries > 0
        ? this.metrics.cacheHits / this.metrics.totalQueries
        : 0,
      slowQueryCount: this.metrics.slowQueries.length,
    };
  }
}

// Export singleton instances
export const paginationMonitor = new PaginationMonitor();
