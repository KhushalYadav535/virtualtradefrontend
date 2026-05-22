/**
 * API base URL for browser requests.
 * Vercel must set NEXT_PUBLIC_API_URL; this fallback keeps production login working if misconfigured.
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv && typeof fromEnv === 'string' && !fromEnv.includes('undefined')) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    if (host.includes('vercel.app') || host.includes('virtualtrade')) {
      return 'https://virtualtradebackend.onrender.com/api';
    }
  }

  return 'https://virtualtradebackend.onrender.com/api';
}
