const ENC_PREFIX = 'vtenc:v1:';

function getCryptoKey() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  const seed = process.env.NEXT_PUBLIC_STORAGE_KEY || 'virtualtrade-local-v1';
  const bytes = new TextEncoder().encode(seed.padEnd(32, '0').slice(0, 32));
  return window.crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptText(plain) {
  const key = await getCryptoKey();
  if (!key) return `${ENC_PREFIX}${btoa(plain)}`;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  );
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), iv.length);
  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
}

async function decryptText(stored) {
  if (!stored?.startsWith(ENC_PREFIX)) return stored;
  const raw = stored.slice(ENC_PREFIX.length);
  const key = await getCryptoKey();
  if (!key) {
    try { return atob(raw); } catch { return null; }
  }
  try {
    const combined = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const dec = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}

export async function setSecureItem(key, value) {
  if (typeof localStorage === 'undefined') return;
  const enc = await encryptText(value);
  localStorage.setItem(key, enc);
}

export async function getSecureItem(key) {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return decryptText(raw);
}

export async function removeSecureItem(key) {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key);
}

export function getDeviceFingerprint() {
  if (typeof navigator === 'undefined') return 'server';
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen?.width,
    screen?.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join('|');
  let h = 0;
  for (let i = 0; i < parts.length; i++) h = (h * 31 + parts.charCodeAt(i)) >>> 0;
  return `web-${h.toString(16)}`;
}
