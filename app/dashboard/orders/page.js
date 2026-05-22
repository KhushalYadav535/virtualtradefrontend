'use client';

import { useEffect, useState } from 'react';
import { trading } from '../../../lib/api';
import { usePortfolioStore, useMarketStore } from '../../../lib/store';
import { portfolio } from '../../../lib/api';
import { Loader2, XCircle } from 'lucide-react';
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
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
  const [validityFilter, setValidityFilter] = useState('all');
  const [lotFilter, setLotFilter] = useState('all');
  const [detailOrder, setDetailOrder] = useState(null);
  const [modifyLots, setModifyLots] = useState('');
  const setSummary = usePortfolioStore((s) => s.setSummary);

  const loadOrders = async () => {
    try {
      const { data } = await trading.getOrdersBook({ limit: 300 });
      setOrders(data.orders || []);
      setCounts(data.counts || {});
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
    const ls = order.lotSize || 1;
    setModifyQty(String(order.qty));
    setModifyLots(String(order.lots ?? order.qty / ls));
    setModifyPrice(order.price != null && order.price !== '' ? String(order.price) : '');
    setModifyTrigger(order.trigger_price != null && order.trigger_price !== '' ? String(order.trigger_price) : '');
    setModifyErr('');
  };

  const onModifyLotsChange = (lotsStr) => {
    setModifyLots(lotsStr);
    if (!modifying) return;
    const ls = modifying.lotSize || 1;
    const lots = parseFloat(lotsStr);
    if (Number.isFinite(lots) && lots > 0) setModifyQty(String(Math.round(lots * ls)));
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

  const orderTags = (o) => {
    const tags = [];
    if (o.is_amo) tags.push({ label: 'AMO', className: 'bg-purple-100 text-purple-800' });
    if (o.validity === 'GTT') tags.push({ label: 'GTT', className: 'bg-indigo-100 text-indigo-800' });
    if (o.validity === 'IOC') tags.push({ label: 'IOC', className: 'bg-sky-100 text-sky-800' });
    return tags;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'executed_today') {
      if (o.status !== 'executed') return false;
      const d = String(o.executedAt || o.executed_at || o.createdAt || o.created_at || '').slice(0, 10);
      if (d !== todayStr) return false;
    } else if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    const pt = o.productType || o.product_type;
    if (productFilter !== 'all' && pt !== productFilter) return false;
    if (validityFilter === 'amo' && !o.is_amo) return false;
    if (validityFilter === 'gtt' && o.validity !== 'GTT') return false;
    if (validityFilter === 'ioc' && o.validity !== 'IOC') return false;
    if (lotFilter === 'eq1' && (o.lotSize || 1) !== 1) return false;
    if (lotFilter === 'gt1' && (o.lotSize || 1) <= 1) return false;
    if (searchQuery && !o.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'time') {
      return new Date(b.createdAt || b.created_at || b.timestamp).getTime() - new Date(a.createdAt || a.created_at || a.timestamp).getTime();
    }
    if (sortBy === 'stock') return a.symbol.localeCompare(b.symbol);
    if (sortBy === 'lots') return (b.lots ?? b.qty) - (a.lots ?? a.qty);
    return 0;
  });

  const tabCount = (id) => {
    if (id === 'all') return counts.all;
    if (id === 'executed_today') return counts.executedToday;
    return counts[id];
  };

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
          { id: 'executed_today', label: 'Today' },
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
            {tabCount(tab.id) != null ? ` (${tabCount(tab.id)})` : ''}
          </button>
        ))}
        
        <div className="w-px bg-gray-300 mx-2" />
        
        {[
          { id: 'all', label: 'All types' },
          { id: 'amo', label: 'AMO' },
          { id: 'gtt', label: 'GTT' },
          { id: 'ioc', label: 'IOC' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setValidityFilter(tab.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              validityFilter === tab.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-groww-muted'
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
          <select
            value={lotFilter}
            onChange={(e) => setLotFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-groww-primary bg-white text-gray-700 font-medium cursor-pointer"
          >
            <option value="all">All lot sizes</option>
            <option value="eq1">Lot size 1</option>
            <option value="gt1">Lot size &gt; 1</option>
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
                <th className="text-left p-4 font-medium text-groww-muted">Product</th>
                <th className="text-right p-4 font-medium text-groww-muted">Qty</th>
                <th className="text-right p-4 font-medium text-groww-muted">Price</th>
                <th className="text-left p-4 font-medium text-groww-muted">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-groww-muted">
                    No orders matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-groww-border/70 hover:bg-groww-bg">
                    <td className="p-4 text-groww-muted">
                      <div>{new Date(order.createdAt || order.created_at).toLocaleString('en-IN')}</div>
                      {order.status === 'executed' && (order.executedAt || order.executed_at) && (
                        <div className="text-[10px] text-green-700 mt-0.5">
                          Exec: {new Date(order.executedAt || order.executed_at).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">
                      {order.symbol}
                      {order.name && order.name !== order.symbol && (
                        <div className="text-[10px] text-groww-muted font-normal">{order.name}</div>
                      )}
                    </td>
                    <td
                      className={`p-4 font-medium ${
                        order.order_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {order.order_type}
                    </td>
                    <td className="p-4 capitalize">{order.order_mode}</td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-groww-ink">{order.product_type || 'CNC'}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {orderTags(order).map((t) => (
                          <span key={t.label} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${t.className}`}>
                            {t.label}
                          </span>
                        ))}
                        {order.validity && order.validity !== 'DAY' && !orderTags(order).find((x) => x.label === order.validity) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                            {order.validity}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-groww-ink">
                        {order.lots != null ? (order.lotsWhole ? order.lots : order.lots.toFixed(2)) : order.qty} Lots
                      </div>
                      <div className="text-[10px] text-groww-muted">{order.qty} shares · lot {order.lotSize || 1}</div>
                      <div className={`text-[9px] mt-1 font-semibold ${order.lotValid !== false ? 'text-green-600' : 'text-red-500'}`}>
                        {order.lotValid !== false ? '✓ LOT VALID' : '⚠ INVALID SIZE'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-groww-ink">
                        ₹{(order.perLotValue ?? 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-groww-muted">
                        @ ₹{order.displayPrice ?? order.executedPrice ?? order.executed_price ?? order.price ?? 0} / share
                      </div>
                      {order.totalValue > 0 && (
                        <div className="text-[10px] text-groww-muted">Total ₹{order.totalValue.toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      {(order.status === 'rejected' || order.status === 'cancelled') && order.reject_reason && (
                         <div className="text-[10px] text-red-600 mt-2 font-medium max-w-[150px] leading-tight">
                            {order.reject_reason}
                         </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setDetailOrder(order)}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-medium border border-gray-200 px-2 py-1 rounded"
                        >
                          Details
                        </button>
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
                          onClick={() => {
                            const pt = order.productType || order.product_type || 'CNC';
                            window.location.href = `/dashboard/trade?symbol=${order.symbol}&exchange=${order.exchange || 'NSE'}&side=${order.order_type}&product=${pt}`;
                          }}
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
              {(modifying.lotSize || 1) > 1 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Lots (× {modifying.lotSize} shares)
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    value={modifyLots}
                    onChange={(e) => onModifyLotsChange(e.target.value)}
                  />
                </div>
              )}
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

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-groww-ink">{detailOrder.symbol}</h3>
                <p className="text-sm text-groww-muted">{detailOrder.name || detailOrder.symbol}</p>
              </div>
              <button type="button" onClick={() => setDetailOrder(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Order ID', detailOrder.orderId || detailOrder.id],
                ['Status', detailOrder.status],
                ['Side', detailOrder.order_type],
                ['Mode', detailOrder.order_mode],
                ['Product', detailOrder.productType || detailOrder.product_type],
                ['Exchange', detailOrder.exchange || 'NSE'],
                ['Lots', detailOrder.lotsLabel || `${detailOrder.lots} × ${detailOrder.lotSize}`],
                ['Qty', detailOrder.qty],
                ['Lot size', detailOrder.lotSize],
                ['Lot check', detailOrder.lotValidationMessage],
                ['Price', detailOrder.price != null ? `₹${detailOrder.price}` : '—'],
                ['Executed', detailOrder.executedPrice != null ? `₹${detailOrder.executedPrice}` : '—'],
                ['Per lot', detailOrder.perLotValue != null ? `₹${detailOrder.perLotValue}` : '—'],
                ['Total', detailOrder.totalValue != null ? `₹${detailOrder.totalValue}` : '—'],
                ['Validity', detailOrder.validity],
                ['AMO', detailOrder.is_amo ? 'Yes' : 'No'],
                ['Placed', detailOrder.createdAt || detailOrder.created_at],
                ['Executed at', detailOrder.executedAt || detailOrder.executed_at || '—']
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-groww-muted">{k}</dt>
                  <dd className="font-medium text-groww-ink break-all">{String(v ?? '—')}</dd>
                </div>
              ))}
            </dl>
            {detailOrder.reject_reason && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{detailOrder.reject_reason}</p>
            )}
            <button
              type="button"
              onClick={() => setDetailOrder(null)}
              className="mt-6 w-full py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
