/** Detect ISIN-style query (INE + 10 alphanumeric) */
export function isIsinQuery(q) {
  const s = String(q || '').trim().toUpperCase();
  return /^INE[A-Z0-9]{10}$/.test(s) || (s.startsWith('INE') && s.length >= 12);
}

export function buildSearchOpts(query, extra = {}) {
  const opts = { ...extra };
  if (isIsinQuery(query)) {
    opts.isin = query.trim().toUpperCase();
    opts.q = '';
  }
  return opts;
}
