/**
 * Error Recovery Strategies
 * Handles automatic recovery from different error types
 */

import type { CategorizedError } from "./errorTypes";
import { toast } from "sonner";

export interface RecoveryStrategy {
  canRecover: (error: CategorizedError) => boolean;
  recover: (error: CategorizedError) => Promise<boolean>;
}

/**
 * Network error recovery - check connectivity and retry
 */
class NetworkRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: CategorizedError): boolean {
    return error.category === "NETWORK_ERROR" && error.recoverable === true;
  }

  async recover(error: CategorizedError): Promise<boolean> {
    // Check if online
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You are offline. Please check your internet connection.", {
        duration: 8000,
      });
      return false;
    }

    // Could trigger connectivity check here
    // For now, return true to indicate recovery is possible
    return true;
  }
}

/**
 * Route error recovery - navigate to safe route
 */
class RouteRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: CategorizedError): boolean {
    return error.category === "ROUTE_ERROR" && error.recoverable === true;
  }

  async recover(error: CategorizedError): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;

      const currentPath = window.location.pathname;
      const validRoutes = ["/", "/dao", "/404"];

      if (!validRoutes.includes(currentPath)) {
        window.history.replaceState(null, "", "/");
        // Optionally reload if needed
        // window.location.reload();
        return true;
      }
    } catch (recoveryError) {
      console.error("Failed to recover from route error:", recoveryError);
      return false;
    }

    return false;
  }
}

/**
 * Auth error recovery - redirect to login
 */
class AuthRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: CategorizedError): boolean {
    return error.category === "AUTH_ERROR" && error.recoverable === true;
  }

  async recover(error: CategorizedError): Promise<boolean> {
    // In a real app, you might redirect to login
    // For now, just show a message
    toast.error("Please log in again to continue.", {
      duration: 5000,
      action: {
        label: "Reload",
        onClick: () => window.location.reload(),
      },
    });
    return false;
  }
}

/**
 * Rate limit recovery - wait and retry
 */
class RateLimitRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: CategorizedError): boolean {
    return error.category === "RATE_LIMIT_ERROR" && error.recoverable === true;
  }

  async recover(error: CategorizedError): Promise<boolean> {
    toast.error("Too many requests. Please wait a moment.", {
      duration: 5000,
    });
    // Could implement exponential backoff here
    return true;
  }
}

/**
 * Error Recovery Manager
 */
class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    this.strategies = [
      new NetworkRecoveryStrategy(),
      new RouteRecoveryStrategy(),
      new AuthRecoveryStrategy(),
      new RateLimitRecoveryStrategy(),
    ];
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: CategorizedError): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            return true;
          }
        } catch (recoveryError) {
          console.error("Recovery strategy failed:", recoveryError);
        }
      }
    }

    return false;
  }

  /**
   * Add custom recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }
}

export const errorRecovery = new ErrorRecoveryManager();

