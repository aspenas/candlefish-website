/**
 * Redis Stub for Build Time
 * Provides no-op implementations during build time
 */

export class RedisStub {
  async get(): Promise<null> {
    return null;
  }

  async set(): Promise<void> {
    // No-op
  }

  async setex(): Promise<void> {
    // No-op
  }

  async del(): Promise<void> {
    // No-op
  }

  async keys(): Promise<string[]> {
    return [];
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  pipeline() {
    return {
      get: () => this,
      set: () => this,
      setex: () => this,
      del: () => this,
      exec: async () => []
    };
  }

  on() {
    // No-op
  }

  get status() {
    return 'ready';
  }
}

export default RedisStub;
