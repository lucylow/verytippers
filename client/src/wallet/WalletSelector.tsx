/**
 * Wallet Selector UI Component
 * Accessible + Lovable-Safe wallet connection interface
 */

import { useState } from "react";
import { useWallet } from "./WalletContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";

interface WalletSelectorProps {
  className?: string;
  onConnect?: () => void;
}

export function WalletSelector({ className, onConnect }: WalletSelectorProps) {
  const { wallet, isConnected, address, connect, disconnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const handleConnect = async (type: "metamask" | "wepin") => {
    setIsConnecting(type);
    try {
      await connect(type);
      toast.success(`Connected to ${type === "metamask" ? "MetaMask" : "Wepin Wallet"}`);
      onConnect?.();
    } catch (error: any) {
      const errorMessage =
        error?.message || `Failed to connect to ${type === "metamask" ? "MetaMask" : "Wepin"}`;
      toast.error(errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Wallet disconnected");
    } catch (error: any) {
      toast.error(error?.message || "Failed to disconnect");
    }
  };

  if (isConnected && wallet) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="ml-2"
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      <Button
        onClick={() => handleConnect("metamask")}
        disabled={isConnecting !== null}
        className="w-full"
        variant="outline"
      >
        {isConnecting === "metamask" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect MetaMask
          </>
        )}
      </Button>

      <Button
        onClick={() => handleConnect("wepin")}
        disabled={isConnecting !== null}
        className="w-full"
        variant="outline"
      >
        {isConnecting === "wepin" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wepin Wallet
          </>
        )}
      </Button>
    </div>
  );
}

