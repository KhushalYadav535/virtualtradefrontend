'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Loader2, CheckCircle, XCircle, Clock, WifiOff } from 'lucide-react';
import { offline, wallet } from '../../../lib/api';

export default function QueuedOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  const fetchQueued = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await offline.getQueued();
      setOrders(data || []);
    } catch (e) {
      setError('Failed to load queued orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueued(); }, [fetchQueued]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      const { data } = await offline.sync();
      setSyncResult(data);
      await fetchQueued();
      if (data.synced > 0) {
        await wallet.get();
      }
    } catch (e) {
      setError('Sync failed — are you connected?');
    } finally {
      setSyncing(false);
    }
  };

  const statusIcon = (status) => {
    if (status === 'synced') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-600" />;
    return <Clock className="w-4 h-4 text-amber-600" />;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queued Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Orders queued while offline will auto-sync when reconnected</p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Now
        </button>
      </div>

      {syncResult && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${syncResult.synced > 0 ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
          <CheckCircle className="w-4 h-4" />
          Synced {syncResult.synced} order(s) successfully
          {syncResult.results?.filter(r => r.status === 'failed').length > 0 &&
            ` · ${syncResult.results.filter(r => r.status === 'failed').length} failed`}
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <WifiOff className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No queued orders</p>
          <p className="text-sm text-gray-400 mt-1">Orders placed while offline will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(o.status)}
                <div>
                  <p className="font-semibold text-gray-900">{o.symbol}</p>
                  <p className="text-sm text-gray-500">
                    {o.qty} shares · {o.order_type} · {o.order_mode}
                    {o.product_type && ` · ${o.product_type}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    Queued: {new Date(o.queued_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                o.status === 'synced' ? 'bg-green-100 text-green-800' :
                o.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-amber-100 text-amber-800'
              }`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
