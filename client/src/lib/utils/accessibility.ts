/**
 * Accessibility Utilities
 * Helpers for improving accessibility and keyboard navigation
 */

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get accessible label for an element
 */
export function getAccessibleLabel(
  label?: string,
  ariaLabel?: string,
  ariaLabelledBy?: string
): string | undefined {
  return ariaLabel || label || undefined;
}

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;
  private focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  constructor(container: HTMLElement) {
    this.container = container;
    this.setup();
  }

  private setup(): void {
    const focusableElements = this.container.querySelectorAll<HTMLElement>(
      this.focusableSelector
    );

    if (focusableElements.length === 0) {
      // If no focusable elements, focus the container itself
      this.container.setAttribute("tabindex", "0");
      this.firstFocusable = this.container;
      this.lastFocusable = this.container;
    } else {
      this.firstFocusable = focusableElements[0];
      this.lastFocusable = focusableElements[focusableElements.length - 1];
    }

    // Focus first element
    this.firstFocusable?.focus();

    // Add keyboard event listener
    this.container.addEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstFocusable) {
        event.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastFocusable) {
        event.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  };

  destroy(): void {
    this.container.removeEventListener("keydown", this.handleKeyDown);
  }
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  if (typeof document === "undefined") return;

  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", priority);
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if element is keyboard focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (
    element.tabIndex < 0 ||
    (element as HTMLElement).getAttribute("disabled") !== null
  ) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ["a", "button", "input", "select", "textarea"];

  if (focusableTags.includes(tagName)) {
    return true;
  }

  return element.tabIndex >= 0;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const selector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector)
  );

  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      !el.hasAttribute("disabled") &&
      !el.hasAttribute("aria-hidden")
    );
  });
}

/**
 * Skip to main content link (for screen readers)
 */
export function createSkipToMainLink(): HTMLElement {
  const link = document.createElement("a");
  link.href = "#main-content";
  link.textContent = "Skip to main content";
  link.className = "skip-to-main";
  link.style.cssText = `
    position: absolute;
    left: -9999px;
    z-index: 999;
  `;

  link.addEventListener("focus", () => {
    link.style.left = "6px";
    link.style.top = "6px";
  });

  link.addEventListener("blur", () => {
    link.style.left = "-9999px";
  });

  return link;
}

/**
 * Keyboard navigation helper
 */
export function handleKeyboardNavigation(
  event: KeyboardEvent,
  options: {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onTab?: () => void;
  }
): void {
  switch (event.key) {
    case "Enter":
      options.onEnter?.();
      break;
    case "Escape":
      options.onEscape?.();
      break;
    case "ArrowUp":
      options.onArrowUp?.();
      event.preventDefault();
      break;
    case "ArrowDown":
      options.onArrowDown?.();
      event.preventDefault();
      break;
    case "ArrowLeft":
      options.onArrowLeft?.();
      event.preventDefault();
      break;
    case "ArrowRight":
      options.onArrowRight?.();
      event.preventDefault();
      break;
    case "Tab":
      options.onTab?.();
      break;
  }
}

