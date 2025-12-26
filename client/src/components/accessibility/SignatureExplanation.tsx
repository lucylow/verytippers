import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SignatureExplanationProps {
  /**
   * What the signature is for (e.g., "tip", "transaction", "approval")
   */
  action?: string;
  /**
   * Additional context about what will happen
   */
  context?: string;
  /**
   * Whether to show in a card format (default) or inline
   */
  variant?: 'card' | 'inline';
}

/**
 * SignatureExplanation - Plain-language explanation of wallet signatures
 * 
 * Reduces user fear by explaining what they're signing in human terms.
 * This dramatically improves trust and reduces abandonment.
 */
export function SignatureExplanation({ 
  action = 'transaction',
  context,
  variant = 'card'
}: SignatureExplanationProps) {
  const explanation = (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">
            What you're approving
          </p>
          <p className="text-sm text-muted-foreground">
            You are approving a secure message that allows VeryTippers to send a {action} on your behalf.
            {context && ` ${context}`}
            {' '}No funds will be taken without your confirmation.
          </p>
        </div>
      </div>
      
      <div className="flex items-start gap-2 pt-2 border-t">
        <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            This is a signature request, not a transaction. You're only approving the action, not sending funds yet.
          </p>
        </div>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div 
        role="note" 
        className="bg-muted/50 rounded-lg p-3 border"
        aria-label="Signature explanation"
      >
        {explanation}
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" aria-hidden="true" />
          Secure Approval Required
        </CardTitle>
        <CardDescription>
          Your wallet will ask you to sign a message
        </CardDescription>
      </CardHeader>
      <CardContent>
        {explanation}
      </CardContent>
    </Card>
  );
}

