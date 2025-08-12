import NetInfo from '@react-native-community/netinfo';
import { store } from '@/store';
import { setOnlineStatus } from '@/store/slices/offlineSlice';

interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
}

type NetworkChangeListener = (isOnline: boolean, networkState: NetworkState) => void;

export class NetworkService {
  private static isInitialized = false;
  private static networkState: NetworkState = {
    isConnected: false,
    type: 'unknown',
    isInternetReachable: null,
  };
  private static listeners: Set<NetworkChangeListener> = new Set();
  private static unsubscribe: (() => void) | null = null;

  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        this.updateNetworkState(state);
      });

      this.isInitialized = true;
      console.log('NetworkService initialized');
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      throw error;
    }
  }

  static async isOnline(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const state = await NetInfo.fetch();
        return this.determineOnlineStatus(state);
      }
      return this.networkState.isConnected &&
             (this.networkState.isInternetReachable !== false);
    } catch (error) {
      console.error('Failed to check online status:', error);
      // Default to offline if we can't determine the status
      return false;
    }
  }

  static getCurrentNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  static onNetworkChange(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current state
    const isOnline = this.networkState.isConnected &&
                    (this.networkState.isInternetReachable !== false);
    listener(isOnline, this.networkState);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  static async refresh(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);
      return this.networkState;
    } catch (error) {
      console.error('Failed to refresh network state:', error);
      return this.networkState;
    }
  }

  static getConnectionType(): string {
    return this.networkState.type;
  }

  static isWiFiConnection(): boolean {
    return this.networkState.type === 'wifi';
  }

  static isCellularConnection(): boolean {
    return this.networkState.type === 'cellular';
  }

  static isExpensiveConnection(): boolean {
    // Consider cellular connections as expensive
    return this.isCellularConnection();
  }

  static async waitForOnline(timeoutMs: number = 30000): Promise<boolean> {
    if (await this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.onNetworkChange((isOnline) => {
        if (isOnline) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  static async testConnection(url: string = 'https://api.candlefish.ai/health'): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, responseTime };
      } else {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        return { success: false, responseTime, error: 'Timeout' };
      }

      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static updateNetworkState(state: any): void {
    const wasOnline = this.networkState.isConnected &&
                     (this.networkState.isInternetReachable !== false);

    // Update internal state
    this.networkState = {
      isConnected: state.isConnected ?? false,
      type: state.type ?? 'unknown',
      isInternetReachable: state.isInternetReachable,
    };

    const isOnline = this.determineOnlineStatus(state);

    // Update Redux store
    store.dispatch(setOnlineStatus(isOnline));

    // Notify listeners if status changed
    if (wasOnline !== isOnline) {
      console.log(`Network status changed: ${wasOnline ? 'online' : 'offline'} -> ${isOnline ? 'online' : 'offline'}`);

      this.listeners.forEach(listener => {
        try {
          listener(isOnline, this.networkState);
        } catch (error) {
          console.error('Error in network change listener:', error);
        }
      });
    }
  }

  private static determineOnlineStatus(state: any): boolean {
    // Consider online if connected and either internet is reachable or reachability is unknown
    return state.isConnected && (state.isInternetReachable !== false);
  }

  static async getNetworkInfo(): Promise<{
    isOnline: boolean;
    connectionType: string;
    isExpensive: boolean;
    strength?: number;
    carrier?: string;
  }> {
    try {
      const state = await NetInfo.fetch();

      return {
        isOnline: this.determineOnlineStatus(state),
        connectionType: state.type || 'unknown',
        isExpensive: state.type === 'cellular',
        // @ts-ignore - These properties exist on some platforms
        strength: state.details?.strength,
        // @ts-ignore
        carrier: state.details?.carrierName,
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return {
        isOnline: false,
        connectionType: 'unknown',
        isExpensive: false,
      };
    }
  }

  static async shouldSyncData(): Promise<{
    shouldSync: boolean;
    reason?: string;
  }> {
    try {
      const isOnline = await this.isOnline();

      if (!isOnline) {
        return { shouldSync: false, reason: 'Device is offline' };
      }

      const isExpensive = this.isExpensiveConnection();

      // For expensive connections, only sync critical data
      if (isExpensive) {
        return {
          shouldSync: true, // Still sync, but caller can decide what to sync
          reason: 'Using cellular connection - limit sync to critical data'
        };
      }

      return { shouldSync: true };
    } catch (error) {
      console.error('Failed to determine sync policy:', error);
      return { shouldSync: false, reason: 'Unable to determine network status' };
    }
  }

  static cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.listeners.clear();
    this.isInitialized = false;
  }
}
