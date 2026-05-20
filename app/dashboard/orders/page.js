'use client';

import { useEffect, useState } from 'react';
import { trading } from '../../../lib/api';
import { usePortfolioStore } from '../../../lib/store';
import { portfolio } from '../../../lib/api';
import { Loader2, XCircle } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const setSummary = usePortfolioStore((s) => s.setSummary);

  const loadOrders = async () => {
    try {
      const { data } = await trading.getOrders(200);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId) => {
    setCancelling(orderId);
    try {
      await trading.cancelOrder(orderId);
      await loadOrders();
      const { data } = await portfolio.getSummary();
      setSummary(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cancel order');
    } finally {
      setCancelling(null);
    }
  };

  const statusClass = (status) => {
    if (status === 'executed') return 'text-green-600 bg-green-50';
    if (status === 'pending') return 'text-yellow-700 bg-yellow-50';
    if (status === 'cancelled') return 'text-gray-600 bg-gray-100';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Order Book</h1>
        <p className="text-gray-500">All your orders and trade history</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Time</th>
                <th className="text-left p-4 font-medium text-gray-600">Symbol</th>
                <th className="text-left p-4 font-medium text-gray-600">Type</th>
                <th className="text-left p-4 font-medium text-gray-600">Mode</th>
                <th className="text-right p-4 font-medium text-gray-600">Qty</th>
                <th className="text-right p-4 font-medium text-gray-600">Price</th>
                <th className="text-left p-4 font-medium text-gray-600">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No orders yet. Place your first trade from the Trade page.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-gray-600">
                      {new Date(order.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-medium">{order.symbol}</td>
                    <td
                      className={`p-4 font-medium ${
                        order.order_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {order.order_type}
                    </td>
                    <td className="p-4 capitalize">{order.order_mode}</td>
                    <td className="p-4 text-right">{order.qty}</td>
                    <td className="p-4 text-right">
                      ₹{order.executed_price || order.price || '—'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {order.status === 'pending' && order.order_mode === 'limit' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          disabled={cancelling === order.id}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          {cancelling === order.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

