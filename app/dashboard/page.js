'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolio, market, leaderboard } from '../../lib/api';
import { useAuthStore, usePortfolioStore, useMarketStore } from '../../lib/store';
import { isStaffRole } from '../../lib/roles';
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUp, ArrowDown, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [indices, setIndices] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const { summary, setSummary } = usePortfolioStore();
  const { prices } = useMarketStore();
  const { user, authReady } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (isStaffRole(user?.role)) {
      router.replace('/dashboard/admin');
    }
  }, [authReady, user?.role, router]);

  useEffect(() => {
    if (!authReady || isStaffRole(user?.role)) return;
    loadData();
    const marketInterval = setInterval(loadMarketStatus, 60000);
    return () => clearInterval(marketInterval);
  }, []);

  const loadMarketStatus = async () => {
    try {
      const { data } = await market.getStatus();
      setMarketStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      const [summaryRes, indicesRes, leaderboardRes] = await Promise.all([
        portfolio.getSummary(),
        market.getIndices(),
        leaderboard.get({ limit: 5 })
      ]);
      setSummary(summaryRes.data);
      setIndices(indicesRes.data);
      setLeaderboard(leaderboardRes.data.slice(0, 5));
      await loadMarketStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || isStaffRole(user?.role) || loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6">
      {marketStatus && (
        <div className={`rounded-lg p-3 flex items-center justify-between ${
          marketStatus.isOpen ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${marketStatus.isOpen ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${marketStatus.isOpen ? 'text-green-700' : 'text-gray-600'}`}>
              Market {marketStatus.isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {marketStatus.isOpen ? 'Trading active' : `Next open: ${new Date(marketStatus.nextOpen).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's your portfolio overview.</p>
      </div>

      {indices.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {indices.map((idx, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{idx.symbol}</p>
                  <p className="text-2xl font-bold text-gray-800">₹{idx.ltp?.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 ${idx.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.changePercent >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span className="font-medium">{idx.changePercent?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-gray-500">Cash Balance</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{summary?.cashBalance?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-gray-500">Holdings Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{summary?.holdingsValue?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-500">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{summary?.totalValue?.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${summary?.totalReturns >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {summary?.totalReturns >= 0 ? <ArrowUp className="w-5 h-5 text-green-600" /> : <ArrowDown className="w-5 h-5 text-red-600" />}
            </div>
            <span className="text-gray-500">Total Returns</span>
          </div>
          <p className={`text-2xl font-bold ${summary?.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary?.totalReturns >= 0 ? '+' : ''}₹{summary?.totalReturns?.toLocaleString()} ({summary?.totalReturnsPercent?.toFixed(2)}%)
          </p>
          {summary?.dayPnL !== undefined && (
            <p className={`text-sm mt-1 ${summary?.dayPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              Today: {summary?.dayPnL >= 0 ? '+' : ''}₹{summary?.dayPnL?.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Holdings</h2>
          <div className="space-y-3">
            {summary?.holdings?.slice(0, 5).map((h, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{h.symbol}</p>
                  <p className="text-sm text-gray-500">{h.qty} shares @ ₹{h.avgBuyPrice?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">₹{h.currentValue?.toLocaleString()}</p>
                  <p className={`text-sm ${h.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toFixed(2)} ({h.pnlPercent}%)
                  </p>
                </div>
              </div>
            ))}
            {(!summary?.holdings || summary.holdings.length === 0) && (
              <p className="text-gray-500 text-center py-4">No holdings yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Leaderboard</h2>
            <button onClick={() => router.push('/dashboard/leaderboard')} className="text-blue-500 text-sm">View All</button>
          </div>
          <div className="space-y-3">
            {leaderboard.map((user, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-800' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>{i + 1}</span>
                  <span className="font-medium text-gray-800">{user.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">₹{user.portfolioValue?.toLocaleString()}</p>
                  <p className={`text-sm ${user.totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {user.totalReturns >= 0 ? '+' : ''}₹{user.totalReturns?.toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Disclaimer:</strong> This is a paper trading simulation for educational purposes only. No real money is involved.
        </p>
      </div>
    </div>
  );
}