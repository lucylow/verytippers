/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms before attempting to reset
  monitoringPeriod: number; // Time window for failure counting
  halfOpenMaxCalls: number; // Max calls in half-open state
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 60000, // 1 minute
  halfOpenMaxCalls: 3,
};

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenCalls = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly failures: number[] = []; // Track failure timestamps

  constructor(
    private name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check state before executing
    this.updateState();

    if (this.state === 'OPEN') {
      throw new Error(
        `Circuit breaker "${this.name}" is OPEN. Service unavailable.`
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState(): void {
    const now = Date.now();

    // Clean old failures outside monitoring period
    while (
      this.failures.length > 0 &&
      now - this.failures[0] > this.options.monitoringPeriod
    ) {
      this.failures.shift();
    }

    this.failureCount = this.failures.length;

    switch (this.state) {
      case 'CLOSED':
        if (this.failureCount >= this.options.failureThreshold) {
          this.state = 'OPEN';
          this.lastFailureTime = now;
          console.warn(
            `Circuit breaker "${this.name}" opened after ${this.failureCount} failures`
          );
        }
        break;

      case 'OPEN':
        if (
          this.lastFailureTime &&
          now - this.lastFailureTime >= this.options.resetTimeout
        ) {
          this.state = 'HALF_OPEN';
          this.halfOpenCalls = 0;
          console.info(`Circuit breaker "${this.name}" moved to HALF_OPEN`);
        }
        break;

      case 'HALF_OPEN':
        if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
          // If we've made max calls in half-open and still failing, reopen
          if (this.failureCount > 0) {
            this.state = 'OPEN';
            this.lastFailureTime = now;
            console.warn(
              `Circuit breaker "${this.name}" reopened after ${this.halfOpenCalls} calls`
            );
          }
        }
        break;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      // Successful call in half-open state, close the circuit
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.failures.length = 0;
      this.lastFailureTime = null;
      this.halfOpenCalls = 0;
      console.info(`Circuit breaker "${this.name}" closed after successful call`);
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success
      this.failureCount = 0;
      this.failures.length = 0;
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      // Failed in half-open, immediately reopen
      this.state = 'OPEN';
      console.warn(
        `Circuit breaker "${this.name}" reopened after failure in HALF_OPEN state`
      );
    }
  }

  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  getStats() {
    this.updateState();
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.failures.length = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    console.info(`Circuit breaker "${this.name}" manually reset`);
  }
}

// Circuit breaker instances for different services
export const circuitBreakers = {
  verychat: new CircuitBreaker('verychat-api', {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  }),
  blockchain: new CircuitBreaker('blockchain-rpc', {
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
  }),
  ipfs: new CircuitBreaker('ipfs-service', {
    failureThreshold: 5,
    resetTimeout: 30000,
  }),
  database: new CircuitBreaker('database', {
    failureThreshold: 10,
    resetTimeout: 10000, // 10 seconds
  }),
};

