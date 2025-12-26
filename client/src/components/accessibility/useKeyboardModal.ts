import { useEffect, useRef, RefObject } from 'react';

/**
 * useKeyboardModal - Hook for keyboard-accessible modals
 * 
 * Features:
 * - Escape key to close
 * - Focus trap
 * - Focus restoration
 * - Keyboard navigation
 */
export function useKeyboardModal(
  isOpen: boolean,
  onClose: () => void,
  options?: {
    /**
     * Whether to trap focus within the modal
     */
    trapFocus?: boolean;
    /**
     * Whether to restore focus on close
     */
    restoreFocus?: boolean;
    /**
     * Custom element to focus on open
     */
    initialFocusRef?: RefObject<HTMLElement>;
  }
) {
  const {
    trapFocus = true,
    restoreFocus = true,
    initialFocusRef,
  } = options || {};

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (!isOpen) {
      // Restore focus when closing
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      return;
    }

    // Store current active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element or modal
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen, restoreFocus, initialFocusRef]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !trapFocus || !modalRef.current) return;

    const modal = modalRef.current;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // Filter out disabled and hidden elements
        return !el.hasAttribute('disabled') && 
               !el.hasAttribute('aria-hidden') &&
               el.offsetParent !== null;
      });

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen, trapFocus]);

  return modalRef;
}

