// Stub module for pg (PostgreSQL client)
// This is used during build when pg is not available client-side

export class Pool {
  constructor(config?: any) {
    console.warn('Using stub PostgreSQL Pool - server-side only');
  }

  async connect(): Promise<PoolClient> {
    throw new Error('PostgreSQL Pool is not available in client environment');
  }

  async query(text: string, params?: any[]): Promise<any> {
    throw new Error('PostgreSQL Pool is not available in client environment');
  }

  async end(): Promise<void> {
    throw new Error('PostgreSQL Pool is not available in client environment');
  }
}

export class PoolClient {
  async query(text: string, params?: any[]): Promise<any> {
    throw new Error('PostgreSQL PoolClient is not available in client environment');
  }

  async release(): Promise<void> {
    throw new Error('PostgreSQL PoolClient is not available in client environment');
  }
}

export interface PoolConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  min?: number;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: any;
}

console.warn('Using stub PostgreSQL client - only works in server environment');
