import { useMarketStore } from './store';

const CACHE_KEY = 'vt_offline_snapshot_v1';
const MIN_WRITE_INTERVAL_MS = 60_000;

let pendingSnapshot = null;
let writeTimer = null;
let lastWriteAt = 0;

const flush = () => {
  writeTimer = null;
  const snap = pendingSnapshot;
  pendingSnapshot = null;
  if (!snap || typeof localStorage === 'undefined') return;
  lastWriteAt = Date.now();
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    /* quota */
  }
};

export const saveOfflineSnapshot = (snapshot) => {
  if (typeof localStorage === 'undefined' || !snapshot) return;
  pendingSnapshot = snapshot;
  if (writeTimer) return;
  const elapsed = Date.now() - lastWriteAt;
  const delay = elapsed >= MIN_WRITE_INTERVAL_MS ? 0 : MIN_WRITE_INTERVAL_MS - elapsed;
  writeTimer = setTimeout(flush, delay);
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
  pendingSnapshot = null;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  if (typeof localStorage !== 'undefined') localStorage.removeItem(CACHE_KEY);
};
