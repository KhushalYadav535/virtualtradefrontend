'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { market, trading } from '../../../lib/api';

const SYMBOLS = [
  { id: 'NIFTY', label: 'NIFTY 50' },
  { id: 'BANKNIFTY', label: 'BANK NIFTY' },
  { id: 'RELIANCE', label: 'RELIANCE' }
];

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [expiry, setExpiry] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const loadChain = useCallback(async (sym, exp) => {
    setLoading(true);
    try {
      const res = await market.getOptionChain(sym, exp || undefined);
      setData(res.data);
      if (res.data?.expiry && !exp) {
        setExpiry(res.data.expiry);
      }
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setExpiry('');
    loadChain(symbol, '');
  }, [symbol, loadChain]);

  useEffect(() => {
    if (!expiry || !data) return undefined;
    const id = setInterval(() => loadChain(symbol, expiry), 30000);
    return () => clearInterval(id);
  }, [symbol, expiry, data, loadChain]);

  const handleExpiryChange = (newExpiry) => {
    setExpiry(newExpiry);
    loadChain(symbol, newExpiry);
  };

  const handlePlaceOrder = async (contract, type) => {
    if (!contract?.symbol) return;
    if (!window.confirm(`Buy 1 lot of ${contract.symbol}?`)) return;

    setPlacing(true);
    try {
      await trading.placeOrder({
        symbol: contract.symbol,
        exchange: 'NSE',
        qty: contract.lotSize,
        orderType: type,
        orderMode: 'market',
        productType: 'NRML'
      });
      alert(`Success! Bought 1 lot of ${contract.symbol}`);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  const step = symbol === 'BANKNIFTY' ? 100 : 50;
  const isLive = data?.source === 'nse';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Options Chain</h1>
          <p className="text-sm text-gray-500">Live data from NSE India</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border">
            {SYMBOLS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSymbol(s.id)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  symbol === s.id ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {data?.expiryDates?.length > 0 && (
            <select
              value={expiry || data.expiry || ''}
              onChange={(e) => handleExpiryChange(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {data.expiryDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => loadChain(symbol, expiry)}
            disabled={loading}
            className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !data ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center">
          <AlertCircle className="mr-2 inline w-5 h-5" /> Failed to load options chain
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4 flex flex-wrap justify-between items-center gap-4 text-white">
            <div>
              <p className="text-indigo-200 text-sm font-medium uppercase tracking-wider">{data.symbol} Spot</p>
              <h2 className="text-3xl font-bold">
                ₹{Number(data.underlyingValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="text-right space-y-1">
              <p className="text-indigo-200 text-sm">Expiry</p>
              <p className="font-semibold">{data.expiry || '—'}</p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded ${
                  isLive ? 'bg-green-500/30 text-green-100' : 'bg-amber-500/30 text-amber-100'
                }`}
              >
                {isLive ? 'Live · NSE' : 'Simulated fallback'}
              </span>
            </div>
          </div>

          {data.source === 'simulated' && data.error && (
            <div className="bg-amber-50 text-amber-800 text-sm px-4 py-2 border-b border-amber-100">
              NSE unavailable ({data.error}). Showing estimated premiums.
            </div>
          )}

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm text-center">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b sticky top-0 z-10">
                <tr>
                  <th colSpan="4" className="py-3 px-2 border-r">
                    CALLS (CE)
                  </th>
                  <th className="py-3 px-4 bg-gray-100">STRIKE</th>
                  <th colSpan="4" className="py-3 px-2 border-l">
                    PUTS (PE)
                  </th>
                </tr>
                <tr className="text-xs uppercase tracking-wider">
                  <th className="py-2 px-2 border-r">OI</th>
                  <th className="py-2 px-2 border-r">Vol</th>
                  <th className="py-2 px-2 border-r">IV</th>
                  <th className="py-2 px-4 border-r">LTP</th>
                  <th className="py-2 px-4 bg-gray-100 font-bold text-gray-700">PRICE</th>
                  <th className="py-2 px-4 border-l">LTP</th>
                  <th className="py-2 px-2 border-l">IV</th>
                  <th className="py-2 px-2 border-l">Vol</th>
                  <th className="py-2 px-2 border-l">OI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.options.map((row) => {
                  const isAtm = Math.abs(row.strike - data.underlyingValue) < step / 2;

                  return (
                    <tr key={row.strike} className={`hover:bg-gray-50 ${isAtm ? 'bg-indigo-50/50' : ''}`}>
                      <td className="py-2 px-2 border-r text-gray-500 text-xs">
                        {row.call ? (row.call.oi / 100000).toFixed(1) + 'L' : '—'}
                      </td>
                      <td className="py-2 px-2 border-r text-gray-400 text-xs">
                        {row.call?.volume?.toLocaleString('en-IN') ?? '—'}
                      </td>
                      <td className="py-2 px-2 border-r text-gray-400 text-xs">
                        {row.call?.iv != null ? `${row.call.iv}%` : '—'}
                      </td>
                      <td className="py-2 px-4 border-r">
                        {row.call ? (
                          <button
                            type="button"
                            disabled={placing || !row.call.symbol}
                            onClick={() => handlePlaceOrder(row.call, 'BUY')}
                            className="font-bold text-green-600 hover:text-white hover:bg-green-500 px-2 py-1 rounded transition-colors disabled:opacity-40"
                          >
                            ₹{row.call.ltp}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td
                        className={`py-2 px-4 bg-gray-50/50 font-bold ${isAtm ? 'text-indigo-600' : 'text-gray-700'}`}
                      >
                        {row.strike}
                      </td>

                      <td className="py-2 px-4 border-l">
                        {row.put ? (
                          <button
                            type="button"
                            disabled={placing || !row.put.symbol}
                            onClick={() => handlePlaceOrder(row.put, 'BUY')}
                            className="font-bold text-red-500 hover:text-white hover:bg-red-500 px-2 py-1 rounded transition-colors disabled:opacity-40"
                          >
                            ₹{row.put.ltp}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 px-2 border-l text-gray-400 text-xs">
                        {row.put?.iv != null ? `${row.put.iv}%` : '—'}
                      </td>
                      <td className="py-2 px-2 border-l text-gray-400 text-xs">
                        {row.put?.volume?.toLocaleString('en-IN') ?? '—'}
                      </td>
                      <td className="py-2 px-2 border-l text-gray-500 text-xs">
                        {row.put ? (row.put.oi / 100000).toFixed(1) + 'L' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
