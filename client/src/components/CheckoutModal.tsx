import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface CheckoutModalProps {
  userId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CheckoutModal({ userId, onClose, onSuccess }: CheckoutModalProps) {
  const [credits, setCredits] = useState(10);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("fiat");

  // Fetch user balance
  useEffect(() => {
    if (userId) {
      fetchBalance();
    }
  }, [userId]);

  async function fetchBalance() {
    try {
      const response = await fetch(`/api/checkout/balance/${userId}`);
      const data = await response.json();
      setBalance(data.credits || 0);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }

  async function buyCredits() {
    if (!stripePromise) {
      toast.error("Stripe not configured");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/stripe-create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          credits,
          success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout/cancel`
        })
      });

      const data = await res.json();
      
      if (data.url) {
        const stripe = await stripePromise;
        if (stripe) {
          window.location.href = data.url;
        }
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  }

  // Gasless tip flow: user signs a payload and backend queues metaTx
  async function gaslessTip(toAddress: string, amount: number, messageCid?: string) {
    setLoading(true);
    try {
      // Check if user has web3 wallet
      if (!(window as any).ethereum) {
        toast.error("Please install a Web3 wallet (MetaMask, etc.)");
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const fromAddress = await signer.getAddress();

      // Create payload
      const nonce = Math.floor(Date.now() / 1000);
      const payload = {
        from: fromAddress,
        to: toAddress,
        amount: amount.toString(),
        cid: messageCid || "",
        nonce: nonce
      };

      const payloadStr = JSON.stringify(payload);
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(payloadStr));
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      // Send signed payload to orchestrator endpoint to create meta-tx
      const res = await fetch("/api/checkout/create-meta-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          toAddress,
          amount,
          cid: messageCid || null,
          nonce: payload.nonce,
          signature,
          fromAddress
        })
      });

      const json = await res.json();
      
      if (json.queuedId) {
        toast.success("Tip queued for relayer — you'll be notified when confirmed");
        await fetchBalance(); // Refresh balance
        onSuccess?.();
      } else {
        toast.error("Error: " + (json.error || JSON.stringify(json)));
      }
    } catch (error: any) {
      console.error("Error in gasless tip:", error);
      toast.error(error.message || "Failed to process gasless tip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Buy VERY Credits</CardTitle>
        <CardDescription>
          Purchase credits to tip creators on VeryTippers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fiat">Buy Credits</TabsTrigger>
            <TabsTrigger value="crypto">Gasless Tip</TabsTrigger>
          </TabsList>

          <TabsContent value="fiat" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Credits</label>
              <Input
                type="number"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                min={1}
                placeholder="Enter amount"
              />
              <p className="text-xs text-muted-foreground">
                1 credit = $0.01 USD
              </p>
            </div>

            {balance !== null && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  Current Balance: <span className="font-semibold">{balance}</span> credits
                </p>
              </div>
            )}

            <Button
              onClick={buyCredits}
              disabled={loading || credits <= 0}
              className="w-full"
            >
              {loading ? "Processing..." : `Buy ${credits} credits ($${(credits / 100).toFixed(2)})`}
            </Button>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <Input
                type="text"
                placeholder="0x..."
                id="toAddress"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Credits)</label>
              <Input
                type="number"
                placeholder="5"
                id="tipAmount"
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message CID (Optional)</label>
              <Input
                type="text"
                placeholder="Qm..."
                id="messageCid"
              />
            </div>

            {balance !== null && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  Current Balance: <span className="font-semibold">{balance}</span> credits
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                const toAddress = (document.getElementById("toAddress") as HTMLInputElement)?.value;
                const amount = Number((document.getElementById("tipAmount") as HTMLInputElement)?.value);
                const cid = (document.getElementById("messageCid") as HTMLInputElement)?.value;

                if (!toAddress || !amount || amount <= 0) {
                  toast.error("Please fill in recipient address and amount");
                  return;
                }

                gaslessTip(toAddress, amount, cid || undefined);
              }}
              disabled={loading}
              className="w-full"
              variant="secondary"
            >
              {loading ? "Processing..." : "Tip with Credits (Gasless)"}
            </Button>
          </TabsContent>
        </Tabs>

        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full mt-4"
          >
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

