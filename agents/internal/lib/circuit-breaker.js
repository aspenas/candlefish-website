/**
 * Circuit Breaker for NANDA agent resilience
 * Prevents cascading failures between agents
 */

const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.threshold = options.threshold || 5; // failures before opening
    this.timeout = options.timeout || 60000; // time before half-open (ms)
    this.resetTimeout = options.resetTimeout || 120000; // full reset time

    // State
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    // Metrics
    this.metrics = {
      total_requests: 0,
      failed_requests: 0,
      successful_requests: 0,
      circuit_opens: 0,
      average_response_time: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    this.metrics.total_requests++;

    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open, use fallback or throw
        this.emit('rejected', { state: this.state });

        if (fallback) {
          return await this.executeFallback(fallback);
        }

        throw new Error(`Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
      } else {
        // Try half-open
        this.state = 'HALF_OPEN';
        this.emit('state_change', { from: 'OPEN', to: 'HALF_OPEN' });
      }
    }

    try {
      const startTime = Date.now();
      const result = await fn();
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.successful_requests++;
      this.metrics.average_response_time =
        (this.metrics.average_response_time + responseTime) / 2;

      this.onSuccess();
      return result;

    } catch (error) {
      this.metrics.failed_requests++;
      this.onFailure(error);

      if (fallback) {
        return await this.executeFallback(fallback);
      }

      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;

      // Need multiple successes to fully close
      if (this.successes >= 3) {
        this.state = 'CLOSED';
        this.successes = 0;
        this.emit('state_change', { from: 'HALF_OPEN', to: 'CLOSED' });
        console.log('[CircuitBreaker] Circuit CLOSED after successful recovery');
      }
    }
  }

  onFailure(error) {
    this.failures++;
    this.lastFailureTime = Date.now();

    this.emit('failure', {
      error: error.message,
      failures: this.failures,
      threshold: this.threshold
    });

    if (this.state === 'HALF_OPEN') {
      // Immediately open on failure in half-open state
      this.openCircuit();
    } else if (this.failures >= this.threshold) {
      this.openCircuit();
    }
  }

  openCircuit() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.timeout;
    this.metrics.circuit_opens++;

    this.emit('state_change', { from: this.state, to: 'OPEN' });
    console.log(`[CircuitBreaker] Circuit OPEN. Will retry at ${new Date(this.nextAttempt).toISOString()}`);

    // Schedule automatic half-open attempt
    setTimeout(() => {
      if (this.state === 'OPEN') {
        this.state = 'HALF_OPEN';
        this.emit('state_change', { from: 'OPEN', to: 'HALF_OPEN' });
      }
    }, this.timeout);
  }

  async executeFallback(fallback) {
    try {
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return fallback;
    } catch (error) {
      console.error('[CircuitBreaker] Fallback also failed:', error);
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;

    this.emit('reset');
    console.log('[CircuitBreaker] Manually reset to CLOSED state');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      metrics: this.metrics
    };
  }

  /**
   * Health check
   */
  isHealthy() {
    return this.state === 'CLOSED' ||
           (this.state === 'HALF_OPEN' && this.successes > 0);
  }
}

/**
 * Circuit Breaker Manager for multiple endpoints
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for an endpoint
   */
  getBreaker(endpoint, options = {}) {
    if (!this.breakers.has(endpoint)) {
      const breaker = new CircuitBreaker(options);

      // Log state changes
      breaker.on('state_change', ({ from, to }) => {
        console.log(`[CircuitBreaker] ${endpoint}: ${from} -> ${to}`);
      });

      this.breakers.set(endpoint, breaker);
    }

    return this.breakers.get(endpoint);
  }

  /**
   * Execute with circuit breaker for specific endpoint
   */
  async execute(endpoint, fn, fallback = null) {
    const breaker = this.getBreaker(endpoint);
    return await breaker.execute(fn, fallback);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus() {
    const status = {};

    for (const [endpoint, breaker] of this.breakers) {
      status[endpoint] = breaker.getStatus();
    }

    return status;
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(endpoint) {
    const breaker = this.breakers.get(endpoint);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager
};
