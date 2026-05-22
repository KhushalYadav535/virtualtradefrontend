import { useMarketStore } from './store';

const CACHE_KEY = 'vt_offline_snapshot_v1';

export const saveOfflineSnapshot = (snapshot) => {
  if (typeof localStorage === 'undefined' || !snapshot) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
};

export const loadOfflineSnapshot = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const hydrateMarketFromCache = () => {
  const snap = loadOfflineSnapshot();
  if (!snap) return false;
  const store = useMarketStore.getState();
  if (snap.indices?.length) store.setIndices(snap.indices);
  if (snap.quotes?.length) store.updatePrices(snap.quotes);
  if (snap.marketStatus) store.setMarketStatus?.(snap.marketStatus);
  return true;
};

export const clearOfflineCache = () => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(CACHE_KEY);
};
