import { io } from 'socket.io-client';
import { useMarketStore } from './store';
import { useConnectionStore } from './connectionStore';
import { saveOfflineSnapshot } from './offlineCache';

let socket = null;

const setStatus = (socketStatus, extra = {}) => {
  useConnectionStore.getState().setSocketStatus(socketStatus);
  Object.entries(extra).forEach(([k, v]) => {
    if (k === 'reconnectAttempt') useConnectionStore.getState().setReconnectAttempt(v);
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  setStatus('disconnected');
};

export const reconnectSocket = () => {
  disconnectSocket();
  return initSocket();
};

export const initSocket = () => {
  const token = localStorage.getItem('token');
  const prefsRaw = localStorage.getItem('tradingPrefs');
  let preferWs = true;
  try {
    const prefs = prefsRaw ? JSON.parse(prefsRaw) : {};
    preferWs = prefs.preferWebSocket !== false;
  } catch {
    preferWs = true;
  }

  if (!token || !preferWs) {
    disconnectSocket();
    setStatus('disconnected');
    return null;
  }

  if (socket?.connected) return socket;

  disconnectSocket();
  setStatus('connecting');

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    setStatus('connected', { reconnectAttempt: 0 });
    useConnectionStore.getState().setApiReachable(true);
    useConnectionStore.getState().setLastSync();
  });

  socket.on('disconnect', (reason) => {
    setStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
    if (reason === 'io server disconnect') socket.connect();
  });

  socket.on('connect_error', () => {
    setStatus('reconnecting');
    useConnectionStore.getState().setApiReachable(false);
  });

  socket.io.on('reconnect_attempt', (n) => {
    setStatus('reconnecting', { reconnectAttempt: n });
  });

  socket.io.on('reconnect', () => {
    setStatus('connected', { reconnectAttempt: 0 });
    useConnectionStore.getState().setLastSync();
  });

  socket.on('connectionStatus', () => {
    useConnectionStore.getState().setLastSync();
  });

  const onQuotes = (data) => {
    if (data.marketStatus) useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    if (data.quotes) {
      useMarketStore.getState().updatePrices(data.quotes);
      useConnectionStore.getState().setLastSync(data.timestamp);
    }
  };

  socket.on('priceUpdate', (data) => {
    onQuotes(data);
    if (useConnectionStore.getState().lowDataMode) return;
    saveOfflineSnapshot({
      cachedAt: data.timestamp || new Date().toISOString(),
      marketStatus: data.marketStatus,
      indices: useMarketStore.getState().indices,
      quotes: data.quotes
    });
  });

  socket.on('indexUpdate', (data) => {
    if (data.marketStatus) useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    if (data.indices) {
      useMarketStore.getState().setIndices(data.indices);
      useConnectionStore.getState().setLastSync(data.timestamp);
    }
  });

  socket.on('stockData', (quote) => {
    useMarketStore.getState().updatePrice(quote);
  });

  socket.on('init', (data) => {
    if (data.stocks) useMarketStore.getState().updatePrices(data.stocks);
    if (data.indices) useMarketStore.getState().setIndices(data.indices);
    useConnectionStore.getState().setLastSync();
    saveOfflineSnapshot({
      cachedAt: new Date().toISOString(),
      indices: data.indices,
      quotes: data.stocks
    });
  });

  return socket;
};

export const subscribeStock = (symbol) => {
  socket?.emit('subscribe', symbol);
};

export const unsubscribeStock = (symbol) => {
  socket?.emit('unsubscribe', symbol);
};

export const getSocket = () => socket;
