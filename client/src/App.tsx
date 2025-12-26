import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DAO from "./pages/DAO";
import { VoiceTippingButton } from "./components/VoiceTippingButton";

// Error categories for better error handling
type ErrorCategory = 
  | "NETWORK_ERROR"
  | "ROUTE_ERROR"
  | "WEB3_ERROR"
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

interface CategorizedError {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
  severity: "low" | "medium" | "high" | "critical";
}

function categorizeError(error: unknown): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Network errors
  if (
    errorString.includes("network") ||
    errorString.includes("fetch") ||
    errorString.includes("failed to fetch") ||
    errorString.includes("networkerror") ||
    (error instanceof TypeError && error.message.includes("fetch"))
  ) {
    return {
      category: "NETWORK_ERROR",
      message: "Network connection failed. Please check your internet connection.",
      originalError: error,
      severity: "high",
    };
  }

  // Route/Navigation errors
  if (
    errorString.includes("route") ||
    errorString.includes("navigation") ||
    errorString.includes("cannot read properties")
  ) {
    return {
      category: "ROUTE_ERROR",
      message: "Navigation error occurred. The page may not be available.",
      originalError: error,
      severity: "medium",
    };
  }

  // Web3/Wallet errors
  if (
    errorString.includes("wallet") ||
    errorString.includes("metamask") ||
    errorString.includes("ethereum") ||
    errorString.includes("user rejected") ||
    errorString.includes("user denied")
  ) {
    return {
      category: "WEB3_ERROR",
      message: errorMessage || "Web3 wallet error occurred.",
      originalError: error,
      severity: "medium",
    };
  }

  // API errors
  if (
    errorString.includes("api") ||
    errorString.includes("http") ||
    errorString.includes("status") ||
    errorString.includes("server error")
  ) {
    return {
      category: "API_ERROR",
      message: "Server error occurred. Please try again later.",
      originalError: error,
      severity: "high",
    };
  }

  // Validation errors
  if (
    errorString.includes("validation") ||
    errorString.includes("invalid") ||
    errorString.includes("required")
  ) {
    return {
      category: "VALIDATION_ERROR",
      message: errorMessage || "Invalid input provided.",
      originalError: error,
      severity: "low",
    };
  }

  // Unknown errors
  return {
    category: "UNKNOWN_ERROR",
    message: errorMessage || "An unexpected error occurred.",
    originalError: error,
    severity: "medium",
  };
}

function logError(categorizedError: CategorizedError) {
  const { category, message, originalError, severity } = categorizedError;

  // In development, log all errors with details
  if (import.meta.env.DEV) {
    console.error(`[${severity.toUpperCase()}] ${category}:`, {
      message,
      originalError,
      stack: originalError instanceof Error ? originalError.stack : undefined,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  } else {
    // In production, only log critical/high severity errors
    if (severity === "critical" || severity === "high") {
      console.error(`[${category}]:`, message, originalError);
      // Here you could send to error reporting service (e.g., Sentry)
      // Example: Sentry.captureException(originalError, { tags: { category, severity } });
    }
  }

  // Store error in sessionStorage for error reporting (last 10 errors)
  try {
    const errorHistory = JSON.parse(sessionStorage.getItem("errorHistory") || "[]");
    errorHistory.push({
      category,
      message,
      severity,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
    
    // Keep only last 10 errors
    const trimmedHistory = errorHistory.slice(-10);
    sessionStorage.setItem("errorHistory", JSON.stringify(trimmedHistory));
  } catch (storageError) {
    // Silently fail if storage is not available (e.g., private browsing)
    console.warn("Failed to store error history:", storageError);
  }
}

// Retry configuration for failed operations
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

// Utility function to retry failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < config.maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, error);
        }
        
        const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Safe async wrapper that catches and handles errors
export async function safeAsync<T>(
  operation: () => Promise<T>,
  onError?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    if (onError) {
      onError(error);
    } else {
      console.error("Unhandled error in safeAsync:", error);
    }
    return null;
  }
}

// Error recovery strategies
function attemptErrorRecovery(error: CategorizedError): boolean {
  try {
    // Network errors: try to check connectivity
    if (error.category === "NETWORK_ERROR") {
      if (navigator.onLine === false) {
        toast.error("You are offline. Please check your internet connection.", {
          duration: 8000,
        });
        return false;
      }
      // Could trigger a connectivity check here
      return true;
    }

    // Route errors: try to navigate to a safe route
    if (error.category === "ROUTE_ERROR") {
      try {
        if (window.location.pathname !== "/") {
          window.history.replaceState(null, "", "/");
          window.location.reload();
          return true;
        }
      } catch (navError) {
        console.error("Failed to recover from route error:", navError);
      }
      return false;
    }

    // API errors: could implement exponential backoff retry
    if (error.category === "API_ERROR") {
      // Recovery handled by retry mechanism
      return true;
    }

    return false;
  } catch (recoveryError) {
    console.error("Error recovery attempt failed:", recoveryError);
    return false;
  }
}

function Router() {
  // Enhanced global error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault(); // Prevent default browser error handling
      
      const categorizedError = categorizeError(event.error || event.message);
      logError(categorizedError);

      // Attempt recovery
      const recovered = attemptErrorRecovery(categorizedError);

      // Only show toast for high/critical severity errors or if recovery failed
      if (!recovered && (categorizedError.severity === "critical" || categorizedError.severity === "high")) {
        toast.error(categorizedError.message, {
          duration: 5000,
          action: {
            label: "Retry",
            onClick: () => {
              // Could implement retry logic here
              window.location.reload();
            },
          },
        });
      } else if (categorizedError.severity === "critical") {
        toast.error(categorizedError.message, {
          duration: 8000,
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault(); // Prevent default browser error handling
      
      const categorizedError = categorizeError(event.reason);
      logError(categorizedError);

      // Attempt recovery for promise rejections
      const recovered = attemptErrorRecovery(categorizedError);

      // Show toast for promise rejections (they're usually important)
      if (!recovered) {
        toast.error(categorizedError.message, {
          duration: 5000,
          action: categorizedError.category === "NETWORK_ERROR" || categorizedError.category === "API_ERROR" ? {
            label: "Retry",
            onClick: () => {
              // Could implement specific retry logic based on the rejected promise
              window.location.reload();
            },
          } : undefined,
        });
      }
    };

    // Resource loading errors (images, scripts, etc.)
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === "IMG" || target.tagName === "SCRIPT")) {
        const categorizedError: CategorizedError = {
          category: "NETWORK_ERROR",
          message: `Failed to load resource: ${target.tagName.toLowerCase()}`,
          originalError: event,
          severity: "low",
        };
        logError(categorizedError);
        
        // For images, try to set a fallback
        if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
          target.onerror = null; // Prevent infinite loop
          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage%3C/text%3E%3C/svg%3E";
        }
      }
    };

    // Handle route transition errors
    const handlePopState = (event: PopStateEvent) => {
      try {
        // Validate route exists before navigation
        const currentPath = window.location.pathname;
        const validRoutes = ["/", "/dao", "/404"];
        
        if (!validRoutes.includes(currentPath) && currentPath !== "/") {
          // Invalid route, redirect to home
          window.history.replaceState(null, "", "/");
        }
      } catch (error) {
        const categorizedError = categorizeError(error);
        logError(categorizedError);
        toast.error("Navigation error occurred", {
          duration: 3000,
        });
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleResourceError, true); // Use capture phase
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      <Route path="/dao">
        <DAO />
      </Route>
      <Route path="/404">
        <NotFound />
      </Route>
      {/* Final fallback route */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <VoiceTippingButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
