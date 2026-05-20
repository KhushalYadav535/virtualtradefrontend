'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Bell, CheckCheck } from 'lucide-react';
import { notifications as notificationsApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Define mock smart alerts
  const mockAlerts = [
    { id: 'mock-1', title: 'Auto Square-off Warning', body: 'Your MIS positions will be auto-squared off at 3:20 PM. Please close them manually to avoid auto-square-off charges.', type: 'margin', is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), icon: 'AlertTriangle' },
    { id: 'mock-2', title: 'Low Margin Alert', body: 'Your margin utilization has crossed 80%. Please add funds to avoid position rejection.', type: 'margin', is_read: false, created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), icon: 'Wallet' },
    { id: 'mock-3', title: 'Volume Spike Alert', body: 'Unusual volume detected in HDFCBANK (3x average). Consider reviewing your watchlist.', type: 'alert', is_read: true, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), icon: 'Activity' },
    { id: 'mock-4', title: 'Lot Value Alert', body: 'NIFTY BANK lot value has exceeded your specified threshold of ₹15,000 per lot.', type: 'alert', is_read: true, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), icon: 'Zap' }
  ];

  const load = useCallback(async () => {
    try {
      const { data } = await notificationsApi.getAll({ limit: 80 });
      let fetched = Array.isArray(data) ? data : [];
      // Prepend mock alerts for demonstration
      fetched = [...mockAlerts, ...fetched];
      setItems(fetched);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      setError('Could not mark all as read');
    }
  };

  const handleClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === 'price_alert') router.push('/dashboard/alerts');
    if (n.type === 'achievement') router.push('/dashboard/achievements');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500">Price alerts, achievements, and updates</p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-100 pb-2">
        {['All', 'Orders', 'Margin', 'Alerts'].map(tab => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)} 
             className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === tab ? 'bg-groww-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
           >
             {tab}
           </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {items.filter(n => activeTab === 'All' || (n.type && n.type.toLowerCase().includes(activeTab.toLowerCase())) || (activeTab === 'Orders' && (!n.type || n.type === 'order'))).length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">No {activeTab.toLowerCase()} notifications yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {items.filter(n => activeTab === 'All' || (n.type && n.type.toLowerCase().includes(activeTab.toLowerCase())) || (activeTab === 'Orders' && (!n.type || n.type === 'order'))).map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition ${
                  !n.is_read ? 'bg-groww-primary-light/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-groww-primary" />}
                  <div className={!n.is_read ? '' : 'ml-5'}>
                    <p className={`font-medium ${n.type==='margin' ? 'text-red-600' : 'text-gray-800'}`}>{n.title}</p>
                    {n.body && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">
                      {new Date(n.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
