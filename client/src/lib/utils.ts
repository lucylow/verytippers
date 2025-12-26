import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// small helpers used across app
export const wait = (ms = 500) => new Promise(res => setTimeout(res, ms))

export function randomHex(len = 16) {
  const bytes = new Uint8Array(len / 2)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// fake CID generator (short form)
export function makeCID() {
  // not a real CID; fine for mock UX
  return 'Qm' + randomHex(28)
}

// fake tx hash
export function makeTxHash() {
  return '0x' + randomHex(32)
}

// simple id
export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9)
}
