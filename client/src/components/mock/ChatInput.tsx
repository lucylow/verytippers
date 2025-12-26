/**
 * Chat-like input component with AI suggestions
 * Supports /tip @handle amount command
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  onRequestTip: (toHandle: string, amount: number, message?: string) => Promise<void>;
  currentHandle: string;
};

type AISuggestion = {
  amount: number;
  message: string;
};

export default function ChatInput({ onRequestTip, currentHandle }: Props) {
  const [text, setText] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Compute AI suggestion based on input
   * Simple heuristic: recommend tip amount based on message length
   */
  function computeAiSuggestion(input: string): AISuggestion {
    if (!input.trim()) {
      return { amount: 1, message: "Nice!" };
    }

    const len = input.trim().length;
    let amount: number;
    let message: string;

    if (len > 120) {
      amount = 10;
      message = "Excellent work!";
    } else if (len > 60) {
      amount = 5;
      message = "Great post!";
    } else {
      amount = 2;
      message = "Nice!";
    }

    return { amount, message };
  }

  async function handleConfirmSuggestion() {
    if (!aiSuggestion) return;

    // Extract handle from text
    const match = text.match(/@([a-z0-9_-]+)/i);
    if (!match) {
      alert("Please mention a recipient with @handle (e.g. /tip @alice 5)");
      return;
    }

    const handle = match[1];
    setLoading(true);
    try {
      await onRequestTip(handle, aiSuggestion.amount, aiSuggestion.message);
      setText("");
      setAiSuggestion(null);
    } catch (error) {
      console.error("Error sending tip:", error);
      alert("Failed to send tip");
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newText = e.target.value;
    setText(newText);
    setAiSuggestion(computeAiSuggestion(newText));
  }

  async function handleSendTip() {
    // Parse: /tip @handle amount
    const m = text.match(/\/tip\s+@([a-z0-9_-]+)\s+(\d+)/i);
    if (!m) {
      alert("Please use format: /tip @handle amount");
      return;
    }

    const handle = m[1];
    const amount = Number(m[2]);
    
    setLoading(true);
    try {
      await onRequestTip(handle, amount, undefined);
      setText("");
      setAiSuggestion(null);
    } catch (error) {
      console.error("Error sending tip:", error);
      alert("Failed to send tip");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <div className="flex gap-2">
        <Input
          placeholder="Type /tip @username 5 or write a message..."
          value={text}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim().startsWith("/tip")) {
                handleSendTip();
              } else if (aiSuggestion) {
                handleConfirmSuggestion();
              }
            }
          }}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSendTip} disabled={loading || !text.trim().startsWith("/tip")}>
          {loading ? "Sending..." : "Send Tip"}
        </Button>
      </div>

      {aiSuggestion && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium">AI Suggestion</div>
            <div className="text-sm text-muted-foreground">
              {aiSuggestion.amount} VERY — "{aiSuggestion.message}"
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirmSuggestion}
              disabled={loading}
            >
              {loading ? "Sending..." : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAiSuggestion(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

