/**
 * @fileoverview Candlefish Claude Config SDK Client
 * @version 2.0.0
 * @author Candlefish AI <https://candlefish.ai>
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  ConfigProfile,
  ConfigValidationError,
  WebSocketEvent,
  ServiceTier,
  AuthMethod,
  AuthCredentials,
  ClientConfig,
  RetryConfig,
  ListProfilesQuery,
  ApiResponse,
  WebSocketEventHandlers,
  WebSocketState
} from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<ClientConfig> = {
  baseURL: 'https://api.candlefish.ai/v2.0',
  tier: ServiceTier.Pro,
  timeout: 30000,
  retry: {
    max_attempts: 3,
    base_delay_ms: 1000,
    max_delay_ms: 5000,
    backoff_multiplier: 2
  },
  headers: {}
};

/**
 * Custom error class for SDK-specific errors
 */
export class CandlefishConfigError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string[],
    public statusCode?: number
  ) {
    super(message);
    this.name = 'CandlefishConfigError';
  }
}

/**
 * Main SDK client class
 */
export class CandlefishConfigClient {
  private client: AxiosInstance;
  private config: Required<ClientConfig>;
  private credentials?: AuthCredentials;
  private webSocket?: WebSocket;
  private wsState: WebSocketState = WebSocketState.Closed;
  private wsReconnectAttempts = 0;
  private readonly maxWsReconnectAttempts = 5;

  constructor(
    credentials: AuthCredentials,
    config: ClientConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.credentials = credentials;

    // Create Axios instance
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Tier': this.config.tier,
        'User-Agent': '@candlefish/claude-config/2.0.0',
        ...this.config.headers
      }
    });

    // Setup request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      const authHeader = this.getAuthHeader();
      if (authHeader) {
        config.headers.Authorization = authHeader;
      }
      return config;
    });

    // Setup response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleResponseError(error)
    );
  }

  /**
   * Get appropriate authorization header based on credentials
   */
  private getAuthHeader(): string | undefined {
    if (!this.credentials) return undefined;

    switch (this.credentials.method) {
      case AuthMethod.APIKey:
        return this.credentials.apiKey;
      case AuthMethod.Bearer:
      case AuthMethod.OAuth2:
        return `Bearer ${this.credentials.accessToken}`;
      default:
        return undefined;
    }
  }

  /**
   * Handle response errors with retries and custom error types
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    if (error.response?.data && typeof error.response.data === 'object') {
      const errorData = error.response.data as ConfigValidationError;
      throw new CandlefishConfigError(
        errorData.message || 'API Error',
        errorData.code,
        errorData.details,
        error.response.status
      );
    }

    throw new CandlefishConfigError(
      error.message || 'Network Error',
      'NETWORK_ERROR',
      undefined,
      error.response?.status
    );
  }

  /**
   * Implement exponential backoff retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retryConfig = this.config.retry
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.max_attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.max_attempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.base_delay_ms * Math.pow(retryConfig.backoff_multiplier, attempt - 1),
          retryConfig.max_delay_ms
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * List all configuration profiles
   */
  async listProfiles(query: ListProfilesQuery = {}): Promise<ConfigProfile[]> {
    return this.withRetry(async () => {
      const response: AxiosResponse<ConfigProfile[]> = await this.client.get('/config/profiles', {
        params: query
      });
      return response.data;
    });
  }

  /**
   * Create a new configuration profile
   */
  async createProfile(profile: Omit<ConfigProfile, 'profile_id'>): Promise<ConfigProfile> {
    return this.withRetry(async () => {
      const response: AxiosResponse<ConfigProfile> = await this.client.post('/config/profiles', profile);
      return response.data;
    });
  }

  /**
   * Get a specific configuration profile
   */
  async getProfile(profileId: string): Promise<ConfigProfile> {
    if (!profileId) {
      throw new CandlefishConfigError('Profile ID is required', 'INVALID_PARAMETER');
    }

    return this.withRetry(async () => {
      const response: AxiosResponse<ConfigProfile> = await this.client.get(`/config/profiles/${profileId}`);
      return response.data;
    });
  }

  /**
   * Update an existing configuration profile
   */
  async updateProfile(profile: ConfigProfile): Promise<ConfigProfile> {
    if (!profile.profile_id) {
      throw new CandlefishConfigError('Profile must have a profile_id for updates', 'INVALID_PARAMETER');
    }

    return this.withRetry(async () => {
      const response: AxiosResponse<ConfigProfile> = await this.client.put(
        `/config/profiles/${profile.profile_id}`,
        profile
      );
      return response.data;
    });
  }

  /**
   * Delete a configuration profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    if (!profileId) {
      throw new CandlefishConfigError('Profile ID is required', 'INVALID_PARAMETER');
    }

    return this.withRetry(async () => {
      await this.client.delete(`/config/profiles/${profileId}`);
    });
  }

  /**
   * Connect to WebSocket for real-time configuration events
   */
  connectToConfigEvents(handlers: WebSocketEventHandlers): WebSocket {
    if (this.webSocket && this.wsState !== WebSocketState.Closed) {
      this.webSocket.close();
    }

    const wsUrl = this.config.baseURL.replace(/^http/, 'ws') + '/ws/config-events';
    this.webSocket = new WebSocket(wsUrl);
    this.wsState = WebSocketState.Connecting;

    this.webSocket.onopen = (event) => {
      this.wsState = WebSocketState.Open;
      this.wsReconnectAttempts = 0;

      // Authenticate WebSocket connection
      const authData = {
        type: 'authenticate',
        token: this.getAuthHeader()
      };
      this.webSocket!.send(JSON.stringify(authData));

      handlers.onOpen?.(event);
    };

    this.webSocket.onmessage = (event) => {
      try {
        const wsEvent: WebSocketEvent = JSON.parse(event.data);
        handlers.onMessage?.(wsEvent);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.webSocket.onclose = (event) => {
      this.wsState = WebSocketState.Closed;
      handlers.onClose?.(event);

      // Attempt reconnection for unexpected closures
      if (!event.wasClean && this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
        this.wsReconnectAttempts++;
        const delay = Math.pow(2, this.wsReconnectAttempts) * 1000; // Exponential backoff
        setTimeout(() => {
          console.log(`WebSocket reconnection attempt ${this.wsReconnectAttempts}/${this.maxWsReconnectAttempts}`);
          this.connectToConfigEvents(handlers);
        }, delay);
      }
    };

    this.webSocket.onerror = (event) => {
      console.error('WebSocket error:', event);
      handlers.onError?.(event);
    };

    return this.webSocket;
  }

  /**
   * Disconnect WebSocket connection
   */
  disconnectWebSocket(): void {
    if (this.webSocket) {
      this.wsState = WebSocketState.Closing;
      this.webSocket.close(1000, 'Client disconnect');
      this.webSocket = undefined;
    }
  }

  /**
   * Get current WebSocket connection state
   */
  getWebSocketState(): WebSocketState {
    return this.wsState;
  }

  /**
   * Update client credentials (useful for token refresh)
   */
  updateCredentials(credentials: AuthCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Check if credentials are expired (for OAuth2)
   */
  areCredentialsExpired(): boolean {
    if (!this.credentials?.expiresAt) return false;
    return Date.now() >= this.credentials.expiresAt;
  }

  /**
   * Refresh OAuth2 token (if refresh token is available)
   */
  async refreshToken(): Promise<AuthCredentials> {
    if (!this.credentials?.refreshToken) {
      throw new CandlefishConfigError('No refresh token available', 'NO_REFRESH_TOKEN');
    }

    const response = await this.client.post('/auth/refresh', {
      refresh_token: this.credentials.refreshToken
    });

    const newCredentials: AuthCredentials = {
      method: AuthMethod.OAuth2,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || this.credentials.refreshToken,
      expiresAt: Date.now() + (response.data.expires_in * 1000)
    };

    this.updateCredentials(newCredentials);
    return newCredentials;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get API version information
   */
  async getVersion(): Promise<{ version: string; build: string }> {
    const response = await this.client.get('/version');
    return response.data;
  }

  /**
   * Cleanup resources when client is no longer needed
   */
  destroy(): void {
    this.disconnectWebSocket();
  }
}

/**
 * Factory function for creating a client with API key authentication
 */
export function createClientWithApiKey(
  apiKey: string,
  config: ClientConfig = {}
): CandlefishConfigClient {
  return new CandlefishConfigClient(
    { method: AuthMethod.APIKey, apiKey },
    config
  );
}

/**
 * Factory function for creating a client with OAuth2 authentication
 */
export function createClientWithOAuth2(
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number,
  config: ClientConfig = {}
): CandlefishConfigClient {
  return new CandlefishConfigClient(
    {
      method: AuthMethod.OAuth2,
      accessToken,
      refreshToken,
      expiresAt
    },
    config
  );
}

/**
 * Export the main client class as default
 */
export default CandlefishConfigClient;

/**
 * Re-export all types for convenience
 */
export * from '../types';