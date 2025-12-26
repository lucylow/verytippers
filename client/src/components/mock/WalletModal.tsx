/**
 * Wallet confirmation modal for tips
 * Shows Gas: 0 (relayer pays) and sign button
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  toHandle: string;
  amount: number;
  onSign: () => Promise<void>;
  onCancel: () => void;
};

export default function WalletModal({
  open,
  toHandle,
  amount,
  onSign,
  onCancel,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSign() {
    setLoading(true);
    try {
      await onSign();
    } catch (error) {
      console.error("Error signing:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Tip</DialogTitle>
          <DialogDescription>
            Review the tip details before signing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">@{toHandle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{amount} VERY</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-muted-foreground">Gas:</span>
            <span className="font-semibold text-green-600">0 (relayer pays)</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={loading}>
            {loading ? "Signing..." : "Sign & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

