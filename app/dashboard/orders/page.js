'use client';

import { useEffect, useState } from 'react';
import { trading } from '../../../lib/api';
import { usePortfolioStore, useMarketStore } from '../../../lib/store';
import { portfolio } from '../../../lib/api';
import { Loader2, XCircle } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [modifying, setModifying] = useState(null);
  const [modifyQty, setModifyQty] = useState('');
  const [modifyPrice, setModifyPrice] = useState('');
  const [modifyTrigger, setModifyTrigger] = useState('');
  const [modifySaving, setModifySaving] = useState(false);
  const [modifyErr, setModifyErr] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const setSummary = usePortfolioStore((s) => s.setSummary);
  const { prices } = useMarketStore();

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

  const openModify = (order) => {
    setModifying(order);
    setModifyQty(String(order.qty));
    setModifyPrice(order.price != null && order.price !== '' ? String(order.price) : '');
    setModifyTrigger(order.trigger_price != null && order.trigger_price !== '' ? String(order.trigger_price) : '');
    setModifyErr('');
  };

  const submitModify = async () => {
    if (!modifying) return;
    const qty = parseInt(modifyQty, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setModifyErr('Enter a valid quantity');
      return;
    }
    const payload = { qty };
    const mode = modifying.order_mode;
    if (mode === 'limit' || mode === 'sl' || mode === 'sl-m') {
      const p = parseFloat(modifyPrice);
      if (Number.isFinite(p) && p > 0) payload.price = p;
    }
    if (mode === 'sl' || mode === 'sl-m') {
      const t = parseFloat(modifyTrigger);
      if (Number.isFinite(t) && t > 0) payload.triggerPrice = t;
    }
    setModifySaving(true);
    setModifyErr('');
    try {
      await trading.modifyOrder(modifying.id, payload);
      setModifying(null);
      await loadOrders();
      const { data } = await portfolio.getSummary();
      setSummary(data);
    } catch (err) {
      setModifyErr(err.response?.data?.message || err.response?.data?.error || 'Could not modify order');
    } finally {
      setModifySaving(false);
    }
  };

  const statusClass = (status) => {
    if (status === 'executed') return 'text-green-600 bg-green-50';
    if (status === 'pending') return 'text-yellow-700 bg-yellow-50';
    if (status === 'cancelled') return 'text-groww-muted bg-gray-100';
    if (status === 'rejected') return 'text-red-700 bg-red-100';
    return 'text-red-600 bg-red-50';
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (productFilter !== 'all' && o.product_type !== productFilter) return false;
    if (searchQuery && !o.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'time') return new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime();
    if (sortBy === 'stock') return a.symbol.localeCompare(b.symbol);
    if (sortBy === 'lots') return b.qty - a.qty;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-groww-ink">Order Book</h1>
        <p className="text-groww-muted">All your orders and trade history</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'executed', label: 'Executed' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'rejected', label: 'Rejected' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === tab.id ? 'bg-groww-primary text-white' : 'bg-white border border-gray-200 text-groww-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
        
        <div className="w-px bg-gray-300 mx-2" />
        
        {['all', 'CNC', 'MIS', 'NRML'].map((tab) => (
          <button
            key={`p-${tab}`}
            type="button"
            onClick={() => setProductFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              productFilter === tab ? 'bg-groww-primary text-white' : 'bg-white border border-gray-200 text-groww-muted'
            }`}
          >
            {tab === 'all' ? 'All Products' : tab}
          </button>
        ))}
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input 
          type="text" 
          placeholder="Search symbol..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-groww-primary w-64"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-groww-primary bg-white text-gray-700 font-medium cursor-pointer"
          >
            <option value="time">Time</option>
            <option value="stock">Stock</option>
            <option value="lots">Lots / Qty</option>
          </select>
        </div>
      </div>

      <div className="groww-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-groww-bg border-b border-groww-border">
              <tr>
                <th className="text-left p-4 font-medium text-groww-muted">Time</th>
                <th className="text-left p-4 font-medium text-groww-muted">Symbol</th>
                <th className="text-left p-4 font-medium text-groww-muted">Type</th>
                <th className="text-left p-4 font-medium text-groww-muted">Mode</th>
                <th className="text-right p-4 font-medium text-groww-muted">Qty</th>
                <th className="text-right p-4 font-medium text-groww-muted">Price</th>
                <th className="text-left p-4 font-medium text-groww-muted">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-groww-muted">
                    No orders matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-groww-border/70 hover:bg-groww-bg">
                    <td className="p-4 text-groww-muted">
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
                    <td className="p-4 text-right">
                      {(() => {
                        const lotSize = prices[order.symbol]?.lotSize || 1;
                        const numLots = order.qty / lotSize;
                        return (
                          <>
                            <div className="font-medium text-groww-ink">{numLots % 1 === 0 ? numLots : numLots.toFixed(2)} Lots</div>
                            <div className="text-[10px] text-groww-muted">{order.qty} shares</div>
                            <div className={`text-[9px] mt-1 font-semibold ${numLots % 1 === 0 ? 'text-green-600' : 'text-red-500'}`}>
                               {numLots % 1 === 0 ? '✓ LOT VALID' : '⚠ INVALID SIZE'}
                            </div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-4 text-right">
                      {(() => {
                        const price = order.executed_price || order.price || 0;
                        const lotSize = prices[order.symbol]?.lotSize || 1;
                        return (
                          <>
                            <div className="font-medium text-groww-ink">₹{(price * lotSize).toLocaleString()}</div>
                            <div className="text-[10px] text-groww-muted">@ ₹{price} / share</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      {order.status === 'rejected' && (
                         <div className="text-[10px] text-red-600 mt-2 font-medium max-w-[150px] leading-tight">
                            Reject: {order.reject_reason || 'Insufficient funds or margin'}
                         </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => openModify(order)}
                            className="inline-flex items-center gap-1 text-groww-primary hover:text-blue-700 text-xs font-medium bg-groww-primary/10 px-2 py-1 rounded"
                          >
                            Modify
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelling === order.id}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            {cancelling === order.id ? '...' : 'Cancel'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.location.href = '/dashboard/trade'}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-medium border border-gray-300 px-2 py-1 rounded"
                        >
                          Re-order
                        </button>
                        {order.status === 'executed' && order.product_type === 'MIS' && (
                          <button
                            type="button"
                            onClick={() => window.location.href = '/dashboard/positions'}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium border border-red-200 bg-red-50 px-2 py-1 rounded"
                          >
                            Exit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modifying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-groww-ink">Modify order — {modifying.symbol}</h3>
              <button type="button" onClick={() => setModifying(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-groww-muted mb-4">Only pending orders can be modified.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (shares)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  value={modifyQty}
                  onChange={(e) => setModifyQty(e.target.value)}
                />
              </div>
              {(modifying.order_mode === 'limit' || modifying.order_mode === 'sl' || modifying.order_mode === 'sl-m') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.05"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={modifyPrice}
                    onChange={(e) => setModifyPrice(e.target.value)}
                  />
                </div>
              )}
              {(modifying.order_mode === 'sl' || modifying.order_mode === 'sl-m') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Trigger price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.05"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={modifyTrigger}
                    onChange={(e) => setModifyTrigger(e.target.value)}
                  />
                </div>
              )}
            </div>
            {modifyErr && <p className="text-sm text-red-600 mt-3">{modifyErr}</p>}
            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setModifying(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={modifySaving}
                onClick={submitModify}
                className="px-4 py-2 rounded-lg bg-groww-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {modifySaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
