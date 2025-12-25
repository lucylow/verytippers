import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { useEffect } from "react";

function Router() {
  // Handle route errors and navigation issues
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Log route-related errors
      const error = event.error;
      if (error && error instanceof Error) {
        // Check if it's a route-related error
        if (
          error.message.includes("route") ||
          error.message.includes("Route") ||
          error.message.includes("navigation")
        ) {
          console.error("Route error detected:", error);
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Handle unhandled promise rejections in routes
      console.error("Unhandled promise rejection in router:", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <Switch>
      <Route path="/">
        <Home />
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
