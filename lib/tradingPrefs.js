export const DEFAULT_TRADING_PREFS = {
  chartTheme: 'dark',
  chartDefaultTimeframe: '1d',
  defaultOrderType: 'MARKET',
  defaultProductType: 'MIS',
  qtyInputMode: 'lots',
  lotRounding: 'up',
  showLotSizeEverywhere: true,
  lotQuickButtons: [1, 2, 5, 10],
  defaultQty: 1,
  autoSquareOffTime: '15:20',
  priceDisplayFormat: 'inr',
  lotValueDisplayFormat: 'per_lot',
  soundEffects: true,
  hapticFeedback: true,
  orderPin: false,
  defaultWatchlist: 'My Watchlist',
  appTheme: 'light',
  lowDataMode: false,
  preferWebSocket: true,
  offlineCacheEnabled: true,
  pollIntervalSec: 5
};

export function mergeTradingPrefs(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TRADING_PREFS };
  const merged = { ...DEFAULT_TRADING_PREFS, ...raw };
  if (!Array.isArray(merged.lotQuickButtons) || !merged.lotQuickButtons.length) {
    merged.lotQuickButtons = [...DEFAULT_TRADING_PREFS.lotQuickButtons];
  }
  return merged;
}

export function getTradingPrefsFromUser(user) {
  return mergeTradingPrefs(user?.tradingPrefs);
}

export function formatPriceDisplay(ltp, changePercent, prefs) {
  const p = prefs || DEFAULT_TRADING_PREFS;
  if (p.priceDisplayFormat === 'percent' && changePercent != null) {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${Number(changePercent).toFixed(2)}%`;
  }
  return ltp != null ? `₹${Number(ltp).toLocaleString('en-IN')}` : '—';
}

export function formatLotValue(ltp, lotSize, prefs) {
  const p = prefs || DEFAULT_TRADING_PREFS;
  const perLot = (ltp || 0) * (lotSize || 1);
  if (p.lotValueDisplayFormat === 'total') {
    return `₹${perLot.toLocaleString('en-IN')} total/lot`;
  }
  return `₹${perLot.toLocaleString('en-IN')}/lot`;
}
