/**
 * JWT Authentication Client for Paintbox
 * Integrates @candlefish/jwt-auth package with the frontend
 */

import { CandlefishAuth, TokenPayload } from '@candlefish/jwt-auth';

interface AuthConfig {
  authServiceUrl: string;
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  organizationSlug?: string;
}

export class JWTAuthClient {
  private jwtAuth: CandlefishAuth;
  private config: AuthConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: AuthConfig) {
    this.config = config;

    // Initialize the JWT auth library with JWKS for token verification
    this.jwtAuth = new CandlefishAuth({
      jwksUrl: config.jwksUrl || `${config.authServiceUrl}/.well-known/jwks.json`,
      issuer: config.issuer || 'candlefish-auth',
      audience: config.audience || 'candlefish-api',
      cacheTimeout: 600, // 10 minutes
    });

    // Load tokens from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authServiceUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Login failed');
    }

    const data = await response.json();
    const tokens = data.data.tokens;

    // Store tokens
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    return tokens;
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authServiceUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Registration failed');
    }

    const data = await response.json();
    const tokens = data.data.tokens;

    // Store tokens
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    return tokens;
  }

  /**
   * Refresh the access token
   */
  async refresh(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.config.authServiceUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      // Clear tokens on refresh failure
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const tokens = data.data;

    // Update tokens
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }

    return tokens;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await fetch(`${this.config.authServiceUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    this.clearTokens();
  }

  /**
   * Verify the current access token
   */
  async verifyToken(): Promise<TokenPayload | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      return await this.jwtAuth.verifyToken(this.accessToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Make an authenticated API request
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure we have a valid token
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${this.accessToken}`,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized, try to refresh token once
    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refresh();

        // Retry with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      } catch (error) {
        // Refresh failed, clear tokens
        this.clearTokens();
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
}

// Create a singleton instance
const authConfig: AuthConfig = {
  authServiceUrl: process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001',
  jwksUrl: process.env.NEXT_PUBLIC_JWKS_URL,
  issuer: process.env.NEXT_PUBLIC_JWT_ISSUER || 'candlefish-auth',
  audience: process.env.NEXT_PUBLIC_JWT_AUDIENCE || 'candlefish-api',
};

export const jwtAuthClient = new JWTAuthClient(authConfig);

// Export types for use in other files
export type { TokenResponse, LoginCredentials, RegisterData, TokenPayload };
