// src/components/WalletModal.tsx
import React, { useEffect } from "react";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

export default function WalletModal({
  open,
  onClose,
  amount,
}: {
  open: boolean;
  onClose: () => void;
  amount: number;
}) {
  useLockBodyScroll(open);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // placeholder handlers
  function onSign() {
    // simulate sign + success
    // Integrate with Wepin or external wallet here.
    console.log("Signing meta-payload for amount:", amount);
    setTimeout(() => {
      alert(`Tip confirmed: ${amount} VERY — simulated (testnet)`);
      onClose();
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6 sm:p-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-md bg-white rounded-xl shadow-lg p-4" role="dialog" aria-modal="true" aria-label="Confirm tip">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-medium">Confirm tip</h4>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100">✕</button>
        </div>

        <div className="mt-3">
          <p className="text-sm text-slate-600">To: <span className="font-medium">@alice</span></p>
          <p className="mt-2 text-sm">Amount: <span className="font-semibold">{amount} VERY</span></p>
          <p className="mt-2 text-xs text-slate-500">Gas: <span className="text-green-600 font-medium">0 (sponsored)</span></p>

          <div className="mt-4 flex gap-2">
            <button onClick={onSign} className="flex-1 px-4 py-2 rounded-md bg-primary text-white">Sign & Send</button>
            <button onClick={onClose} className="px-4 py-2 rounded-md border">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

