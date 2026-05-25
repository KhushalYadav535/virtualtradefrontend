const SUMMARY_KEY = 'vt_portfolio_summary_v1';
const WATCHLIST_KEY = 'vt_watchlists_v1';
const HOLDINGS_KEY = 'vt_holdings_v1';
const SUMMARY_TTL_MS = 5 * 60 * 1000;

export function loadCachedPortfolioSummary() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUMMARY_KEY);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw);
    if (!data || !savedAt) return null;
    return data;
  } catch {
    return null;
  }
}

export function isPortfolioSummaryFresh() {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(SUMMARY_KEY);
    if (!raw) return false;
    const { savedAt } = JSON.parse(raw);
    return savedAt && (Date.now() - savedAt) < SUMMARY_TTL_MS;
  } catch {
    return false;
  }
}

export function savePortfolioSummaryCache(data) {
  if (typeof localStorage === 'undefined' || !data) return;
  try {
    localStorage.setItem(
      SUMMARY_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    /* quota */
  }
}

export function loadCachedWatchlists() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function saveWatchlistsCache(data) {
  if (typeof localStorage === 'undefined' || !Array.isArray(data)) return;
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota */
  }
}

export function loadCachedHoldings() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return data || null;
  } catch {
    return null;
  }
}

export function saveHoldingsCache(data) {
  if (typeof localStorage === 'undefined' || !data) return;
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota */
  }
}
