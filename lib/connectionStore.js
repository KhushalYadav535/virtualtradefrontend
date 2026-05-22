import { create } from 'zustand';

export const useConnectionStore = create((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  socketStatus: 'disconnected',
  apiReachable: true,
  lastSyncAt: null,
  reconnectAttempt: 0,
  lowDataMode: false,

  setOnline: (isOnline) => set({ isOnline }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setApiReachable: (apiReachable) => set({ apiReachable }),
  setLastSync: (ts) => set({ lastSyncAt: ts || new Date().toISOString() }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  setLowDataMode: (lowDataMode) => set({ lowDataMode })
}));

export const connectionLabel = (state) => {
  if (!state.isOnline) return 'Offline';
  if (state.socketStatus === 'connected') return 'Live';
  if (state.socketStatus === 'reconnecting') return 'Reconnecting…';
  if (state.socketStatus === 'connecting') return 'Connecting…';
  if (!state.apiReachable) return 'API unreachable';
  return 'Polling';
};
