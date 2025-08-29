import { useState, useEffect, useCallback } from 'react';
import { PromptResponse } from '@/lib/prompt-engineering/types';

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  avgRetrievalTime: number;
  evictionCount: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

interface CacheEntry {
  key: string;
  value: PromptResponse;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  ttl?: number;
}

interface UsePromptCacheReturn {
  get: (key: string) => Promise<PromptResponse | null>;
  set: (key: string, value: PromptResponse, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  has: (key: string) => Promise<boolean>;
  size: () => Promise<number>;
  cacheStats: CacheStats;
  isLoading: boolean;
  error: Error | null;
}

// In-memory cache implementation for demonstration
class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRetrievalTime: 0,
    retrievalCount: 0,
  };

  async get(key: string): Promise<PromptResponse | null> {
    const startTime = performance.now();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.stats.totalRetrievalTime += performance.now() - startTime;
      this.stats.retrievalCount++;
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() > entry.timestamp.getTime() + entry.ttl * 1000) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.totalRetrievalTime += performance.now() - startTime;
      this.stats.retrievalCount++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    this.stats.hits++;
    this.stats.totalRetrievalTime += performance.now() - startTime;
    this.stats.retrievalCount++;
    
    return entry.value;
  }

  async set(key: string, value: PromptResponse, ttl?: number): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
      ttl,
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRetrievalTime: 0,
      retrievalCount: 0,
    };
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (entry.ttl && Date.now() > entry.timestamp.getTime() + entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
      avgRetrievalTime: this.stats.retrievalCount > 0 ? 
        this.stats.totalRetrievalTime / this.stats.retrievalCount : 0,
      evictionCount: this.stats.evictions,
      oldestEntry: entries.length > 0 ? 
        entries.reduce((oldest, entry) => 
          entry.timestamp < oldest.timestamp ? entry : oldest
        ).timestamp : null,
      newestEntry: entries.length > 0 ?
        entries.reduce((newest, entry) => 
          entry.timestamp > newest.timestamp ? entry : newest
        ).timestamp : null,
    };
  }

  private evictLRU(): void {
    let lruEntry: CacheEntry | null = null;
    let lruKey = '';

    for (const [key, entry] of this.cache) {
      if (!lruEntry || entry.lastAccessed < lruEntry.lastAccessed) {
        lruEntry = entry;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage in KB
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.value).length;
      size += entry.key.length;
      size += 200; // Overhead for timestamps, counters, etc.
    }
    return Math.round(size / 1024);
  }
}

const cacheInstance = new MemoryCache();

export const usePromptCache = (): UsePromptCacheReturn => {
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalEntries: 0,
    hitRate: 0,
    missRate: 0,
    memoryUsage: 0,
    avgRetrievalTime: 0,
    evictionCount: 0,
    oldestEntry: null,
    newestEntry: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStats = useCallback(() => {
    setCacheStats(cacheInstance.getStats());
  }, []);

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  const get = useCallback(async (key: string): Promise<PromptResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await cacheInstance.get(key);
      updateStats();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache get failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  const set = useCallback(async (key: string, value: PromptResponse, ttl?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cacheInstance.set(key, value, ttl);
      updateStats();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache set failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  const deleteEntry = useCallback(async (key: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cacheInstance.delete(key);
      updateStats();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache delete failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  const clear = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cacheInstance.clear();
      updateStats();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache clear failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateStats]);

  const has = useCallback(async (key: string): Promise<boolean> => {
    try {
      return await cacheInstance.has(key);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache has failed');
      setError(error);
      throw error;
    }
  }, []);

  const size = useCallback(async (): Promise<number> => {
    try {
      return await cacheInstance.size();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cache size failed');
      setError(error);
      throw error;
    }
  }, []);

  return {
    get,
    set,
    delete: deleteEntry,
    clear,
    has,
    size,
    cacheStats,
    isLoading,
    error,
  };
};