/**
 * usePerformance Hook
 * Custom hook for performance monitoring
 */

import { useEffect, useRef } from "react";
import { performanceMonitor } from "@/lib/utils/performance";

export interface UsePerformanceOptions {
  markName?: string;
  logOnUnmount?: boolean;
}

/**
 * Custom hook for tracking component performance
 */
export function usePerformance(options: UsePerformanceOptions = {}) {
  const { markName, logOnUnmount = false } = options;
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (markName) {
      performanceMonitor.mark(markName);
      startTimeRef.current = performance.now();
    }

    return () => {
      if (markName && logOnUnmount && startTimeRef.current !== null) {
        const duration = performanceMonitor.measure(
          `${markName}_duration`,
          markName
        );
        if (duration && import.meta.env.DEV) {
          console.log(
            `[Performance] ${markName} completed in ${duration.toFixed(2)}ms`
          );
        }
      }
    };
  }, [markName, logOnUnmount]);

  const mark = (name: string) => {
    performanceMonitor.mark(name);
  };

  const measure = (name: string, startMark?: string) => {
    return performanceMonitor.measure(name, startMark);
  };

  return { mark, measure };
}

