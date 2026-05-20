"use client";

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { portfolio } from '../../../lib/api';

export default function TimeLossPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    setLoading(true);
    portfolio.getTimeLoss(period)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  const { activeSummary, stats, losingTrades } = data;
  const isLoss = activeSummary.netPnl < 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Time Loss Analytics</h1>
        <div className="bg-white rounded-lg shadow-sm border p-1 flex space-x-1">
          {['week', 'month', 'quarter'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                period === p ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loss Summary Card */}
        <div className={`p-8 rounded-2xl border text-white ${isLoss ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20 shadow-lg' : 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-green-500/20 shadow-lg'}`}>
          <div className="flex items-center mb-6">
            <Clock size={28} className="mr-3 opacity-80" />
            <h2 className="text-xl font-bold">Net Result ({period})</h2>
          </div>
          <p className="text-5xl font-extrabold mb-2">
            ₹{Math.abs(activeSummary.netPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-lg opacity-90 mb-6">
            {isLoss ? 'Total Capital Lost' : 'Total Capital Gained'}
          </p>

          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-6">
            <div>
              <p className="text-sm opacity-80 mb-1">Total Profits</p>
              <p className="text-xl font-bold text-green-100">+₹{activeSummary.gain.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Total Losses</p>
              <p className="text-xl font-bold text-red-100">-₹{Math.abs(activeSummary.loss).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Analytics Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Risk Metrics</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <XCircle className="text-rose-500 mr-3" size={20} />
                <span className="font-medium text-gray-700">Losing Trades</span>
              </div>
              <span className="text-lg font-bold text-rose-600">{stats.lossTradeCount}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <CheckCircle className="text-emerald-500 mr-3" size={20} />
                <span className="font-medium text-gray-700">Winning Trades</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{activeSummary.lossTradeCount > 0 ? '---' : 'Check Log'}</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center">
                <AlertTriangle className="text-red-500 mr-3" size={20} />
                <span className="font-medium text-red-800">Worst Day Loss</span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {stats.worstDay ? `₹${Math.abs(stats.worstDay.pnl).toLocaleString()}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Losing Trades Log */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Recent Capital Bleeds (Losing Trades)</h3>
        </div>
        
        {losingTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 font-semibold border-b">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Symbol</th>
                  <th className="py-3 px-6">Qty</th>
                  <th className="py-3 px-6">Exit Price</th>
                  <th className="py-3 px-6 text-right">Loss Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {losingTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-red-50/50 transition-colors">
                    <td className="py-3 px-6 text-gray-600">{new Date(trade.timestamp).toLocaleDateString()}</td>
                    <td className="py-3 px-6 font-bold text-gray-800">{trade.symbol}</td>
                    <td className="py-3 px-6 text-gray-600">{trade.qty}</td>
                    <td className="py-3 px-6 text-gray-600">₹{trade.tradePrice.toLocaleString()}</td>
                    <td className="py-3 px-6 text-right font-bold text-rose-600">
                      ₹{trade.pnl.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <CheckCircle size={48} className="text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-gray-800">No losing trades in this period!</p>
            <p className="text-sm mt-1">Excellent risk management.</p>
          </div>
        )}
      </div>
    </div>
  );
}
