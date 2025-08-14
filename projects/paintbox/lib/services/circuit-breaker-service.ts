/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for fault tolerance
 */

export interface CircuitBreaker {
  id: string;
  name: string;
  service: string;
  state: 'closed' | 'open' | 'half-open';
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttempt?: Date;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  averageResponseTime: number;
}

export class CircuitBreakerService {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    openCircuits: 0,
    halfOpenCircuits: 0,
    closedCircuits: 0,
    averageResponseTime: 0
  };

  createBreaker(config: {
    name: string;
    service: string;
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
  }): CircuitBreaker {
    const breaker: CircuitBreaker = {
      id: `cb-${Date.now()}`,
      name: config.name,
      service: config.service,
      state: 'closed',
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000,
      failureCount: 0,
      successCount: 0
    };

    this.breakers.set(breaker.id, breaker);
    this.updateMetrics();
    return breaker;
  }

  getBreaker(id: string): CircuitBreaker | undefined {
    return this.breakers.get(id);
  }

  getAllBreakers(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  updateBreaker(id: string, updates: Partial<CircuitBreaker>): CircuitBreaker | undefined {
    const breaker = this.breakers.get(id);
    if (breaker) {
      Object.assign(breaker, updates);
      this.updateMetrics();
    }
    return breaker;
  }

  deleteBreaker(id: string): boolean {
    const result = this.breakers.delete(id);
    this.updateMetrics();
    return result;
  }

  async testBreaker(id: string): Promise<boolean> {
    const breaker = this.breakers.get(id);
    if (!breaker) return false;

    // Simulate test
    const success = Math.random() > 0.3;

    if (success) {
      this.recordSuccess(id);
    } else {
      this.recordFailure(id);
    }

    return success;
  }

  recordSuccess(id: string): void {
    const breaker = this.breakers.get(id);
    if (!breaker) return;

    breaker.successCount++;
    breaker.lastSuccessTime = new Date();
    this.metrics.successfulRequests++;
    this.metrics.totalRequests++;

    // State transitions
    if (breaker.state === 'half-open' && breaker.successCount >= breaker.successThreshold) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.successCount = 0;
    }

    this.updateMetrics();
  }

  recordFailure(id: string): void {
    const breaker = this.breakers.get(id);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();
    this.metrics.failedRequests++;
    this.metrics.totalRequests++;

    // State transitions
    if (breaker.state === 'closed' && breaker.failureCount >= breaker.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttempt = new Date(Date.now() + breaker.timeout);
    } else if (breaker.state === 'half-open') {
      breaker.state = 'open';
      breaker.nextAttempt = new Date(Date.now() + breaker.timeout);
      breaker.successCount = 0;
    }

    this.updateMetrics();
  }

  resetBreaker(id: string): void {
    const breaker = this.breakers.get(id);
    if (!breaker) return;

    breaker.state = 'closed';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.lastFailureTime = undefined;
    breaker.lastSuccessTime = undefined;
    breaker.nextAttempt = undefined;

    this.updateMetrics();
  }

  tryRequest(id: string): boolean {
    const breaker = this.breakers.get(id);
    if (!breaker) return false;

    if (breaker.state === 'closed') {
      return true;
    }

    if (breaker.state === 'open') {
      if (breaker.nextAttempt && new Date() >= breaker.nextAttempt) {
        breaker.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open state
    return true;
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(): void {
    const breakers = Array.from(this.breakers.values());

    this.metrics.openCircuits = breakers.filter(b => b.state === 'open').length;
    this.metrics.halfOpenCircuits = breakers.filter(b => b.state === 'half-open').length;
    this.metrics.closedCircuits = breakers.filter(b => b.state === 'closed').length;
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; metrics: CircuitBreakerMetrics }> {
    return {
      status: 'healthy',
      metrics: this.getMetrics()
    };
  }
}

// Export singleton instance
export const circuitBreakerService = new CircuitBreakerService();
