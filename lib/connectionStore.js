import { create } from 'zustand';

export const useConnectionStore = create((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  socketStatus: 'disconnected',
  apiReachable: true,
  backendWaking: false,
  lastSyncAt: null,
  reconnectAttempt: 0,
  lowDataMode: false,

  setOnline: (isOnline) => set({ isOnline }),
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setApiReachable: (apiReachable) => set({ apiReachable, backendWaking: false }),
  setBackendWaking: (backendWaking) => set({ backendWaking }),
  setLastSync: (ts) => set({ lastSyncAt: ts || new Date().toISOString() }),
  setReconnectAttempt: (reconnectAttempt) => set({ reconnectAttempt }),
  setLowDataMode: (lowDataMode) => set({ lowDataMode })
}));

export const connectionLabel = (state) => {
  if (!state.isOnline) return 'Offline';
  if (state.socketStatus === 'connected') return 'Live';
  if (state.socketStatus === 'reconnecting') return 'Reconnecting…';
  if (state.socketStatus === 'connecting') return 'Connecting…';
  if (state.backendWaking) return 'Server starting — wait…';
  if (!state.apiReachable) return 'API slow — using cached data';
  return 'Polling';
};
