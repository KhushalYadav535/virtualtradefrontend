'use client';

import { useEffect, useState } from 'react';
import { market } from '../../../lib/api';
import { Loader2, Clock, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export default function MarketStatusPage() {
  const [status, setStatus] = useState(null);
  const [indices, setIndices] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, indicesRes, gainersRes, losersRes] = await Promise.all([
        market.getStatus(),
        market.getIndices(),
        market.getGainers(),
        market.getLosers()
      ]);
      setStatus(statusRes.data);
      setIndices(indicesRes.data);
      setGainers(gainersRes.data);
      setLosers(losersRes.data);
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

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Market Status</h1>
        <p className="text-gray-500">NSE/BSE market timings and current status</p>
      </div>

      <div className={`rounded-xl p-6 border ${
        status?.isOpen ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status?.isOpen ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${status?.isOpen ? 'text-green-700' : 'text-gray-700'}`}>
                Market {status?.isOpen ? 'Open' : 'Closed'}
              </h2>
              <p className="text-gray-500">{status?.message}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Next Open</div>
            <div className="font-medium">{formatTime(status?.nextOpen)}</div>
            <div className="text-sm text-gray-500 mt-1">Next Close</div>
            <div className="font-medium">{formatTime(status?.nextClose)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Indices</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {indices.map((idx, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">{idx.symbol}</p>
                  <p className="text-2xl font-bold text-gray-800">₹{idx.ltp?.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 ${idx.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-medium">{idx.changePercent?.toFixed(2)}%</span>
                </div>
              </div>
              <p className={`text-sm ${idx.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {idx.change >= 0 ? '+' : ''}₹{idx.change?.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800">Top Gainers</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {gainers.slice(0, 10).map((g, i) => (
              <div key={i} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium text-gray-800">{g.symbol}</p>
                  <p className="text-sm text-gray-500">₹{g.ltp?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">+{g.changePercent?.toFixed(2)}%</p>
                  <p className="text-sm text-green-600">+₹{g.change?.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {gainers.length === 0 && (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-800">Top Losers</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {losers.slice(0, 10).map((l, i) => (
              <div key={i} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium text-gray-800">{l.symbol}</p>
                  <p className="text-sm text-gray-500">₹{l.ltp?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">{l.changePercent?.toFixed(2)}%</p>
                  <p className="text-sm text-red-600">₹{l.change?.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {losers.length === 0 && (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Market Timings</p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Regular Session:</strong> 9:15 AM - 3:30 PM IST (Monday to Friday)<br/>
              <strong>Weekend:</strong> Market is closed on Saturday and Sunday<br/>
              <strong>Holidays:</strong> Market remains closed on public holidays
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}