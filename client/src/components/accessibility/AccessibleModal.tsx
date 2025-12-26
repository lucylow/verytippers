import React, { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useKeyboardModal } from './useKeyboardModal';
import { cn } from '@/lib/utils';

interface AccessibleModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  /**
   * Modal title (required for accessibility)
   */
  title: string;
  /**
   * Modal content
   */
  children: ReactNode;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Whether to show close button
   */
  showCloseButton?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom element to focus on open
   */
  initialFocusRef?: RefObject<HTMLElement>;
}

/**
 * AccessibleModal - Keyboard-accessible modal with focus management
 * 
 * Features:
 * - Escape key to close
 * - Focus trap
 * - Focus restoration
 * - Proper ARIA attributes
 * - Screen reader friendly
 */
export function AccessibleModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
  size = 'md',
  initialFocusRef,
}: AccessibleModalProps) {
  const modalRef = useKeyboardModal(open, onClose, {
    trapFocus: true,
    restoreFocus: true,
    initialFocusRef,
  });

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        ref={modalRef}
        className={cn(sizeClasses[size], className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader>
          <DialogTitle id="modal-title">{title}</DialogTitle>
          {description && (
            <p id="modal-description" className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </DialogHeader>
        
        <div className="mt-4">
          {children}
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

