/**
 * Security Utilities
 * Input sanitization, XSS prevention, and security helpers
 */

import { sanitizeString } from "./validation";

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== "string") return "";

  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  if (typeof text !== "string") return "";

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Sanitize user input for safe display
 */
export function sanitizeUserInput(input: unknown): string {
  if (input === null || input === undefined) return "";

  if (typeof input === "string") {
    return sanitizeString(escapeHTML(input));
  }

  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }

  // For objects, stringify and sanitize
  try {
    const stringified = JSON.stringify(input);
    return sanitizeString(escapeHTML(stringified));
  } catch {
    return "";
  }
}

/**
 * Content Security Policy helper
 */
export function createCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string, allowedProtocols = ["http:", "https:"]): string | null {
  if (typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);

    // Check if protocol is allowed
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return null;
    }

    // Return sanitized URL
    return urlObj.href;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Hash string (simple implementation, use proper hashing in production)
 */
export async function hashString(input: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback for environments without crypto.subtle
    return btoa(input);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if string contains potentially dangerous content
 */
export function containsDangerousContent(text: string): boolean {
  if (typeof text !== "string") return false;

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(text));
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeUserInput(sanitized[key] as string) as T[Extract<keyof T, string>];
    } else if (
      typeof sanitized[key] === "object" &&
      sanitized[key] !== null &&
      !Array.isArray(sanitized[key])
    ) {
      sanitized[key] = sanitizeObject(
        sanitized[key] as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = (sanitized[key] as unknown[]).map((item) =>
        typeof item === "string"
          ? sanitizeUserInput(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
}

/**
 * Rate limiter for API calls (client-side)
 */
export class ClientRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> =
    new Map();
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
    const record = this.requests.get(key);

    if (!record || now > record.resetAt) {
      // Reset window
      this.requests.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNext(key: string): number {
    const record = this.requests.get(key);
    if (!record) return 0;

    const timeRemaining = record.resetAt - Date.now();
    return Math.max(0, timeRemaining);
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }
}

