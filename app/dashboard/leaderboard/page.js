'use client';

import { useEffect, useState } from 'react';
import { leaderboard as leaderboardApi } from '../../../lib/api';
import { Loader2, Trophy, Medal, ArrowUp, ArrowDown } from 'lucide-react';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [filterBatch, filterPeriod]);

  const loadData = async () => {
    try {
      const params = { limit: 100 };
      if (filterBatch) params.batchId = filterBatch;
      if (filterPeriod) params.period = filterPeriod;

      const [leaderboardRes, batchesRes] = await Promise.all([
        leaderboardApi.get(params),
        leaderboardApi.getBatches()
      ]);
      setEntries(leaderboardRes.data);
      setBatches(batchesRes.data);
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

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center font-medium text-gray-500">{rank}</span>;
  };

  const getReturnColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leaderboard</h1>
          <p className="text-gray-500">Ranked by total portfolio value (cash + holdings)</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {batches.length > 0 && (
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Top Traders</h2>
              <p className="text-sm text-gray-500">Auto-refreshes every minute</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Rank</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Batch</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Portfolio Value</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Total Returns</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Returns %</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {getRankIcon(user.rank)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        user.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        user.rank === 2 ? 'bg-gray-100 text-gray-700' :
                        user.rank === 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-gray-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">{user.batchName || '—'}</td>
                  <td className="py-4 px-6 text-right font-bold text-gray-800">
                    ₹{user.portfolioValue?.toLocaleString()}
                  </td>
                  <td className={`py-4 px-6 text-right font-medium ${getReturnColor(user.totalReturns)}`}>
                    <div className="flex items-center justify-end gap-1">
                      {user.totalReturns >= 0 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      {user.totalReturns >= 0 ? '+' : ''}₹{user.totalReturns?.toLocaleString()}
                    </div>
                  </td>
                  <td className={`py-4 px-6 text-right font-medium ${getReturnColor(user.totalReturns)}`}>
                    {user.totalReturns >= 0 ? '+' : ''}{user.totalReturnsPercent?.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No traders yet</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Disclaimer:</strong> Leaderboard rankings are based on virtual portfolio values.
          This is a paper trading simulation for educational purposes only. No real money is involved.
        </p>
      </div>
    </div>
  );
}
