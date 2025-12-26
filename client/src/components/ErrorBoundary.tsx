import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode, ErrorInfo } from "react";
import { categorizeError } from "@/lib/errors/errorTypes";
import { errorLogger } from "@/lib/errors/errorLogger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging with categorization
    const categorizedError = categorizeError(error, {
      route: window.location.pathname,
      action: "error_boundary",
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });

    errorLogger.log(categorizedError);

    // Store error info for display
    this.setState({ errorInfo });

    // Call optional error handler (e.g., for error reporting service)
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reportingError) {
        console.error("Error in error reporting handler:", reportingError);
      }
    }
  }

  handleReset = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (error) {
      console.error("Failed to reset error boundary:", error);
      // If reset fails, try reloading the page
      window.location.reload();
    }
  };

  handleGoHome = () => {
    try {
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to navigate home:", error);
      // Fallback: try using history API
      try {
        window.history.pushState(null, "", "/");
        window.location.reload();
      } catch (fallbackError) {
        console.error("Fallback navigation also failed:", fallbackError);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "Unknown error occurred";
      const isDevelopment = import.meta.env.DEV;

      return (
        <div
          className="flex items-center justify-center min-h-screen p-8 bg-background"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex flex-col items-center w-full max-w-2xl p-8 space-y-6">
            <AlertTriangle
              size={48}
              className="text-destructive mb-2 flex-shrink-0"
              aria-hidden="true"
            />

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>

            {isDevelopment && this.state.error && (
              <div className="w-full space-y-4">
                <details className="w-full">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="p-4 rounded bg-muted overflow-auto">
                    <div className="mb-2">
                      <strong className="text-sm">Error Message:</strong>
                      <pre className="text-xs text-muted-foreground mt-1 whitespace-break-spaces">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div className="mt-3">
                        <strong className="text-sm">Stack Trace:</strong>
                        <pre className="text-xs text-muted-foreground mt-1 whitespace-break-spaces">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div className="mt-3">
                        <strong className="text-sm">Component Stack:</strong>
                        <pre className="text-xs text-muted-foreground mt-1 whitespace-break-spaces">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={this.handleReset}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 transition-opacity cursor-pointer"
                )}
                aria-label="Try again"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 transition-opacity cursor-pointer"
                )}
                aria-label="Go to home page"
              >
                <Home size={16} aria-hidden="true" />
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "border border-border",
                  "hover:bg-accent transition-colors cursor-pointer"
                )}
                aria-label="Reload page"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
