'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { market } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';
import { t, getLocaleFromUser } from '../../../lib/i18n';

export default function SectorsPage() {
  const { user } = useAuthStore();
  const locale = getLocaleFromUser(user);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    market
      .getSectorAnalytics()
      .then(({ data }) => setSectors(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PieChart className="w-7 h-7 text-indigo-600" />
          {t('sectors', locale)} analytics
        </h1>
        <p className="text-gray-500">Nifty 50 stocks grouped by sector (live quotes)</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sectors.map((s) => (
          <div key={s.sector} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === s.sector ? null : s.sector)}
              className="w-full p-4 text-left hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{s.sector}</h3>
                  <p className="text-xs text-gray-500">{s.count} stocks</p>
                </div>
                <span
                  className={`text-sm font-bold flex items-center gap-1 ${
                    s.avgChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {s.avgChangePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {s.avgChangePercent}%
                </span>
              </div>
              {s.topGainer && (
                <p className="text-xs text-gray-500 mt-2">
                  Top: {s.topGainer.symbol} ({s.topGainer.changePercent?.toFixed(2)}%)
                </p>
              )}
            </button>
            {expanded === s.sector && (
              <div className="border-t px-4 pb-4 max-h-48 overflow-y-auto">
                {s.stocks.map((st) => (
                  <Link
                    key={st.symbol}
                    href={`/dashboard/trade?symbol=${st.symbol}`}
                    className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0 hover:text-groww-primary"
                  >
                    <span className="font-medium">{st.symbol}</span>
                    <span className={st.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {st.changePercent?.toFixed(2)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
