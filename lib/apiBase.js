/** Production Render backend (must end with /api). */
export const PRODUCTION_API_URL = 'https://virtualtradebackend.onrender.com/api';

/**
 * Detect Vercel/env misconfiguration (frontend URL, localhost, missing /api).
 */
export function isMisconfiguredApiUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  if (!u || u.includes('undefined')) return true;
  if (u.includes('vercel.app')) return true;
  if (u.includes('localhost') || u.includes('127.0.0.1')) {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') return true;
    }
  }
  if (u.includes('onrender.com') && !u.endsWith('/api')) return true;
  return false;
}

/**
 * API base URL for browser requests.
 * Ignores bad NEXT_PUBLIC_API_URL on production (common Vercel mistake).
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (fromEnv && !isMisconfiguredApiUrl(fromEnv)) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }

  return PRODUCTION_API_URL;
}
