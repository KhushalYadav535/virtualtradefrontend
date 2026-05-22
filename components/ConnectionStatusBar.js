'use client';

import { Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { useConnectionStore, connectionLabel } from '../lib/connectionStore';
import { reconnectSocket } from '../lib/socket';

export default function ConnectionStatusBar() {
  const state = useConnectionStore();
  const label = connectionLabel(state);
  const isLive = state.socketStatus === 'connected' && state.isOnline;
  const isBad = !state.isOnline || !state.apiReachable || state.backendWaking;

  if (isLive && !state.lowDataMode && state.apiReachable && !state.backendWaking) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-xs border-b ${
        isBad ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {!state.isOnline ? (
          <WifiOff className="w-3.5 h-3.5" />
        ) : state.socketStatus === 'connected' ? (
          <Radio className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <Wifi className="w-3.5 h-3.5" />
        )}
        <span className="font-medium">{label}</span>
        {state.lowDataMode && <span className="text-slate-500">· Low data mode</span>}
        {state.lastSyncAt && (
          <span className="text-slate-500 hidden sm:inline">
            · Synced {new Date(state.lastSyncAt).toLocaleTimeString('en-IN')}
          </span>
        )}
      </div>
      {state.isOnline && state.socketStatus !== 'connected' && (
        <button
          type="button"
          onClick={() => reconnectSocket()}
          className="flex items-center gap-1 font-semibold text-groww-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      )}
    </div>
  );
}
