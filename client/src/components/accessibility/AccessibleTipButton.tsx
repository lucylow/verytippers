import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface AccessibleTipButtonProps {
  amount: number | string;
  recipient: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  /**
   * Whether this is a gasless transaction (sponsored)
   */
  gasless?: boolean;
}

/**
 * AccessibleTipButton - Plain language tip button with accessibility
 * 
 * Features:
 * - Descriptive ARIA labels
 * - Plain language explanations
 * - Gasless transaction disclosure
 * - Screen reader friendly
 */
export function AccessibleTipButton({
  amount,
  recipient,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  gasless = true,
}: AccessibleTipButtonProps) {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  const ariaLabel = `Send ${amountStr} dollars tip to ${recipient}${gasless ? '. No gas fees required' : ''}`;
  
  return (
    <div className="space-y-2">
      <Button
        onClick={onClick}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-label={ariaLabel}
        aria-describedby="tip-help"
        className={className}
      >
        {loading ? (
          <>
            <span className="sr-only">Sending tip</span>
            <span aria-hidden="true">Sending...</span>
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Send Tip</span>
          </>
        )}
      </Button>
      
      {/* Screen reader and visually accessible help text */}
      <p id="tip-help" className="sr-only">
        {gasless 
          ? `This action will send a blockchain transaction to tip ${recipient} ${amountStr} dollars. VeryTippers covers network costs for you, so no gas fees are required.`
          : `This action will send a blockchain transaction to tip ${recipient} ${amountStr} dollars.`
        }
      </p>
      
      {/* Visual gasless disclosure */}
      {gasless && (
        <div 
          role="note" 
          className="text-xs text-muted-foreground mt-1"
          aria-label="Gas fees information"
        >
          <strong>Gas fees:</strong> None. VeryTippers covers network costs for you.
        </div>
      )}
    </div>
  );
}

