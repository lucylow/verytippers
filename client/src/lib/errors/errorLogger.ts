/**
 * Error Logger
 * Centralized error logging with support for external services
 */

import type { CategorizedError, ErrorContext } from "./errorTypes";

export interface ErrorLogEntry {
  category: string;
  message: string;
  severity: string;
  timestamp: string;
  url: string;
  userAgent: string;
  stack?: string;
  context?: ErrorContext;
  errorId?: string;
}

export interface ErrorReportingService {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
}

class ErrorLogger {
  private errorHistory: ErrorLogEntry[] = [];
  private maxHistorySize = 10;
  private reportingService: ErrorReportingService | null = null;

  /**
   * Initialize error reporting service (e.g., Sentry)
   */
  initReportingService(service: ErrorReportingService) {
    this.reportingService = service;
  }

  /**
   * Log error with comprehensive details
   */
  log(categorizedError: CategorizedError): void {
    const { category, message, originalError, severity, context } =
      categorizedError;

    const logEntry: ErrorLogEntry = {
      category,
      message,
      severity,
      timestamp: categorizedError.timestamp,
      url: typeof window !== "undefined" ? window.location.href : "",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      stack:
        originalError instanceof Error ? originalError.stack : undefined,
      context,
      errorId: this.generateErrorId(),
    };

    // Development logging
    if (import.meta.env.DEV) {
      console.error(`[${severity.toUpperCase()}] ${category}:`, {
        ...logEntry,
        originalError,
      });
    } else {
      // Production logging - only critical/high severity
      if (severity === "critical" || severity === "high") {
        console.error(`[${category}]:`, message, originalError);

        // Send to error reporting service
        if (this.reportingService && originalError instanceof Error) {
          try {
            this.reportingService.captureException(originalError, {
              tags: { category, severity },
              extra: {
                message,
                context,
                url: logEntry.url,
              },
            });
          } catch (reportingError) {
            console.warn("Failed to report error:", reportingError);
          }
        }
      }
    }

    // Store in session storage
    this.storeError(logEntry);
  }

  /**
   * Store error in session storage
   */
  private storeError(logEntry: ErrorLogEntry): void {
    try {
      if (typeof sessionStorage === "undefined") return;

      const history = this.getErrorHistory();
      history.push(logEntry);

      // Keep only last N errors
      const trimmedHistory = history.slice(-this.maxHistorySize);
      sessionStorage.setItem(
        "errorHistory",
        JSON.stringify(trimmedHistory)
      );
      this.errorHistory = trimmedHistory;
    } catch (storageError) {
      // Silently fail if storage is not available
      console.warn("Failed to store error history:", storageError);
    }
  }

  /**
   * Get error history from session storage
   */
  getErrorHistory(): ErrorLogEntry[] {
    if (this.errorHistory.length > 0) {
      return this.errorHistory;
    }

    try {
      if (typeof sessionStorage === "undefined") return [];

      const stored = sessionStorage.getItem("errorHistory");
      if (stored) {
        this.errorHistory = JSON.parse(stored);
        return this.errorHistory;
      }
    } catch (error) {
      console.warn("Failed to read error history:", error);
    }

    return [];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("errorHistory");
      }
      this.errorHistory = [];
    } catch (error) {
      console.warn("Failed to clear error history:", error);
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: ErrorLogEntry[];
  } {
    const history = this.getErrorHistory();

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    history.forEach((entry) => {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
    });

    return {
      total: history.length,
      byCategory,
      bySeverity,
      recent: history.slice(-5),
    };
  }
}

export const errorLogger = new ErrorLogger();

