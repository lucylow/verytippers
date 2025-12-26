/**
 * Error Types and Categories
 * Centralized error type definitions for consistent error handling
 */

export type ErrorCategory =
  | "NETWORK_ERROR"
  | "ROUTE_ERROR"
  | "WEB3_ERROR"
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "UNKNOWN_ERROR";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
  severity: ErrorSeverity;
  timestamp: string;
  context?: Record<string, unknown>;
  recoverable?: boolean;
  retryable?: boolean;
}

export interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error categorization with improved pattern matching
 */
export function categorizeError(
  error: unknown,
  context?: ErrorContext
): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();
  const errorName = error instanceof Error ? error.name : "Unknown";

  // Network errors
  if (
    errorString.includes("network") ||
    errorString.includes("fetch") ||
    errorString.includes("failed to fetch") ||
    errorString.includes("networkerror") ||
    errorString.includes("timeout") ||
    errorString.includes("connection") ||
    (error instanceof TypeError && error.message.includes("fetch")) ||
    errorName === "NetworkError"
  ) {
    return {
      category: "NETWORK_ERROR",
      message: "Network connection failed. Please check your internet connection.",
      originalError: error,
      severity: "high",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: true,
    };
  }

  // Rate limiting errors
  if (
    errorString.includes("rate limit") ||
    errorString.includes("too many requests") ||
    errorString.includes("429") ||
    errorString.includes("quota")
  ) {
    return {
      category: "RATE_LIMIT_ERROR",
      message: "Too many requests. Please wait a moment before trying again.",
      originalError: error,
      severity: "medium",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: true,
    };
  }

  // Authentication errors
  if (
    errorString.includes("unauthorized") ||
    errorString.includes("authentication") ||
    errorString.includes("401") ||
    errorString.includes("token") ||
    errorString.includes("expired")
  ) {
    return {
      category: "AUTH_ERROR",
      message: "Authentication failed. Please log in again.",
      originalError: error,
      severity: "high",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: false,
    };
  }

  // Permission errors
  if (
    errorString.includes("forbidden") ||
    errorString.includes("permission") ||
    errorString.includes("403") ||
    errorString.includes("access denied")
  ) {
    return {
      category: "PERMISSION_ERROR",
      message: "You don't have permission to perform this action.",
      originalError: error,
      severity: "medium",
      timestamp: new Date().toISOString(),
      context,
      recoverable: false,
      retryable: false,
    };
  }

  // Route/Navigation errors
  if (
    errorString.includes("route") ||
    errorString.includes("navigation") ||
    errorString.includes("cannot read properties") ||
    errorString.includes("404") ||
    errorString.includes("not found")
  ) {
    return {
      category: "ROUTE_ERROR",
      message: "Navigation error occurred. The page may not be available.",
      originalError: error,
      severity: "medium",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: false,
    };
  }

  // Web3/Wallet errors
  if (
    errorString.includes("wallet") ||
    errorString.includes("metamask") ||
    errorString.includes("ethereum") ||
    errorString.includes("web3") ||
    errorString.includes("user rejected") ||
    errorString.includes("user denied") ||
    errorString.includes("insufficient funds") ||
    errorString.includes("gas") ||
    errorString.includes("transaction")
  ) {
    return {
      category: "WEB3_ERROR",
      message: errorMessage || "Web3 wallet error occurred.",
      originalError: error,
      severity: "medium",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: true,
    };
  }

  // API errors
  if (
    errorString.includes("api") ||
    errorString.includes("http") ||
    errorString.includes("status") ||
    errorString.includes("server error") ||
    errorString.includes("500") ||
    errorString.includes("502") ||
    errorString.includes("503")
  ) {
    return {
      category: "API_ERROR",
      message: "Server error occurred. Please try again later.",
      originalError: error,
      severity: "high",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: true,
    };
  }

  // Validation errors
  if (
    errorString.includes("validation") ||
    errorString.includes("invalid") ||
    errorString.includes("required") ||
    errorString.includes("format") ||
    errorString.includes("type")
  ) {
    return {
      category: "VALIDATION_ERROR",
      message: errorMessage || "Invalid input provided.",
      originalError: error,
      severity: "low",
      timestamp: new Date().toISOString(),
      context,
      recoverable: true,
      retryable: false,
    };
  }

  // Unknown errors
  return {
    category: "UNKNOWN_ERROR",
    message: errorMessage || "An unexpected error occurred.",
    originalError: error,
    severity: "medium",
    timestamp: new Date().toISOString(),
    context,
    recoverable: false,
    retryable: false,
  };
}

