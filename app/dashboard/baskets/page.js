'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Play, Trash2, Share2 } from 'lucide-react';
import { advanced } from '../../../lib/api';

export default function BasketsPage() {
  const [baskets, setBaskets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('My Basket');
  const [symbol, setSymbol] = useState('RELIANCE');
  const [lots, setLots] = useState(1);
  const [items, setItems] = useState([]);
  const [executing, setExecuting] = useState(null);

  const load = () =>
    advanced
      .listBaskets()
      .then((r) => setBaskets(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const addItem = () => {
    if (!symbol.trim()) return;
    setItems([...items, { symbol: symbol.toUpperCase(), lots: parseInt(lots, 10) || 1, orderType: 'BUY', productType: 'MIS' }]);
  };

  const saveBasket = async () => {
    if (!items.length) return alert('Add at least one stock');
    await advanced.createBasket({ name, items });
    setItems([]);
    setName('My Basket');
    load();
  };

  const runBasket = async (id) => {
    if (!window.confirm('Execute all orders in this basket?')) return;
    setExecuting(id);
    try {
      const { data } = await advanced.executeBasket(id);
      alert(`Done: ${data.successCount} ok, ${data.failCount} failed`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Execute failed');
    } finally {
      setExecuting(null);
    }
  };

  const removeBasket = async (id) => {
    if (!window.confirm('Delete basket?')) return;
    await advanced.deleteBasket(id);
    load();
  };

  const copyShare = (token) => {
    const url = `${window.location.origin}/dashboard/baskets?share=${token}`;
    navigator.clipboard?.writeText(url);
    alert('Share link copied');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800">Basket Orders</h1>
      <p className="text-gray-600 text-sm">Compose lot-based multi-stock baskets and execute them together (paper trading).</p>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">Create basket</h2>
        <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Basket name" />
        <div className="flex flex-wrap gap-2">
          <input className="border rounded-lg px-3 py-2 flex-1 min-w-[120px]" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" />
          <input type="number" min={1} className="border rounded-lg px-3 py-2 w-24" value={lots} onChange={(e) => setLots(e.target.value)} />
          <button type="button" onClick={addItem} className="px-4 py-2 bg-gray-100 rounded-lg font-medium">Add</button>
        </div>
        {items.length > 0 && (
          <ul className="text-sm space-y-1">
            {items.map((it, i) => (
              <li key={i} className="flex justify-between">
                <span>{it.symbol} · {it.lots} lot(s) · {it.productType}</span>
                <button type="button" className="text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={saveBasket} className="flex items-center gap-2 bg-groww-primary text-white px-4 py-2 rounded-lg font-semibold">
          <Plus className="w-4 h-4" /> Save basket
        </button>
      </div>

      <div className="space-y-3">
        {baskets.map((b) => (
          <div key={b.id} className="bg-white border rounded-xl p-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-gray-900">{b.name}</h3>
                <p className="text-sm text-gray-500">{b.itemCount} stocks · {b.totalLots} lots · Margin ~₹{b.marginRequired?.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => copyShare(b.shareToken)} className="p-2 border rounded-lg" title="Share">
                  <Share2 className="w-4 h-4" />
                </button>
                <button type="button" disabled={executing === b.id} onClick={() => runBasket(b.id)} className="p-2 bg-green-600 text-white rounded-lg">
                  <Play className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => removeBasket(b.id)} className="p-2 border border-red-200 text-red-600 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <ul className="mt-3 text-sm text-gray-600 grid sm:grid-cols-2 gap-1">
              {b.items?.map((it) => (
                <li key={it.id || it.symbol}>
                  <Link href={`/dashboard/stock/${it.symbol}`} className="text-groww-primary hover:underline">{it.symbol}</Link>
                  {' '}· {it.lots}L · ₹{it.orderValue?.toLocaleString('en-IN')}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!baskets.length && <p className="text-gray-500">No baskets yet.</p>}
      </div>
    </div>
  );
}
