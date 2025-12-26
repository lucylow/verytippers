import React, { useEffect, useCallback, useMemo } from "react";
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
import P2PDemo from "./pages/P2PDemo";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import TokenEcosystem from "./pages/TokenEcosystem";
import Verychain from "./pages/Verychain";
import { VoiceTippingButton } from "./components/VoiceTippingButton";
import { NetworkSelector } from "./components/NetworkSelector";
import MobileShell from "./components/MobileShell";
import { TransactionAnnouncerProvider } from "./components/accessibility";
import { ScrollToTop } from "./components/ScrollToTop";

// Import improved error handling utilities
import { categorizeError, type CategorizedError } from "@/lib/errors/errorTypes";
import { errorLogger } from "@/lib/errors/errorLogger";
import { errorRecovery } from "@/lib/errors/errorRecovery";
import { withTimeout, safeAsync } from "@/lib/utils/retry";

// Re-export utilities for backward compatibility
export { retryOperation, safeAsync, DEFAULT_RETRY_CONFIG } from "@/lib/utils/retry";
export type { RetryConfig } from "@/lib/utils/retry";

/**
 * Route-level error boundary wrapper
 */
function RouteErrorBoundary({ children, route }: { children: React.ReactNode; route: string }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        const context = {
          route,
          action: "route_error",
          metadata: {
            componentStack: errorInfo.componentStack,
          },
        };
        const categorizedError = categorizeError(error, context);
        errorLogger.log(categorizedError);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Router component with enhanced error handling
 */
function Router() {
  // Memoize valid routes to avoid recreation on each render
  const validRoutes = useMemo(() => ["/", "/dao", "/demo", "/mock-demo", "/nft", "/p2p", "/verychain", "/checkout/success", "/checkout/cancel", "/tokens", "/404"], []);

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

  // Route validation handler with enhanced error handling
  const handlePopState = useCallback(
    (event: PopStateEvent) => {
      safeAsync(
        async () => {
          const currentPath = window.location.pathname;

          if (!validRoutes.includes(currentPath) && currentPath !== "/") {
            // Invalid route, redirect to home
            try {
              window.history.replaceState(null, "", "/");
            } catch (navError) {
              // Fallback: try using window.location
              try {
                window.location.href = "/";
              } catch (fallbackError) {
                throw new Error("Failed to navigate to home page");
              }
            }
          }
        },
        (error) => {
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
      );
    },
    [validRoutes]
  );

  // Storage error handler (localStorage/sessionStorage)
  const handleStorageError = useCallback(() => {
    const context = {
      route: window.location.pathname,
      action: "storage_error",
    };

    const error = new Error("Storage operation failed. This may be due to private browsing mode or storage quota exceeded.");
    const categorizedError = categorizeError(error, context);
    errorLogger.log(categorizedError);
    
    // Only show toast for critical storage errors
    if (categorizedError.severity === "critical") {
      toast.error("Storage error: Some features may not work correctly", {
        duration: 5000,
      });
    }
  }, []);

  // Web3 provider error handler
  const handleWeb3ProviderError = useCallback(() => {
    const context = {
      route: window.location.pathname,
      action: "web3_provider_error",
    };

    const error = new Error("Web3 provider error detected");
    const categorizedError = categorizeError(error, context);
    errorLogger.log(categorizedError);
    
    toast.error("Wallet connection issue detected. Please check your wallet extension.", {
      duration: 6000,
    });
  }, []);

  // Network connectivity handler
  const handleOnline = useCallback(() => {
    toast.success("Connection restored", {
      duration: 3000,
    });
  }, []);

  const handleOffline = useCallback(() => {
    const context = {
      route: window.location.pathname,
      action: "network_offline",
    };

    const error = new Error("Network connection lost");
    const categorizedError = categorizeError(error, context);
    errorLogger.log(categorizedError);
    
    toast.error("No internet connection. Please check your network.", {
      duration: 5000,
    });
  }, []);

  // Component mounting error handler
  const handleComponentMountError = useCallback((error: Error, componentName: string) => {
    const context = {
      route: window.location.pathname,
      action: "component_mount_error",
      metadata: {
        componentName,
      },
    };

    const categorizedError = categorizeError(error, context);
    errorLogger.log(categorizedError);
  }, []);

  // Set up error handlers with comprehensive coverage
  useEffect(() => {
    // Global error handlers
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleResourceError, true); // Capture phase
    window.addEventListener("popstate", handlePopState);
    
    // Network connectivity handlers
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Storage error handlers (wrap storage operations)
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    
    Storage.prototype.setItem = function(key: string, value: string) {
      try {
        originalSetItem.call(this, key, value);
      } catch (error) {
        handleStorageError();
        throw error;
      }
    };
    
    Storage.prototype.getItem = function(key: string) {
      try {
        return originalGetItem.call(this, key);
      } catch (error) {
        handleStorageError();
        return null;
      }
    };
    
    Storage.prototype.removeItem = function(key: string) {
      try {
        originalRemoveItem.call(this, key);
      } catch (error) {
        handleStorageError();
      }
    };
    
    // Web3 provider error detection
    let web3ErrorHandler: ((error: unknown) => void) | undefined;
    let web3DisconnectHandler: (() => void) | undefined;
    
    if (typeof window !== "undefined" && window.ethereum && window.ethereum.on) {
      // Listen for provider errors
      web3ErrorHandler = (error: unknown) => {
        handleWeb3ProviderError();
        const context = {
          route: window.location.pathname,
          action: "web3_provider_error",
        };
        const categorizedError = categorizeError(error, context);
        errorLogger.log(categorizedError);
      };
      
      // Listen for provider disconnect
      web3DisconnectHandler = () => {
        handleWeb3ProviderError();
      };
      
      window.ethereum.on("error", web3ErrorHandler);
      window.ethereum.on("disconnect", web3DisconnectHandler);
    }

    return () => {
      // Cleanup global error handlers
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      // Restore original storage methods
      Storage.prototype.setItem = originalSetItem;
      Storage.prototype.getItem = originalGetItem;
      Storage.prototype.removeItem = originalRemoveItem;
      
      // Cleanup Web3 provider listeners
      if (typeof window !== "undefined" && window.ethereum && window.ethereum.removeListener) {
        if (web3ErrorHandler) {
          window.ethereum.removeListener("error", web3ErrorHandler);
        }
        if (web3DisconnectHandler) {
          window.ethereum.removeListener("disconnect", web3DisconnectHandler);
        }
      }
    };
  }, [
    handleError,
    handleUnhandledRejection,
    handleResourceError,
    handlePopState,
    handleStorageError,
    handleWeb3ProviderError,
    handleOnline,
    handleOffline,
  ]);

  // Wrap routes with error boundaries and error handling
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/">
        <RouteErrorBoundary route="/">
          <Home />
        </RouteErrorBoundary>
      </Route>
      <Route path="/dao">
        <RouteErrorBoundary route="/dao">
          <DAO />
        </RouteErrorBoundary>
      </Route>
      <Route path="/demo">
        <RouteErrorBoundary route="/demo">
          <TipDemo />
        </RouteErrorBoundary>
      </Route>
      <Route path="/mock-demo">
        <RouteErrorBoundary route="/mock-demo">
          <MockDemo />
        </RouteErrorBoundary>
      </Route>
      <Route path="/nft">
        <RouteErrorBoundary route="/nft">
          <NFTMarketplace />
        </RouteErrorBoundary>
      </Route>
      <Route path="/p2p">
        <RouteErrorBoundary route="/p2p">
          <P2PDemo />
        </RouteErrorBoundary>
      </Route>
      <Route path="/checkout/success">
        <RouteErrorBoundary route="/checkout/success">
          <CheckoutSuccess />
        </RouteErrorBoundary>
      </Route>
      <Route path="/checkout/cancel">
        <RouteErrorBoundary route="/checkout/cancel">
          <CheckoutCancel />
        </RouteErrorBoundary>
      </Route>
      <Route path="/tokens">
        <RouteErrorBoundary route="/tokens">
          <TokenEcosystem />
        </RouteErrorBoundary>
      </Route>
      <Route path="/verychain">
        <RouteErrorBoundary route="/verychain">
          <Verychain />
        </RouteErrorBoundary>
      </Route>
      <Route path="/404">
        <RouteErrorBoundary route="/404">
          <NotFound />
        </RouteErrorBoundary>
      </Route>
      {/* Final fallback route */}
      <Route>
        <RouteErrorBoundary route="unknown">
          <NotFound />
        </RouteErrorBoundary>
      </Route>
    </Switch>
    </>
  );
}

/**
 * Context provider wrapper with error boundary
 */
function ContextProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        const context = {
          route: window.location.pathname,
          action: "context_provider_error",
          metadata: {
            componentStack: errorInfo.componentStack,
          },
        };
        const categorizedError = categorizeError(error, context);
        errorLogger.log(categorizedError);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function App() {
  // Handle app-level initialization errors
  useEffect(() => {
    const handleAppInitError = (error: Error) => {
      const context = {
        route: window.location.pathname,
        action: "app_initialization_error",
      };
      const categorizedError = categorizeError(error, context);
      errorLogger.log(categorizedError);
      
      toast.error("Application initialization error. Please refresh the page.", {
        duration: 8000,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    };

    // Wrap app initialization in error handler
    try {
      // Check for critical browser features
      if (typeof window === "undefined") {
        throw new Error("Window object not available");
      }
      
      if (typeof document === "undefined") {
        throw new Error("Document object not available");
      }
    } catch (error) {
      handleAppInitError(error as Error);
    }
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        const context = {
          route: window.location.pathname,
          action: "app_root_error",
          metadata: {
            componentStack: errorInfo.componentStack,
          },
        };
        const categorizedError = categorizeError(error, context);
        errorLogger.log(categorizedError);
      }}
    >
      <ContextProviderWrapper>
        <ThemeProvider defaultTheme="light">
          <ContextProviderWrapper>
            <NetworkProvider>
              <ContextProviderWrapper>
                <WalletProvider>
                  <ContextProviderWrapper>
                    <TooltipProvider>
                      <Toaster />
                      <MobileShell>
                        <div className="fixed top-4 right-4 z-50">
                          <NetworkSelector />
                        </div>
                        <Router />
                        <VoiceTippingButton />
                      </MobileShell>
                    </TooltipProvider>
                  </ContextProviderWrapper>
                </WalletProvider>
              </ContextProviderWrapper>
            </NetworkProvider>
          </ContextProviderWrapper>
        </ThemeProvider>
      </ContextProviderWrapper>
    </ErrorBoundary>
  );
}

export default App;
