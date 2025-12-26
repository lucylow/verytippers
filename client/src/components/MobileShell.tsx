// src/components/MobileShell.tsx
import React, { useState } from "react";
import ResponsiveNav from "./ResponsiveNav";
import { cn } from "@/lib/utils";
import { VeryLogo } from "./brand";

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* Top app bar: safe-area aware */}
      <header
        className={cn(
          "sticky top-0 z-40 flex items-center justify-between px-4",
          "h-14 shadow-sm bg-white"
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)", top: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-3">
          <button
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="p-2 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* hamburger icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <VeryLogo size="sm" variant="full" />
        </div>

        <div className="flex items-center gap-3">
          <button
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-md border border-slate-200 text-sm"
          >
            Connect
          </button>
        </div>
      </header>

      {/* Off-canvas nav */}
      <ResponsiveNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Content */}
      <main className="px-4 pb-24 pt-4">
        {children}
      </main>

      {/* bottom nav — mobile friendly targets */}
      <nav className="fixed left-0 right-0 bottom-0 z-30 bg-white border-t border-slate-200 px-4"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-4xl mx-auto flex justify-around items-center h-14">
          <NavButton icon="chat" label="Chat" />
          <NavButton icon="leaderboard" label="Leaderboard" />
          <NavButton icon="send" label="Tip" primary />
          <NavButton icon="wallet" label="Wallet" />
          <NavButton icon="settings" label="Settings" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ icon, label, primary = false }: { icon: string; label: string; primary?: boolean }) {
  return (
    <button
      className={cn(
        "flex flex-col items-center justify-center gap-1 focus:outline-none",
        "text-xs",
        primary ? "rounded-full bg-primary text-white w-12 h-12 -mt-6 shadow-lg focus:ring-2 focus:ring-primary" :
          "p-2 text-slate-700"
      )}
      aria-label={label}
    >
      {/* simple icon placeholders */}
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

