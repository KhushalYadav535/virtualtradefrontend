const SUMMARY_KEY = 'vt_portfolio_summary_v1';

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
