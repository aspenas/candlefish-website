import jwksClient from 'jwks-rsa';
import NodeCache from 'node-cache';

export class JWKSProvider {
  private client: jwksClient.JwksClient;
  private cache: NodeCache;

  constructor(jwksUri: string, cache?: NodeCache) {
    this.client = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });

    this.cache = cache || new NodeCache({
      stdTTL: 600,
      checkperiod: 120
    });
  }

  /**
   * Get signing key by kid
   */
  async getKey(kid: string): Promise<string> {
    const cacheKey = `jwks-key-${kid}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached as string;
    }

    try {
      const key = await this.client.getSigningKey(kid);
      const signingKey = key.getPublicKey();

      this.cache.set(cacheKey, signingKey);
      return signingKey;
    } catch (error: any) {
      throw new Error(`Failed to get signing key: ${error.message}`);
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<jwksClient.SigningKey[]> {
    const cacheKey = 'jwks-all-keys';
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached as jwksClient.SigningKey[];
    }

    try {
      // This is a workaround since jwks-rsa doesn't expose all keys directly
      // In production, you might want to fetch the JWKS endpoint directly
      const keys: jwksClient.SigningKey[] = [];
      // Implementation would fetch from the JWKS endpoint

      this.cache.set(cacheKey, keys);
      return keys;
    } catch (error: any) {
      throw new Error(`Failed to get all keys: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}
