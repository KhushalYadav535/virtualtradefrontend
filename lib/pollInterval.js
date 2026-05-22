import { DEFAULT_TRADING_PREFS } from './tradingPrefs';

export const getPollIntervalMs = (prefs, isOnline = true) => {
  const p = prefs || DEFAULT_TRADING_PREFS;
  if (!isOnline) return 60000;
  let sec = parseInt(p.pollIntervalSec, 10) || 5;
  if (p.lowDataMode) sec = Math.max(15, sec);
  return sec * 1000;
};
