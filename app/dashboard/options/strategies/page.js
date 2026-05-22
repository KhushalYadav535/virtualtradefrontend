'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { advanced } from '../../../../lib/api';

const SYMBOLS = ['NIFTY', 'BANKNIFTY', 'RELIANCE'];

export default function OptionsStrategiesPage() {
  const [symbol, setSymbol] = useState('NIFTY');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (sym) => {
    setLoading(true);
    try {
      const res = await advanced.getOptionsStrategies({ symbol: sym });
      setData(res.data);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(symbol);
  }, [symbol, load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Options Strategies</h1>
          <p className="text-sm text-gray-500">
            <Link href="/dashboard/options" className="text-groww-primary hover:underline">Option chain</Link>
            {' · '}P&L calculator from live/sim chain
          </p>
        </div>
        <div className="flex gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${symbol === s ? 'bg-groww-primary text-white' : 'bg-gray-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <p className="text-sm text-gray-600">
          Spot ₹{data.spot?.toLocaleString('en-IN')} · Lot {data.lotSize} · Expiry {data.expiry} · Source {data.source}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {data?.strategies?.map((st) => (
            <div key={st.id} className="bg-white border rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full text-left p-4 flex justify-between items-center"
                onClick={() => setExpanded(expanded === st.id ? null : st.id)}
              >
                <div>
                  <p className="font-bold text-gray-900">{st.name}</p>
                  <p className="text-xs text-gray-500">{st.outlook} · Net debit ₹{st.netDebit?.toLocaleString('en-IN')}</p>
                </div>
                <span className="text-sm text-groww-primary">{expanded === st.id ? '−' : '+'}</span>
              </button>
              {expanded === st.id && (
                <div className="px-4 pb-4 border-t text-sm space-y-2">
                  <p>Max profit: {typeof st.maxProfit === 'number' ? `₹${st.maxProfit.toLocaleString('en-IN')}` : st.maxProfit}</p>
                  <p>Max loss: ₹{typeof st.maxLoss === 'number' ? st.maxLoss.toLocaleString('en-IN') : st.maxLoss}</p>
                  <p>Breakeven: {st.breakevens?.join(', ')}</p>
                  <ul className="mt-2 space-y-1">
                    {st.legs?.map((leg, i) => (
                      <li key={i} className="text-gray-600">
                        {leg.action} {leg.type} @ {leg.strike} · prem ₹{leg.premium} × {st.lotSize}
                        {leg.note ? ` (${leg.note})` : ''}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 mt-2">{st.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
