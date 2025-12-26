import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'processing';

interface TransactionStatusProps {
  status: TransactionStatus;
  /**
   * Optional transaction hash for reference
   */
  txHash?: string;
  /**
   * Custom message to display
   */
  message?: string;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Show icon
   */
  showIcon?: boolean;
  className?: string;
}

/**
 * TransactionStatus - Color-independent transaction status display
 * 
 * Features:
 * - Semantic icons with text labels
 * - Not dependent on color alone
 * - Screen reader friendly
 * - WCAG compliant
 */
export function TransactionStatus({
  status,
  txHash,
  message,
  size = 'md',
  showIcon = true,
  className,
}: TransactionStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pending',
      ariaLabel: 'Transaction pending confirmation',
      variant: 'secondary' as const,
      text: message || 'Waiting for blockchain confirmation',
    },
    processing: {
      icon: Loader2,
      label: 'Processing',
      ariaLabel: 'Transaction processing',
      variant: 'secondary' as const,
      text: message || 'Transaction is being processed',
    },
    confirmed: {
      icon: CheckCircle2,
      label: 'Confirmed',
      ariaLabel: 'Transaction confirmed',
      variant: 'default' as const,
      text: message || 'Transaction confirmed successfully',
    },
    failed: {
      icon: XCircle,
      label: 'Failed',
      ariaLabel: 'Transaction failed',
      variant: 'destructive' as const,
      text: message || 'Transaction failed',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinning = status === 'processing';

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge 
        variant={config.variant}
        className={cn('flex items-center gap-1.5', sizeClasses[size])}
        aria-label={config.ariaLabel}
      >
        {showIcon && (
          <Icon 
            className={cn(iconSizes[size], isSpinning && 'animate-spin')} 
            aria-hidden="true"
          />
        )}
        <span>{config.label}</span>
      </Badge>
      
      {config.text && (
        <span className={cn('text-muted-foreground', sizeClasses[size])}>
          {config.text}
        </span>
      )}
      
      {txHash && (
        <span className={cn('font-mono text-muted-foreground', sizeClasses[size])}>
          {txHash.slice(0, 8)}...{txHash.slice(-6)}
        </span>
      )}
    </div>
  );
}

/**
 * Standalone status icon for use in tables or lists
 */
export function TransactionStatusIcon({ 
  status, 
  className 
}: { 
  status: TransactionStatus; 
  className?: string;
}) {
  const statusConfig = {
    pending: { icon: Clock, label: 'Pending', color: 'text-yellow-500' },
    processing: { icon: Loader2, label: 'Processing', color: 'text-blue-500' },
    confirmed: { icon: CheckCircle2, label: 'Confirmed', color: 'text-green-500' },
    failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinning = status === 'processing';

  return (
    <Icon 
      className={cn('w-4 h-4', config.color, isSpinning && 'animate-spin', className)}
      aria-label={config.label}
      role="img"
    />
  );
}

