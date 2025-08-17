// Stub for Redis client on the client side
export class Redis {
  constructor(...args: any[]) {}
  async get(key: string): Promise<string | null> { return null; }
  async set(key: string, value: string, ...args: any[]): Promise<string> { return 'OK'; }
  async del(key: string): Promise<number> { return 0; }
  async exists(key: string): Promise<number> { return 0; }
  async expire(key: string, seconds: number): Promise<number> { return 0; }
  async ttl(key: string): Promise<number> { return -1; }
  async flushall(): Promise<string> { return 'OK'; }
  async ping(): Promise<string> { return 'PONG'; }
  on(event: string, callback: Function): void {}
  disconnect(): void {}
}

export default Redis;
