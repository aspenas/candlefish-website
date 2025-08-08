import { apolloClient } from './apollo';
import { OfflineService } from './offline';
import { NetworkService } from './network';
import { OfflineMutation } from '@/store/slices/offlineSlice';
import { store } from '@/store';
import { removeMutationFromQueue, incrementMutationRetry, addSyncError, updateSyncProgress } from '@/store/slices/offlineSlice';

// GraphQL mutations map
import {
  CREATE_DASHBOARD_MUTATION,
  UPDATE_DASHBOARD_MUTATION,
  DELETE_DASHBOARD_MUTATION,
} from '@/graphql/dashboard';

import {
  UPDATE_PROFILE_MUTATION,
  UPDATE_USER_PREFERENCES_MUTATION,
} from '@/graphql/auth';

import {
  CREATE_ORGANIZATION_MUTATION,
  UPDATE_ORGANIZATION_MUTATION,
  INVITE_MEMBER_MUTATION,
} from '@/graphql/organization';

const MUTATION_MAP = {
  CREATE_DASHBOARD: CREATE_DASHBOARD_MUTATION,
  UPDATE_DASHBOARD: UPDATE_DASHBOARD_MUTATION,
  DELETE_DASHBOARD: DELETE_DASHBOARD_MUTATION,
  UPDATE_PROFILE: UPDATE_PROFILE_MUTATION,
  UPDATE_USER_PREFERENCES: UPDATE_USER_PREFERENCES_MUTATION,
  CREATE_ORGANIZATION: CREATE_ORGANIZATION_MUTATION,
  UPDATE_ORGANIZATION: UPDATE_ORGANIZATION_MUTATION,
  INVITE_MEMBER: INVITE_MEMBER_MUTATION,
};

export class SyncService {
  private static isSyncing = false;
  private static syncQueue: OfflineMutation[] = [];

  static async initialize(): Promise<void> {
    // Set up network change listeners
    NetworkService.onNetworkChange(async (isOnline) => {
      if (isOnline && !this.isSyncing) {
        // Automatically sync when coming back online
        setTimeout(() => this.syncOfflineData(), 1000);
      }
    });

    // Clean up expired cache on startup
    await OfflineService.clearExpiredCache();
  }

  static async syncOfflineData(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    const isOnline = await NetworkService.isOnline();
    if (!isOnline) {
      return;
    }

    try {
      this.isSyncing = true;
      store.dispatch(updateSyncProgress(0));

      // Process mutation queue
      const result = await this.processMutationQueue();

      // Sync cached data (refresh stale data)
      await this.syncCachedData();

      store.dispatch(updateSyncProgress(100));
    } catch (error) {
      console.error('Sync failed:', error);
      store.dispatch(addSyncError(error instanceof Error ? error.message : 'Sync failed'));
    } finally {
      this.isSyncing = false;
    }
  }

  static async processMutationQueue(): Promise<{ processed: number; failed: number }> {
    const mutations = await OfflineService.getMutations();

    if (mutations.length === 0) {
      return { processed: 0, failed: 0 };
    }

    // Sort by priority and timestamp
    const sortedMutations = mutations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return a.timestamp - b.timestamp;
    });

    let processed = 0;
    let failed = 0;
    const totalMutations = sortedMutations.length;

    for (let i = 0; i < sortedMutations.length; i++) {
      const mutation = sortedMutations[i];

      try {
        // Update progress
        store.dispatch(updateSyncProgress(Math.round((i / totalMutations) * 100)));

        const success = await this.processSingleMutation(mutation);

        if (success) {
          await OfflineService.removeMutation(mutation.id);
          store.dispatch(removeMutationFromQueue(mutation.id));
          processed++;
        } else {
          // Increment retry count
          mutation.retryCount++;
          store.dispatch(incrementMutationRetry(mutation.id));

          if (mutation.retryCount >= mutation.maxRetries) {
            // Remove mutation after max retries
            await OfflineService.removeMutation(mutation.id);
            store.dispatch(removeMutationFromQueue(mutation.id));
            failed++;

            store.dispatch(addSyncError(
              `Failed to sync ${mutation.type} after ${mutation.maxRetries} attempts`
            ));
          } else {
            // Update mutation with new retry count
            await OfflineService.updateMutation(mutation.id, {
              retryCount: mutation.retryCount
            });
          }
        }
      } catch (error) {
        console.error(`Failed to process mutation ${mutation.id}:`, error);
        failed++;

        // Remove completely failed mutations
        await OfflineService.removeMutation(mutation.id);
        store.dispatch(removeMutationFromQueue(mutation.id));
        store.dispatch(addSyncError(
          `Mutation ${mutation.type} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        ));
      }

      // Add small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { processed, failed };
  }

  private static async processSingleMutation(mutation: OfflineMutation): Promise<boolean> {
    try {
      const graphqlMutation = MUTATION_MAP[mutation.type as keyof typeof MUTATION_MAP];

      if (!graphqlMutation) {
        console.error(`Unknown mutation type: ${mutation.type}`);
        return false;
      }

      const { data, errors } = await apolloClient.mutate({
        mutation: graphqlMutation,
        variables: mutation.variables,
        errorPolicy: 'all',
      });

      if (errors && errors.length > 0) {
        console.error(`GraphQL errors for mutation ${mutation.type}:`, errors);

        // Check if it's a client error (4xx) that shouldn't be retried
        const isClientError = errors.some(error =>
          error.extensions?.code === 'BAD_USER_INPUT' ||
          error.extensions?.code === 'FORBIDDEN' ||
          error.extensions?.code === 'UNAUTHENTICATED'
        );

        if (isClientError) {
          console.log(`Client error for mutation ${mutation.id}, removing from queue`);
          return true; // Remove from queue, don't retry
        }

        return false; // Server error, retry
      }

      if (!data) {
        console.error(`No data returned for mutation ${mutation.type}`);
        return false;
      }

      console.log(`Successfully processed offline mutation: ${mutation.type}`);
      return true;
    } catch (error) {
      console.error(`Error processing mutation ${mutation.id}:`, error);

      // Check if it's a network error
      if (error.networkError) {
        return false; // Network error, retry later
      }

      // GraphQL error, might be client error
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        const isClientError = error.graphQLErrors.some((err: any) =>
          err.extensions?.code === 'BAD_USER_INPUT' ||
          err.extensions?.code === 'FORBIDDEN' ||
          err.extensions?.code === 'UNAUTHENTICATED'
        );

        if (isClientError) {
          return true; // Remove from queue
        }
      }

      return false; // Unknown error, retry
    }
  }

  static async syncCachedData(): Promise<void> {
    try {
      const cachedKeys = await OfflineService.getAllCachedKeys();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();

      // Find stale cache entries that need refreshing
      const staleCachePromises = cachedKeys.map(async (key) => {
        try {
          const cached = await OfflineService.getCachedData(key);
          if (cached && (now - cached.timestamp) > staleThreshold) {
            return { key, cached };
          }
        } catch (error) {
          console.error(`Error checking cached data for key ${key}:`, error);
        }
        return null;
      });

      const staleCacheEntries = (await Promise.all(staleCachePromises))
        .filter(entry => entry !== null);

      // Refresh stale data
      for (const entry of staleCacheEntries) {
        if (!entry) continue;

        try {
          await this.refreshCachedData(entry.key, entry.cached);
        } catch (error) {
          console.error(`Failed to refresh cached data for ${entry.key}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync cached data:', error);
    }
  }

  private static async refreshCachedData(key: string, cached: any): Promise<void> {
    // Parse the cache key to understand what type of data it is
    if (key.startsWith('dashboards_')) {
      const organizationId = key.replace('dashboards_', '');
      // Refresh dashboards list would go here
      // This would typically involve calling the dashboard service
    } else if (key.startsWith('dashboard_')) {
      const dashboardId = key.replace('dashboard_', '');
      // Refresh specific dashboard would go here
    } else if (key.startsWith('widget_')) {
      // Parse widget key to extract widget ID and filters
      const widgetInfo = this.parseWidgetCacheKey(key);
      if (widgetInfo) {
        // Refresh widget data would go here
      }
    }
  }

  private static parseWidgetCacheKey(key: string): { widgetId: string; filters: any } | null {
    try {
      const prefix = 'widget_';
      if (!key.startsWith(prefix)) return null;

      const remainder = key.substring(prefix.length);
      const parts = remainder.split('_');

      if (parts.length < 2) return null;

      const widgetId = parts[0];
      const filtersJson = parts.slice(1).join('_');
      const filters = JSON.parse(filtersJson);

      return { widgetId, filters };
    } catch (error) {
      console.error('Failed to parse widget cache key:', key, error);
      return null;
    }
  }

  static async forceSyncNow(): Promise<void> {
    if (!this.isSyncing) {
      await this.syncOfflineData();
    }
  }

  static isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  static async getSyncStatus(): Promise<{
    pendingMutations: number;
    lastSyncAt: number | null;
    isSyncing: boolean;
  }> {
    const mutations = await OfflineService.getMutations();
    const state = store.getState();

    return {
      pendingMutations: mutations.length,
      lastSyncAt: state.offline.lastSyncAt,
      isSyncing: this.isSyncing,
    };
  }

  static async clearSyncErrors(): Promise<void> {
    // This would be handled by the Redux action
    // store.dispatch(clearSyncErrors());
  }
}
