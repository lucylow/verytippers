// src/components/ChatTipPanel.tsx
import React, { useState } from "react";
import WalletModal from "./WalletModal";

type Suggestion = { amount: number; text: string; confidence: number };

const MOCK_SUGGESTION: Suggestion = { amount: 5, text: "Nice thread!", confidence: 0.87 };

export default function ChatTipPanel() {
  const [input, setInput] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(MOCK_SUGGESTION);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  function onConfirmTip(amount?: number) {
    const amt = amount ?? selectedAmount ?? suggestion?.amount ?? 1;
    setSelectedAmount(amt);
    setModalOpen(true);
  }

  return (
    <section className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border p-3 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-sm">U</div>
            <div className="flex-1">
              <div className="text-sm text-slate-700">/tip @alice 5 VERY</div>
              <div className="mt-2 text-xs text-slate-500">Type /tip @username &lt;amount&gt; or tap suggestions</div>
            </div>
          </div>

          {/* AI Suggestion bubble (touch-friendly) */}
          {suggestion && (
            <button
              onClick={() => onConfirmTip(suggestion.amount)}
              className="flex w-full justify-between items-center bg-slate-50 p-3 rounded-lg border hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <div>
                <div className="text-sm font-medium">Suggested: {suggestion.amount} VERY</div>
                <div className="text-xs text-slate-600 truncate">{`"${suggestion.text}" — confidence ${Math.round(suggestion.confidence * 100)}%`}</div>
              </div>
              <div className="text-sm text-slate-700">Tap to confirm</div>
            </button>
          )}

          {/* manual input row */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="/tip @username 1"
              className="flex-1 px-3 py-2 rounded-md border focus:ring-2 focus:ring-primary text-sm"
              aria-label="Tip input"
            />
            <button
              onClick={() => onConfirmTip()}
              className="px-4 py-2 rounded-md bg-primary text-white text-sm min-h-[44px] flex items-center justify-center"
              aria-label="Open confirm"
            >
              Tip
            </button>
          </div>

          {/* quick amounts */}
          <div className="flex gap-2 overflow-auto py-1">
            {[1, 2, 5, 10].map((a) => (
              <button
                key={a}
                onClick={() => onConfirmTip(a)}
                className="px-3 py-2 rounded-md border text-sm min-w-[56px] flex items-center justify-center"
              >
                {a} VERY
              </button>
            ))}
          </div>
        </div>
      </div>

      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} amount={selectedAmount ?? suggestion?.amount ?? 1} />
    </section>
  );
}

