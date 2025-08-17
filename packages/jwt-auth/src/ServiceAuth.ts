import { CandlefishAuth } from './CandlefishAuth';
import { ServiceCredentials, TokenPayload } from './types';

export class ServiceAuth {
  private auth: CandlefishAuth;
  private credentials: ServiceCredentials;
  private serviceToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(auth: CandlefishAuth, credentials: ServiceCredentials) {
    this.auth = auth;
    this.credentials = credentials;
  }

  /**
   * Get or generate service token
   */
  async getServiceToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.serviceToken && Date.now() < this.tokenExpiry) {
      return this.serviceToken;
    }

    // Generate new service token
    const payload: TokenPayload = {
      sub: this.credentials.serviceId,
      type: 'service',
      scope: this.credentials.scope?.join(' ') || 'service:all'
    };

    this.serviceToken = await this.auth.signToken(payload);

    // Set expiry to 55 minutes (allowing 5 minute buffer before 1 hour expiry)
    this.tokenExpiry = Date.now() + (55 * 60 * 1000);

    return this.serviceToken;
  }

  /**
   * Make authenticated request to another service
   */
  async callService(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getServiceToken();

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Service-ID', this.credentials.serviceId);

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Make authenticated GET request
   */
  async get(url: string, options?: RequestInit): Promise<Response> {
    return this.callService(url, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * Make authenticated POST request
   */
  async post(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<Response> {
    return this.callService(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * Make authenticated PUT request
   */
  async put(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<Response> {
    return this.callService(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(url: string, options?: RequestInit): Promise<Response> {
    return this.callService(url, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * Make authenticated PATCH request
   */
  async patch(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<Response> {
    return this.callService(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * Verify incoming service token
   */
  async verifyServiceToken(token: string): Promise<TokenPayload> {
    const decoded = await this.auth.verifyToken(token);

    if (decoded.type !== 'service') {
      throw new Error('Invalid token type: expected service token');
    }

    return decoded;
  }

  /**
   * Create middleware for verifying service tokens
   */
  serviceMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const authHeader = req.headers.authorization;
        const serviceId = req.headers['x-service-id'];

        if (!authHeader) {
          return res.status(401).json({
            error: true,
            message: 'Service token required',
            code: 'NO_SERVICE_TOKEN'
          });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = await this.verifyServiceToken(token);

        // Verify service ID matches
        if (serviceId && decoded.sub !== serviceId) {
          return res.status(403).json({
            error: true,
            message: 'Service ID mismatch',
            code: 'SERVICE_ID_MISMATCH'
          });
        }

        req.service = decoded;
        next();
      } catch (error: any) {
        res.status(401).json({
          error: true,
          message: error.message,
          code: 'SERVICE_AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Clear cached token
   */
  clearCache(): void {
    this.serviceToken = null;
    this.tokenExpiry = 0;
  }
}
