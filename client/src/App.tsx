import { useEffect, useCallback, useMemo } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NetworkProvider } from "./contexts/NetworkContext";
import { WalletProvider } from "./contexts/WalletContext";
import Home from "./pages/Home";
import DAO from "./pages/DAO";
import TipDemo from "./pages/TipDemo";
import MockDemo from "./pages/MockDemo";
import NFTMarketplace from "./pages/NFTMarketplace";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import { VoiceTippingButton } from "./components/VoiceTippingButton";
import { NetworkSelector } from "./components/NetworkSelector";

// Import improved error handling utilities
import { categorizeError, type CategorizedError } from "@/lib/errors/errorTypes";
import { errorLogger } from "@/lib/errors/errorLogger";
import { errorRecovery } from "@/lib/errors/errorRecovery";

// Helper functions for backward compatibility
const logError = (error: CategorizedError) => errorLogger.log(error);
const attemptErrorRecovery = (error: CategorizedError) => errorRecovery.attemptRecovery(error);

// Re-export utilities for backward compatibility
export { retryOperation, safeAsync, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";
export type { RetryConfig } from "@/lib/utils/retry";

/**
 * Router component with enhanced error handling
 */
function Router() {
  // Memoize valid routes to avoid recreation on each render
  const validRoutes = useMemo(() => ["/", "/dao", "/demo", "/mock-demo", "/nft", "/404"], []);

  // Error handler with recovery
  const handleErrorWithRecovery = useCallback(
    async (categorizedError: CategorizedError) => {
      // Log the error
      errorLogger.log(categorizedError);

      // Attempt automatic recovery
      const recovered = await errorRecovery.attemptRecovery(categorizedError);

      // Show user-friendly error messages
      if (!recovered) {
        const shouldShowRetry =
          categorizedError.retryable &&
          (categorizedError.category === "NETWORK_ERROR" ||
            categorizedError.category === "API_ERROR");

        toast.error(categorizedError.message, {
          duration:
            categorizedError.severity === "critical" ? 8000 : 5000,
          action: shouldShowRetry
            ? {
                label: "Retry",
                onClick: () => {
                  window.location.reload();
                },
              }
            : undefined,
        });
      } else if (categorizedError.severity === "critical") {
        // Still show critical errors even if recovered
        toast.error(categorizedError.message, {
          duration: 8000,
        });
      }
    },
    []
  );

  // Global error handler
  const handleError = useCallback(
    (event: ErrorEvent) => {
      event.preventDefault();

      const context = {
        route: window.location.pathname,
        action: "global_error",
      };

      const categorizedError = categorizeError(
        event.error || event.message,
        context
      );

      handleErrorWithRecovery(categorizedError);
    },
    [handleErrorWithRecovery]
  );

  // Unhandled promise rejection handler
  const handleUnhandledRejection = useCallback(
    (event: PromiseRejectionEvent) => {
      event.preventDefault();

      const context = {
        route: window.location.pathname,
        action: "unhandled_rejection",
      };

      const categorizedError = categorizeError(event.reason, context);
      handleErrorWithRecovery(categorizedError);
    },
    [handleErrorWithRecovery]
  );

  // Resource loading error handler
  const handleResourceError = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      if (target.tagName === "IMG" || target.tagName === "SCRIPT") {
        const context = {
          route: window.location.pathname,
          action: "resource_load",
          metadata: {
            resourceType: target.tagName.toLowerCase(),
            src: (target as HTMLImageElement | HTMLScriptElement).src,
          },
        };

        const categorizedError = categorizeError(event, context);
        errorLogger.log(categorizedError);

        // Set fallback for images
        if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
          target.onerror = null; // Prevent infinite loop
          target.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EImage%3C/text%3E%3C/svg%3E";
        }
      }
    },
    []
  );

  // Route validation handler
  const handlePopState = useCallback(
    (event: PopStateEvent) => {
      try {
        const currentPath = window.location.pathname;

        if (!validRoutes.includes(currentPath) && currentPath !== "/") {
          // Invalid route, redirect to home
          window.history.replaceState(null, "", "/");
        }
      } catch (error) {
        const context = {
          route: window.location.pathname,
          action: "route_validation",
        };

        const categorizedError = categorizeError(error, context);
        errorLogger.log(categorizedError);
        toast.error("Navigation error occurred", {
          duration: 3000,
        });
      }
    },
    [validRoutes]
  );

  // Set up error handlers
  useEffect(() => {
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleResourceError, true); // Capture phase
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [handleError, handleUnhandledRejection, handleResourceError, handlePopState]);

  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      <Route path="/dao">
        <DAO />
      </Route>
      <Route path="/demo">
        <TipDemo />
      </Route>
      <Route path="/mock-demo">
        <MockDemo />
      </Route>
      <Route path="/nft">
        <NFTMarketplace />
      </Route>
      <Route path="/checkout/success">
        <CheckoutSuccess />
      </Route>
      <Route path="/checkout/cancel">
        <CheckoutCancel />
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
        <NetworkProvider>
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <div className="fixed top-4 right-4 z-50">
                <NetworkSelector />
              </div>
              <Router />
              <VoiceTippingButton />
            </TooltipProvider>
          </WalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
