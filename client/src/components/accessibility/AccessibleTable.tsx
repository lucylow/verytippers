import React from 'react';
import { cn } from '@/lib/utils';

interface AccessibleTableProps {
  /**
   * Table caption - required for accessibility
   */
  caption: string;
  /**
   * Column headers
   */
  columns: Array<{
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
  }>;
  /**
   * Table rows
   */
  rows: Array<{
    [key: string]: React.ReactNode;
  }>;
  /**
   * Optional empty state message
   */
  emptyMessage?: string;
  className?: string;
}

/**
 * AccessibleTable - WCAG compliant data table
 * 
 * Features:
 * - Proper table semantics
 * - Caption for context
 * - Scope attributes for headers
 * - Keyboard navigable
 */
export function AccessibleTable({
  caption,
  columns,
  rows,
  emptyMessage = 'No data available',
  className,
}: AccessibleTableProps) {
  if (rows.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)} role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'p-4 text-left font-semibold',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b hover:bg-muted/50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'p-4',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {row[column.key] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * AccessibleTipsTable - Specialized table for displaying tips
 */
interface TipRow {
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  txHash?: string;
}

interface AccessibleTipsTableProps {
  tips: TipRow[];
  emptyMessage?: string;
  className?: string;
}

export function AccessibleTipsTable({
  tips,
  emptyMessage = 'No tips yet. Be the first to tip!',
  className,
}: AccessibleTipsTableProps) {
  const columns = [
    { key: 'from', label: 'From', align: 'left' as const },
    { key: 'to', label: 'To', align: 'left' as const },
    { key: 'amount', label: 'Amount', align: 'right' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
    { key: 'timestamp', label: 'Time', align: 'right' as const },
  ];

  const rows = tips.map((tip) => ({
    from: <span className="font-mono text-sm">{tip.from}</span>,
    to: <span className="font-mono text-sm">{tip.to}</span>,
    amount: <span className="font-semibold">{tip.amount}</span>,
    status: (
      <span aria-label={tip.status}>
        {tip.status === 'confirmed' ? 'Confirmed' : tip.status === 'pending' ? 'Pending' : 'Failed'}
      </span>
    ),
    timestamp: <span className="text-sm text-muted-foreground">{tip.timestamp}</span>,
  }));

  return (
    <AccessibleTable
      caption="Recent tips received"
      columns={columns}
      rows={rows}
      emptyMessage={emptyMessage}
      className={className}
    />
  );
}

