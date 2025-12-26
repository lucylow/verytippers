import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode, ErrorInfo } from "react";

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
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
      console.error("Error details:", errorDetails);
    } else {
      // In production, log minimal info
      console.error("ErrorBoundary caught an error:", error.message);
    }

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

    // In production, you might want to send to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    // Example with error details:
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     contexts: { react: errorInfo },
    //     extra: errorDetails,
    //   });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
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
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8 space-y-6">
            <AlertTriangle
              size={48}
              className="text-destructive mb-2 flex-shrink-0"
            />

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Something went wrong</h2>
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
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
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground",
                  "hover:opacity-90 transition-opacity cursor-pointer"
                )}
              >
                <Home size={16} />
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "border border-border",
                  "hover:bg-accent transition-colors cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
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
