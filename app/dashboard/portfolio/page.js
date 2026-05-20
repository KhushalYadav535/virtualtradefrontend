'use client';

import { useEffect, useState } from 'react';
import { portfolio as portfolioApi, wallet as walletApi } from '../../../lib/api';
import { usePortfolioStore } from '../../../lib/store';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Loader2, Clock } from 'lucide-react';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const setSummary = usePortfolioStore((s) => s.setSummary);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [holdingsRes, walletRes, tradesRes, summaryRes] = await Promise.all([
        portfolioApi.getHoldings(),
        walletApi.get(),
        portfolioApi.getTrades(),
        portfolioApi.getSummary()
      ]);
      setHoldings(holdingsRes.data);
      setWallet(walletRes.data);
      setTrades(tradesRes.data.slice(0, 50));
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const realizedPnL = wallet?.total_profit || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Portfolio</h1>
          <p className="text-gray-500">Track your holdings and performance</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-500 text-sm">Cash Balance</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{wallet?.balance?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-500 text-sm">Holdings Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{totalCurrentValue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500 text-sm">Realized P&L</span>
          </div>
          <p className={`text-2xl font-bold ${realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <span className="text-gray-500 text-sm">Unrealized P&L</span>
          </div>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Holdings</h2>
          </div>
          {holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Symbol</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Avg Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">LTP</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Current Value</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium text-gray-800">{h.symbol}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{h.qty}</td>
                      <td className="py-3 px-4 text-right text-gray-600">₹{parseFloat(h.avgBuyPrice || h.avg_buy_price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-gray-800">₹{parseFloat(h.currentPrice || h.current_price || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-800">₹{h.currentValue?.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-medium ${h.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toFixed(2)} ({h.pnlPercent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No holdings yet</p>
              <p className="text-sm text-gray-400">Start trading to build your portfolio</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Trade History</h2>
          </div>
          {trades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Symbol</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(t.timestamp).toLocaleDateString()}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-medium ${t.trade_type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.trade_type}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{t.symbol}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{t.qty}</td>
                      <td className="py-3 px-4 text-right text-gray-800">₹{parseFloat(t.trade_price).toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-medium ${parseFloat(t.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(t.pnl || 0) !== 0 ? `${parseFloat(t.pnl) >= 0 ? '+' : ''}₹${parseFloat(t.pnl).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No trades yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}