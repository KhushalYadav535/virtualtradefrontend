'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Filter, Loader2 } from 'lucide-react';
import { leaderboard } from '../../../lib/api';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (period !== 'all') params.period = period;
    leaderboard
      .get(params)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="font-bold text-gray-500">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-yellow-50/50 border-yellow-200';
    if (rank === 2) return 'bg-gray-50/80 border-gray-200';
    if (rank === 3) return 'bg-amber-50/30 border-amber-200';
    return 'bg-white border-transparent hover:bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-indigo-600 p-8 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center mb-2">
            <Trophy className="mr-3 w-8 h-8 text-yellow-400" /> Global Leaderboard
          </h1>
          <p className="text-indigo-200">See how you rank against other top traders!</p>
        </div>

        <div className="flex space-x-2 bg-indigo-700/50 p-1 rounded-lg backdrop-blur-sm border border-indigo-500/30">
          {[
            { id: 'all', label: 'All-Time' },
            { id: 'month', label: 'This Month' },
            { id: 'week', label: 'This Week' }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                period === p.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-6 w-16 text-center">Rank</th>
                <th className="py-4 px-6">Trader Name</th>
                <th className="py-4 px-6">Batch / Group</th>
                <th className="py-4 px-6 text-right">Portfolio Value</th>
                <th className="py-4 px-6 text-right">Total Returns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((user) => {
                const isProfitable = user.totalReturns >= 0;
                return (
                  <tr key={user.id} className={`transition-colors border-l-4 ${getRankBg(user.rank)}`}>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center items-center">{getRankIcon(user.rank)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-gray-900 text-base">{user.name}</div>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
                        {user.batchName || 'Public Pool'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-gray-800 text-base">
                      ₹{user.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div
                        className={`font-bold flex items-center justify-end text-base ${
                          isProfitable ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isProfitable ? (
                          <TrendingUp className="mr-1 w-4 h-4" />
                        ) : (
                          <TrendingDown className="mr-1 w-4 h-4" />
                        )}
                        {isProfitable ? '+' : ''}₹
                        {Math.abs(user.totalReturns).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div
                        className={`text-xs font-semibold ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {isProfitable ? '+' : ''}
                        {user.totalReturnsPercent}%
                      </div>
                    </td>
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No traders found for this period.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
