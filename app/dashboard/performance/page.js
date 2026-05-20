"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Loader2 } from 'lucide-react';
import { portfolio } from '../../../lib/api';

export default function PerformancePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    portfolio.getPerformance(days)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const startValue = data.length > 0 ? data[0].value : 0;
  const endValue = data.length > 0 ? data[data.length - 1].value : 0;
  const netPnl = endValue - startValue;
  const pnlPercent = startValue > 0 ? (netPnl / startValue) * 100 : 0;
  const isProfitable = netPnl >= 0;

  // For charts
  const maxVal = Math.max(...data.map(d => Math.abs(d.pnl) || 1));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Performance Analytics</h1>
        <div className="bg-white rounded-lg shadow-sm border p-1 flex space-x-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === d ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-2xl border text-white ${isProfitable ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white/80">Net P&L</h3>
            {isProfitable ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <p className="text-3xl font-bold">₹{Math.abs(netPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-white/80 mt-1">{isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%</p>
        </div>

        <div className="p-6 rounded-2xl border bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <h3 className="font-medium">Total Trades</h3>
            <Activity size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-800">{data.reduce((sum, d) => sum + (d.tradeCount || 0), 0)}</p>
          <p className="text-gray-400 text-sm mt-1">In last {days} days</p>
        </div>

        <div className="p-6 rounded-2xl border bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <h3 className="font-medium">Ending Portfolio Value</h3>
            <DollarSign size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-800">₹{endValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className="text-gray-400 text-sm mt-1">As of today</p>
        </div>
      </div>

      {/* Bar Chart Representation using Tailwind */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Daily Realized P&L</h3>
        <div className="h-64 flex items-end justify-between gap-1 overflow-x-auto pb-4">
          {data.map((d, i) => {
            const heightPct = Math.max(2, (Math.abs(d.pnl) / maxVal) * 100);
            const isPos = d.pnl >= 0;
            return (
              <div key={i} className="flex flex-col items-center group relative min-w-[30px] flex-1">
                {/* Tooltip */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                  {d.date.split('T')[0]}<br />
                  <span className={isPos ? 'text-green-400' : 'text-red-400'}>
                    ₹{d.pnl.toLocaleString('en-IN')}
                  </span>
                </div>
                
                {/* Bar */}
                <div 
                  className={`w-full max-w-[40px] rounded-t-sm transition-all duration-500 ${isPos ? 'bg-emerald-400 group-hover:bg-emerald-500' : 'bg-rose-400 group-hover:bg-rose-500'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 border-t pt-4 mt-2">
          <span>{data[0]?.date.split('T')[0]}</span>
          <span>{data[data.length - 1]?.date.split('T')[0]}</span>
        </div>
      </div>
    </div>
  );
}