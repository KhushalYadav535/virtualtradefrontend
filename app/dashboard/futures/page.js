'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { advanced, trading } from '../../../lib/api';

export default function FuturesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(null);
  const [rolling, setRolling] = useState(null);
  const [result, setResult] = useState('');

  const load = () => {
    setLoading(true);
    advanced
      .getFutures()
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const buyLot = async (c) => {
    if (!window.confirm(`Buy 1 lot ${c.symbol} futures (NRML)?`)) return;
    setPlacing(c.symbol);
    setResult('');
    try {
      await trading.placeOrder({
        symbol: c.symbol,
        qty: c.lotSize,
        orderType: 'BUY',
        orderMode: 'market',
        productType: 'NRML'
      });
      setResult(`Bought 1 lot ${c.symbol}`);
      load();
    } catch (e) {
      setResult(e.response?.data?.message || e.response?.data?.error || 'Failed');
    } finally {
      setPlacing(null);
    }
  };

  const sellPosition = async (c) => {
    if (!window.confirm(`Sell ${c.heldQty} shares of ${c.symbol}?`)) return;
    setPlacing(c.symbol);
    setResult('');
    try {
      await trading.placeOrder({
        symbol: c.symbol,
        qty: c.heldQty,
        orderType: 'SELL',
        orderMode: 'market',
        productType: 'NRML'
      });
      setResult(`Closed position in ${c.symbol}`);
      load();
    } catch (e) {
      setResult(e.response?.data?.message || e.response?.data?.error || 'Failed');
    } finally {
      setPlacing(null);
    }
  };

  const rollover = async (c) => {
    if (!window.confirm(`Roll over ${c.symbol} position to next month?`)) return;
    setRolling(c.symbol);
    setResult('');
    try {
      const { data: r } = await advanced.futuresRollover(c.symbol);
      setResult(r.message || `Rolled over ${r.qty} ${r.symbol}. P&L: ₹${r.pnl}`);
      load();
    } catch (e) {
      setResult(e.response?.data?.error || e.response?.data?.message || 'Rollover failed');
    } finally {
      setRolling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Futures</h1>
          <p className="text-sm text-gray-500">Expiry: {data?.expiry} · {data?.disclaimer}</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
      </div>

      {result && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">{result}</div>
      )}

      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Contract</th>
              <th className="p-3">LTP</th>
              <th className="p-3">Lot</th>
              <th className="p-3">Lot value</th>
              <th className="p-3">Margin/lot</th>
              {data?.contracts?.some((c) => c.heldQty > 0) && <th className="p-3">Held</th>}
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {data?.contracts?.map((c) => (
              <tr key={c.symbol} className={`border-t ${c.heldQty > 0 ? 'bg-amber-50' : ''}`}>
                <td className="p-3">
                  <Link href={`/dashboard/stock/${c.symbol}`} className="font-semibold text-groww-primary">{c.label}</Link>
                  <p className="text-xs text-gray-400">{c.contractSymbol}</p>
                  {c.nearExpiry && <span className="text-xs text-red-500 font-medium">Near expiry</span>}
                </td>
                <td className="p-3">₹{c.ltp?.toLocaleString('en-IN')}</td>
                <td className="p-3">{c.lotSize}</td>
                <td className="p-3">₹{c.lotValue?.toLocaleString('en-IN')}</td>
                <td className="p-3">₹{c.marginPerLot?.toLocaleString('en-IN')}</td>
                {data?.contracts?.some((x) => x.heldQty > 0) && (
                  <td className="p-3">
                    {c.heldQty > 0 ? (
                      <span className="text-sm font-medium">
                        {c.heldQty} @ ₹{c.heldAvg}
                      </span>
                    ) : '-'}
                  </td>
                )}
                <td className="p-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={placing === c.symbol}
                      onClick={() => buyLot(c)}
                      className="text-xs bg-groww-primary text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {placing === c.symbol ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy 1 lot'}
                    </button>
                    {c.heldQty > 0 && (
                      <>
                        <button
                          type="button"
                          disabled={placing === c.symbol}
                          onClick={() => sellPosition(c)}
                          className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          disabled={rolling === c.symbol}
                          onClick={() => rollover(c)}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                        >
                          {rolling === c.symbol ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Rollover
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
