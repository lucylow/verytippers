// src/components/ResponsiveNav.tsx
import React, { useEffect, useRef } from "react";
import useLockBodyScroll from "@/hooks/useLockBodyScroll";

export default function ResponsiveNav({ open, onClose }: { open: boolean; onClose: () => void; }) {
  useLockBodyScroll(open);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-40 transition-opacity ${open ? "opacity-60 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.45)" }}
      />
      {/* panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className={`fixed top-0 left-0 z-50 h-full w-80 max-w-full transform bg-white shadow-lg transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Menu</h3>
            <button aria-label="Close menu" onClick={onClose} className="p-2 rounded-md hover:bg-slate-100">
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            <a href="#chat" className="px-3 py-2 rounded-md hover:bg-slate-50">Chat</a>
            <a href="#leaderboard" className="px-3 py-2 rounded-md hover:bg-slate-50">Leaderboard</a>
            <a href="#wallet" className="px-3 py-2 rounded-md hover:bg-slate-50">Wallet</a>
            <a href="#settings" className="px-3 py-2 rounded-md hover:bg-slate-50">Settings</a>
          </nav>
        </div>
      </aside>
    </>
  );
}

