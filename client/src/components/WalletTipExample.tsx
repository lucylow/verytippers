/**
 * Example: Tip Flow with Universal Wallet Adapter
 * Demonstrates wallet-agnostic meta-transaction signing
 */

import { useWallet } from "@/contexts/WalletContext";
import { signMetaTx } from "@/lib/signMetaTx";
import { buildMetaTx } from "@/lib/web3/metaTx";
import { ensureChainCompatibility } from "@/wallet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

interface WalletTipExampleProps {
  recipientAddress: string;
  amount: number;
  messageCid: string;
}

export function WalletTipExample({
  recipientAddress,
  amount,
  messageCid,
}: WalletTipExampleProps) {
  const { wallet, isConnected, address, connect } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTip = async () => {
    if (!wallet || !address) {
      toast.error("Please connect a wallet first");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Ensure wallet is on the correct chain
      await ensureChainCompatibility(wallet);

      // 2. Build meta-transaction
      const metaTx = buildMetaTx({
        from: address,
        to: recipientAddress,
        amount,
        cid: messageCid,
        nonce: Date.now(),
      });

      // 3. Sign meta-transaction (works with both MetaMask and Wepin)
      const { payload, signature } = await signMetaTx(wallet, metaTx);

      // 4. Send to relayer
      const response = await fetch("/api/relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload, signature }),
      });

      if (!response.ok) {
        throw new Error("Failed to relay transaction");
      }

      const result = await response.json();
      toast.success(`Tip sent! Transaction: ${result.txHash}`);
    } catch (error: any) {
      console.error("Tip error:", error);
      toast.error(error?.message || "Failed to send tip");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect a wallet to send a tip
        </p>
        <Button onClick={() => connect("metamask")} variant="outline">
          Connect MetaMask
        </Button>
        <Button onClick={() => connect("wepin")} variant="outline">
          Connect Wepin
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <p>
          <strong>From:</strong> {address}
        </p>
        <p>
          <strong>To:</strong> {recipientAddress}
        </p>
        <p>
          <strong>Amount:</strong> {amount} VERY
        </p>
      </div>

      <Button
        onClick={handleTip}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? "Processing..." : "Send Tip (Gasless)"}
      </Button>

      <p className="text-xs text-muted-foreground">
        This tip uses gasless meta-transactions. The transaction will be
        relayed on your behalf.
      </p>
    </div>
  );
}

