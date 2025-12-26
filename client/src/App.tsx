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
    });
  } else {
    // In production, only log critical/high severity errors
    if (severity === "critical" || severity === "high") {
      console.error(`[${category}]:`, message, originalError);
      // Here you could send to error reporting service (e.g., Sentry)
      // Example: Sentry.captureException(originalError, { tags: { category, severity } });
    }
  }
}

function Router() {
  // Enhanced global error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault(); // Prevent default browser error handling
      
      const categorizedError = categorizeError(event.error || event.message);
      logError(categorizedError);

      // Only show toast for high/critical severity errors
      if (categorizedError.severity === "critical" || categorizedError.severity === "high") {
        toast.error(categorizedError.message, {
          duration: 5000,
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault(); // Prevent default browser error handling
      
      const categorizedError = categorizeError(event.reason);
      logError(categorizedError);

      // Show toast for promise rejections (they're usually important)
      toast.error(categorizedError.message, {
        duration: 5000,
      });
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
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleResourceError, true); // Use capture phase

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleResourceError, true);
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
