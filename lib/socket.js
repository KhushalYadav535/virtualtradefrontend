import { io } from 'socket.io-client';
import { useMarketStore } from './store';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initSocket = () => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('token');
  socket = io(process.env.NEXT_PUBLIC_WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnect attempts reached');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_error', (err) => {
    console.error('Socket reconnect error:', err.message);
  });

  socket.on('priceUpdate', (data) => {
    if (data.marketStatus) {
      useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    }
    useMarketStore.getState().updatePrices(data.quotes);
  });

  socket.on('indexUpdate', (data) => {
    if (data.marketStatus) {
      useMarketStore.getState().setMarketStatus?.(data.marketStatus);
    }
    useMarketStore.getState().setIndices(data.indices);
  });

  socket.on('stockData', (quote) => {
    useMarketStore.getState().updatePrice(quote);
  });

  socket.on('init', (data) => {
    if (data.stocks) {
      const priceMap = {};
      data.stocks.forEach(s => { priceMap[s.symbol] = s; });
      useMarketStore.getState().updatePrices(Object.values(priceMap));
    }
    if (data.indices) {
      useMarketStore.getState().setIndices(data.indices);
    }
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