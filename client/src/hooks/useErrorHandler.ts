/**
 * useErrorHandler Hook
 * Custom hook for consistent error handling across components
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { categorizeError, type CategorizedError } from "@/lib/errors/errorTypes";
import { errorLogger } from "@/lib/errors/errorLogger";
import { errorRecovery } from "@/lib/errors/errorRecovery";

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  attemptRecovery?: boolean;
  onError?: (error: CategorizedError) => void;
  context?: Record<string, unknown>;
}

/**
 * Custom hook for handling errors consistently
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    showToast = true,
    attemptRecovery = true,
    onError,
    context,
  } = options;

  const handleError = useCallback(
    async (error: unknown, customContext?: Record<string, unknown>) => {
      const errorContext = {
        ...context,
        ...customContext,
      };

      const categorizedError = categorizeError(error, errorContext);

      // Log the error
      errorLogger.log(categorizedError);

      // Call custom error handler if provided
      if (onError) {
        try {
          onError(categorizedError);
        } catch (handlerError) {
          console.error("Error in custom error handler:", handlerError);
        }
      }

      // Attempt recovery if enabled
      if (attemptRecovery) {
        const recovered = await errorRecovery.attemptRecovery(categorizedError);
        if (recovered) {
          return categorizedError;
        }
      }

      // Show toast notification if enabled
      if (showToast) {
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
      }

      return categorizedError;
    },
    [showToast, attemptRecovery, onError, context]
  );

  return { handleError };
}

