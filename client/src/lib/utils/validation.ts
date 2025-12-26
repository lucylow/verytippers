/**
 * Validation Utilities
 * Input validation and sanitization functions
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, "") // Remove < and >
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  if (typeof address !== "string") return false;

  // Basic Ethereum address format: 0x followed by 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validate numeric input
 */
export function isValidNumber(
  value: unknown,
  min?: number,
  max?: number
): value is number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

/**
 * Validate string length
 */
export function isValidLength(
  value: string,
  min: number,
  max: number
): boolean {
  if (typeof value !== "string") return false;

  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Validate tip amount
 */
export function isValidTipAmount(amount: number | string): boolean {
  const numAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;

  if (!isValidNumber(numAmount, 0.0001, 1000000)) {
    return false;
  }

  // Check decimal places (max 18 for most tokens)
  const decimalPlaces = (numAmount.toString().split(".")[1] || "").length;
  return decimalPlaces <= 18;
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (typeof username !== "string") return false;

  // Username: 3-20 characters, alphanumeric and underscore
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNext(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    const timeUntilNext = this.windowMs - (Date.now() - oldestRequest);

    return Math.max(0, timeUntilNext);
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

