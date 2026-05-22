'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { advanced } from '../lib/api';

export default function MarketDepthPanel({ symbol }) {
  const [depth, setDepth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return undefined;
    const load = () =>
      advanced
        .getDepth(symbol)
        .then((r) => setDepth(r.data))
        .catch(() => setDepth(null))
        .finally(() => setLoading(false));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-groww-primary" />
      </div>
    );
  }

  if (!depth) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Market Depth</h3>
        <span className="text-xs text-gray-400">Spread ₹{depth.spread} ({depth.spreadPct}%)</span>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">{depth.note}</p>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-green-700 mb-2">Bids</p>
          {depth.bids?.map((b) => (
            <div key={b.level} className="flex justify-between py-0.5">
              <span className="text-green-700 font-mono">{b.price}</span>
              <span className="text-gray-600">{b.qty}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-medium text-red-700 mb-2">Asks</p>
          {depth.asks?.map((a) => (
            <div key={a.level} className="flex justify-between py-0.5">
              <span className="text-red-700 font-mono">{a.price}</span>
              <span className="text-gray-600">{a.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Bid {depth.totalBidQty} · Ask {depth.totalAskQty} · Imbalance {depth.imbalancePct}%
      </p>
    </div>
  );
}
