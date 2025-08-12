import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineMutation, OfflineData } from '@/store/slices/offlineSlice';

export class OfflineService {
  private static readonly MUTATIONS_KEY = 'offline_mutations';
  private static readonly CACHE_KEY_PREFIX = 'cache_';
  private static readonly CACHE_INDEX_KEY = 'cache_index';

  // Mutation Queue Management
  static async addMutation(mutation: OfflineMutation): Promise<void> {
    try {
      const existingMutations = await this.getMutations();
      const updatedMutations = [...existingMutations, mutation];

      await AsyncStorage.setItem(
        this.MUTATIONS_KEY,
        JSON.stringify(updatedMutations)
      );
    } catch (error) {
      console.error('Failed to add offline mutation:', error);
      throw error;
    }
  }

  static async getMutations(): Promise<OfflineMutation[]> {
    try {
      const mutationsData = await AsyncStorage.getItem(this.MUTATIONS_KEY);
      return mutationsData ? JSON.parse(mutationsData) : [];
    } catch (error) {
      console.error('Failed to get offline mutations:', error);
      return [];
    }
  }

  static async removeMutation(mutationId: string): Promise<void> {
    try {
      const mutations = await this.getMutations();
      const updatedMutations = mutations.filter(m => m.id !== mutationId);

      await AsyncStorage.setItem(
        this.MUTATIONS_KEY,
        JSON.stringify(updatedMutations)
      );
    } catch (error) {
      console.error('Failed to remove offline mutation:', error);
      throw error;
    }
  }

  static async updateMutation(mutationId: string, updates: Partial<OfflineMutation>): Promise<void> {
    try {
      const mutations = await this.getMutations();
      const updatedMutations = mutations.map(m =>
        m.id === mutationId ? { ...m, ...updates } : m
      );

      await AsyncStorage.setItem(
        this.MUTATIONS_KEY,
        JSON.stringify(updatedMutations)
      );
    } catch (error) {
      console.error('Failed to update offline mutation:', error);
      throw error;
    }
  }

  static async clearMutations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.MUTATIONS_KEY);
    } catch (error) {
      console.error('Failed to clear offline mutations:', error);
      throw error;
    }
  }

  // Cache Management
  static async cacheData(data: OfflineData): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${data.key}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

      // Update cache index
      await this.updateCacheIndex(data.key, data.timestamp);
    } catch (error) {
      console.error('Failed to cache data:', error);
      throw error;
    }
  }

  static async getCachedData(key: string): Promise<OfflineData | null> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const data: OfflineData = JSON.parse(cachedData);

        // Check if data has expired
        if (data.expiresAt && Date.now() > data.expiresAt) {
          await this.removeCachedData(key);
          return null;
        }

        return data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  static async removeCachedData(key: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);

      // Update cache index
      await this.removeCacheIndexEntry(key);
    } catch (error) {
      console.error('Failed to remove cached data:', error);
      throw error;
    }
  }

  static async clearExpiredCache(): Promise<string[]> {
    try {
      const cacheIndex = await this.getCacheIndex();
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, metadata] of Object.entries(cacheIndex)) {
        if (metadata.expiresAt && now > metadata.expiresAt) {
          expiredKeys.push(key);
          await this.removeCachedData(key);
        }
      }

      return expiredKeys;
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
      return [];
    }
  }

  static async clearCache(): Promise<void> {
    try {
      const cacheIndex = await this.getCacheIndex();
      const keys = Object.keys(cacheIndex);

      // Remove all cache entries
      const removePromises = keys.map(key => this.removeCachedData(key));
      await Promise.all(removePromises);

      // Clear the index
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  static async getStorageUsage(): Promise<{
    used: number;
    available: number;
    percentage: number;
  }> {
    try {
      // Get all AsyncStorage keys
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      // Calculate total size of all stored data
      const sizePromises = keys.map(async (key) => {
        try {
          const value = await AsyncStorage.getItem(key);
          return value ? value.length : 0;
        } catch {
          return 0;
        }
      });

      const sizes = await Promise.all(sizePromises);
      totalSize = sizes.reduce((sum, size) => sum + size, 0);

      // AsyncStorage typically has around 6MB limit on iOS and 6MB on Android
      const estimatedLimit = 6 * 1024 * 1024; // 6MB in bytes
      const available = Math.max(0, estimatedLimit - totalSize);
      const percentage = (totalSize / estimatedLimit) * 100;

      return {
        used: totalSize,
        available,
        percentage: Math.min(100, percentage),
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // Cache Index Management
  private static async getCacheIndex(): Promise<Record<string, {
    timestamp: number;
    expiresAt?: number;
  }>> {
    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.error('Failed to get cache index:', error);
      return {};
    }
  }

  private static async updateCacheIndex(key: string, timestamp: number, expiresAt?: number): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      index[key] = { timestamp, expiresAt };

      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update cache index:', error);
    }
  }

  private static async removeCacheIndexEntry(key: string): Promise<void> {
    try {
      const index = await this.getCacheIndex();
      delete index[key];

      await AsyncStorage.setItem(this.CACHE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to remove cache index entry:', error);
    }
  }

  // Utility Methods
  static async isOnline(): Promise<boolean> {
    // This will be implemented with NetInfo in the NetworkService
    return true;
  }

  static async getAllCachedKeys(): Promise<string[]> {
    try {
      const index = await this.getCacheIndex();
      return Object.keys(index);
    } catch (error) {
      console.error('Failed to get cached keys:', error);
      return [];
    }
  }

  static async getCacheStats(): Promise<{
    totalItems: number;
    totalSize: number;
    oldestItem: number | null;
    newestItem: number | null;
    expiredItems: number;
  }> {
    try {
      const index = await this.getCacheIndex();
      const keys = Object.keys(index);
      const now = Date.now();

      let totalSize = 0;
      let oldestItem: number | null = null;
      let newestItem: number | null = null;
      let expiredItems = 0;

      for (const key of keys) {
        const metadata = index[key];

        // Check size
        try {
          const data = await this.getCachedData(key);
          if (data) {
            totalSize += JSON.stringify(data).length;
          }
        } catch {
          // Continue if we can't get the data
        }

        // Track timestamps
        if (oldestItem === null || metadata.timestamp < oldestItem) {
          oldestItem = metadata.timestamp;
        }
        if (newestItem === null || metadata.timestamp > newestItem) {
          newestItem = metadata.timestamp;
        }

        // Count expired items
        if (metadata.expiresAt && now > metadata.expiresAt) {
          expiredItems++;
        }
      }

      return {
        totalItems: keys.length,
        totalSize,
        oldestItem,
        newestItem,
        expiredItems,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: null,
        newestItem: null,
        expiredItems: 0,
      };
    }
  }

  static async cleanupStorage(): Promise<{
    removedItems: number;
    freedSpace: number;
  }> {
    try {
      const initialStats = await this.getCacheStats();

      // Remove expired items
      const expiredKeys = await this.clearExpiredCache();

      // If still over 80% capacity, remove oldest items
      const usage = await this.getStorageUsage();
      let removedOldItems = 0;

      if (usage.percentage > 80) {
        const index = await this.getCacheIndex();
        const sortedEntries = Object.entries(index)
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        // Remove oldest 25% of items
        const itemsToRemove = Math.ceil(sortedEntries.length * 0.25);

        for (let i = 0; i < itemsToRemove && i < sortedEntries.length; i++) {
          await this.removeCachedData(sortedEntries[i][0]);
          removedOldItems++;
        }
      }

      const finalStats = await this.getCacheStats();
      const freedSpace = initialStats.totalSize - finalStats.totalSize;

      return {
        removedItems: expiredKeys.length + removedOldItems,
        freedSpace,
      };
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
      return { removedItems: 0, freedSpace: 0 };
    }
  }
}
