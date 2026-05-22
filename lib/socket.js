import { io } from 'socket.io-client';
import { useMarketStore } from './store';
import { useConnectionStore } from './connectionStore';
import { saveOfflineSnapshot } from './offlineCache';
import { warmBackend } from './api';

let socket = null;
let listenersAttached = false;
let connectScheduled = false;

const setStatus = (socketStatus, extra = {}) => {
  useConnectionStore.getState().setSocketStatus(socketStatus);
  Object.entries(extra).forEach(([k, v]) => {
    if (k === 'reconnectAttempt') useConnectionStore.getState().setReconnectAttempt(v);
  });
};

function getWsUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5000';
  }
  return 'https://virtualtradebackend.onrender.com';
}

function isHostedBackend(url) {
  return /onrender\.com|railway\.app|fly\.dev/i.test(url || '');
}

function attachSocketListeners(sock) {
  if (listenersAttached) return;
  listenersAttached = true;

  sock.on('connect', () => {
    setStatus('connected', { reconnectAttempt: 0 });
    useConnectionStore.getState().setApiReachable(true);
    useConnectionStore.getState().setLastSync();
  });

  sock.on('disconnect', (reason) => {
    setStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
    if (reason === 'io server disconnect') sock.connect();
  });

  sock.on('connect_error', () => {
    setStatus('reconnecting');
  });

  sock.io.on('reconnect_attempt', (n) => {
    setStatus('reconnecting', { reconnectAttempt: n });
  });

  sock.io.on('reconnect', () => {
    setStatus('connected', { reconnectAttempt: 0 });
    useConnectionStore.getState().setLastSync();
  });

  sock.on('connectionStatus', () => {
    useConnectionStore.getState().setLastSync();
  });

  const onQuotes = (data) => {
    if (data.marketStatus) useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    if (data.quotes) {
      useMarketStore.getState().updatePrices(data.quotes);
      useConnectionStore.getState().setLastSync(data.timestamp);
    }
  };

  sock.on('priceUpdate', (data) => {
    onQuotes(data);
    if (useConnectionStore.getState().lowDataMode) return;
    saveOfflineSnapshot({
      cachedAt: data.timestamp || new Date().toISOString(),
      marketStatus: data.marketStatus,
      indices: useMarketStore.getState().indices,
      quotes: data.quotes
    });
  });

  sock.on('indexUpdate', (data) => {
    if (data.marketStatus) useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    if (data.indices) {
      useMarketStore.getState().setIndices(data.indices);
      useConnectionStore.getState().setLastSync(data.timestamp);
    }
  });

  sock.on('stockData', (quote) => {
    useMarketStore.getState().updatePrice(quote);
  });

  sock.on('init', (data) => {
    if (data.stocks) useMarketStore.getState().updatePrices(data.stocks);
    if (data.indices) useMarketStore.getState().setIndices(data.indices);
    useConnectionStore.getState().setLastSync();
    saveOfflineSnapshot({
      cachedAt: new Date().toISOString(),
      indices: data.indices,
      quotes: data.stocks
    });
  });
}

function createSocket(token, wsUrl) {
  const hosted = isHostedBackend(wsUrl);
  return io(wsUrl, {
    auth: { token },
    transports: hosted ? ['polling', 'websocket'] : ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: false,
    timeout: 20000,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 12
  });
}

function connectNow(token) {
  const wsUrl = getWsUrl();
  if (socket?.active) {
    socket.auth = { token };
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersAttached = false;
  }

  setStatus('connecting');
  socket = createSocket(token, wsUrl);
  attachSocketListeners(socket);
  return socket;
}

export const disconnectSocket = () => {
  connectScheduled = false;
  if (socket) {
    socket.removeAllListeners();
    if (socket.active) socket.disconnect();
    socket = null;
  }
  listenersAttached = false;
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

  if (socket?.active) {
    socket.auth = { token };
    return socket;
  }

  if (connectScheduled) return socket;

  connectScheduled = true;
  const wsUrl = getWsUrl();

  const start = () => {
    connectScheduled = false;
    connectNow(token);
  };

  if (isHostedBackend(wsUrl)) {
    warmBackend().finally(start);
  } else {
    start();
  }

  return socket;
};

export const subscribeStock = (symbol) => {
  socket?.emit('subscribe', symbol);
};

export const unsubscribeStock = (symbol) => {
  socket?.emit('unsubscribe', symbol);
};

export const getSocket = () => socket;
