'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notifications as notificationsApi } from '../../../lib/api';
import { useRouter } from 'next/navigation';

const TABS = [
  { id: 'All', types: null },
  { id: 'Orders', types: ['order'] },
  { id: 'Margin', types: ['margin'] },
  { id: 'Alerts', types: ['price_alert', 'alert', 'corporate_action', 'holding', 'lot_change'] },
  { id: 'Funds', types: ['fund'] },
  { id: 'Market', types: ['market'] }
];

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.getAll({ limit: 100 }),
        notificationsApi.getUnreadCount()
      ]);
      setItems(Array.isArray(listRes.data) ? listRes.data : []);
      setUnreadCount(countRes.data?.count ?? 0);
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

  const tabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];
  const filtered = items.filter((n) => {
    if (!tabConfig.types) return true;
    return tabConfig.types.includes(n.type);
  });

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      setError('Could not mark all as read');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await notificationsApi.clearAll();
      setItems([]);
      setUnreadCount(0);
    } catch {
      setError('Could not clear notifications');
    }
  };

  const handleClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
    if (n.type === 'price_alert') router.push('/dashboard/alerts');
    else if (n.type === 'order') router.push('/dashboard/orders');
    else if (n.type === 'margin' || n.type === 'fund') router.push('/dashboard/wallet');
    else if (n.type === 'market') router.push('/dashboard/market');
    else if (n.type === 'achievement') router.push('/dashboard/achievements');
    else if (n.type === 'corporate_action' || n.type === 'holding') router.push('/dashboard/portfolio');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-gray-500">
            Orders, margin, price alerts &amp; market — {unreadCount} unread
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              activeTab === tab.id ? 'bg-groww-primary text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.id}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">No {activeTab.toLowerCase()} notifications yet</p>
          <p className="text-xs text-gray-400 mt-2">
            Trade, set price alerts, or add funds to receive updates here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition ${
                  !n.is_read ? 'bg-groww-primary-light/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-groww-primary" />
                  )}
                  <div className={!n.is_read ? '' : 'ml-5 flex-1'}>
                    <div className="flex justify-between gap-2">
                      <p
                        className={`font-medium ${
                          n.type === 'margin' ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] uppercase text-gray-400 font-semibold shrink-0">
                        {n.type?.replace('_', ' ')}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{n.body}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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
