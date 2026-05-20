'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { portfolio as portfolioApi } from '../../../lib/api';
import { TrendingUp, Loader2 } from 'lucide-react';

Chart.register(...registerables);

export default function PerformancePage() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadPerformance();
  }, [days]);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const { data } = await portfolioApi.getPerformance(days);
      setPerformance(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current || performance.length === 0) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: performance.map(p => {
          const d = new Date(p.date);
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        }),
        datasets: [{
          label: 'Portfolio Value',
          data: performance.map(p => p.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `₹${context.raw?.toLocaleString() || 0}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6b7280' }
          },
          y: {
            grid: { color: '#e5e7eb' },
            ticks: {
              color: '#6b7280',
              callback: (value) => '₹' + (value / 100000).toFixed(1) + 'L'
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [performance]);

  const totalPnL = performance.length > 0 ? performance[performance.length - 1].value - 1000000 : 0;
  const totalPnLPercent = totalPnL / 1000000 * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Portfolio Performance</h1>
          <p className="text-gray-500">Track your trading performance over time</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-gray-800">
            ₹{performance.length > 0 ? performance[performance.length - 1].value?.toLocaleString() : '0'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total P&L</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()} ({totalPnLPercent.toFixed(2)}%)
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-gray-800">
            {performance.reduce((sum, p) => sum + (p.tradeCount || 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-800">Portfolio Value Over Time</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="h-80">
            <canvas ref={chartRef}></canvas>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Daily Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Portfolio Value</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Daily P&L</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Trades</th>
              </tr>
            </thead>
            <tbody>
              {performance.slice().reverse().map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">
                    ₹{p.value?.toLocaleString()}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${parseFloat(p.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(p.pnl || 0) >= 0 ? '+' : ''}₹{parseFloat(p.pnl || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">{p.tradeCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {performance.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No performance data yet</p>
            <p className="text-sm text-gray-400">Start trading to see your performance</p>
          </div>
        )}
      </div>
    </div>
  );
}