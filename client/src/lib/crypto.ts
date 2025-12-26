// src/lib/crypto.ts
// Minimal, browser-native AES-GCM helpers
export async function generateSymKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportSymKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importSymKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw.buffer, 'AES-GCM', true, ['encrypt', 'decrypt']);
}

function bufferToBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function base64ToBuffer(s: string) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
}

export async function encryptText(key: CryptoKey, text: string) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return JSON.stringify({ iv: bufferToBase64(iv.buffer), ct: bufferToBase64(ciphertext) });
}

export async function decryptText(key: CryptoKey, payload: string) {
  const obj = JSON.parse(payload);
  const iv = base64ToBuffer(obj.iv);
  const ct = base64ToBuffer(obj.ct);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ct);
  return new TextDecoder().decode(plain);
}

