/**
 * Performance Utilities
 * Helpers for performance monitoring and optimization
 */

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  mark(name: string): void {
    if (typeof performance !== "undefined") {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  /**
   * End timing and measure duration
   */
  measure(name: string, startMark?: string): number | null {
    if (typeof performance === "undefined") return null;

    const start = startMark
      ? this.marks.get(startMark)
      : this.marks.get(name);

    if (!start) {
      console.warn(`Start mark "${startMark || name}" not found`);
      return null;
    }

    const end = performance.now();
    const duration = end - start;

    this.measures.set(name, duration);

    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all measures
   */
  getMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    this.measures.clear();

    if (typeof performance !== "undefined") {
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch (e) {
        // Some browsers may not support this
      }
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Lazy load images
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): void {
  if (placeholder) {
    img.src = placeholder;
  }

  const imageLoader = new Image();
  imageLoader.onload = () => {
    img.src = src;
    img.classList.add("loaded");
  };
  imageLoader.onerror = () => {
    img.classList.add("error");
    // Set fallback image
    if (placeholder) {
      img.src = placeholder;
    }
  };
  imageLoader.src = src;
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Intersection Observer helper
 */
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") {
    return null;
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
    ...options,
  });
}

