'use client';

import { useEffect, useState, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { portfolio as portfolioApi } from '../../../lib/api';
import { TrendingDown, TrendingUp, Loader2, Clock, AlertTriangle } from 'lucide-react';

Chart.register(...registerables);

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: '3 Months' },
  { value: 'all', label: 'All Time' }
];

function PnlCard({ title, data }) {
  if (!data) return null;
  const isLoss = data.netPnl < 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${isLoss ? 'text-red-600' : 'text-green-600'}`}>
        {data.netPnl >= 0 ? '+' : ''}₹{data.netPnl?.toLocaleString('en-IN')}
      </p>
      <div className="mt-2 flex gap-4 text-xs">
        <span className="text-red-500">Loss: ₹{Math.abs(data.loss || 0).toLocaleString('en-IN')}</span>
        <span className="text-green-600">Gain: ₹{(data.gain || 0).toLocaleString('en-IN')}</span>
      </div>
      {data.lossTradeCount > 0 && (
        <p className="mt-1 text-xs text-gray-400">{data.lossTradeCount} losing trade(s)</p>
      )}
    </div>
  );
}

export default function TimeLossPage() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: res } = await portfolioApi.getTimeLoss(period);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const timeline = [...(data?.dailyTimeline || [])].reverse();

  useEffect(() => {
    if (!chartRef.current || timeline.length === 0) return;

    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeline.map((d) =>
          new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        ),
        datasets: [
          {
            label: 'Daily P&L',
            data: timeline.map((d) => d.pnl),
            backgroundColor: timeline.map((d) =>
              d.pnl >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.75)'
            ),
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw;
                return `${v >= 0 ? '+' : ''}₹${Number(v).toLocaleString('en-IN')}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 45 } },
          y: {
            grid: { color: '#e5e7eb' },
            ticks: {
              color: '#6b7280',
              callback: (v) => '₹' + Number(v).toLocaleString('en-IN')
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [timeline]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const active = data?.activeSummary;
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Time Loss</h1>
          <p className="text-gray-500">Track your losses and gains over time</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PnlCard title="Today" data={data?.periods?.today} />
        <PnlCard title="This Week" data={data?.periods?.week} />
        <PnlCard title="This Month" data={data?.periods?.month} />
        <PnlCard title="All Time" data={data?.periods?.all} />
      </div>

      {active && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            active.isLoss ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
          }`}
        >
          {active.isLoss ? (
            <TrendingDown className="h-5 w-5 shrink-0 text-red-600" />
          ) : (
            <TrendingUp className="h-5 w-5 shrink-0 text-green-600" />
          )}
          <div>
            <p className={`font-semibold ${active.isLoss ? 'text-red-800' : 'text-green-800'}`}>
              {PERIODS.find((p) => p.value === period)?.label}:{' '}
              {active.netPnl >= 0 ? 'Net profit' : 'Net loss'} of ₹
              {Math.abs(active.netPnl).toLocaleString('en-IN')}
            </p>
            {data?.unrealizedPnL !== undefined && period === 'today' && (
              <p className="mt-1 text-sm text-gray-600">
                Unrealized P&L on open positions: ₹{data.unrealizedPnL?.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Total Loss</p>
            <p className="text-xl font-bold text-red-600">
              ₹{Math.abs(stats.totalLoss || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Total Gain</p>
            <p className="text-xl font-bold text-green-600">
              ₹{(stats.totalGain || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Losing Trades</p>
            <p className="text-xl font-bold text-gray-800">{stats.lossTradeCount || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">Worst Day</p>
            <p className="text-xl font-bold text-red-600">
              {stats.worstDay ? `₹${stats.worstDay.pnl?.toLocaleString('en-IN')}` : '—'}
            </p>
            {stats.worstDay && (
              <p className="text-xs text-gray-400">
                {new Date(stats.worstDay.date).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">P&L Timeline</h2>
        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : timeline.length > 0 ? (
          <div className="h-72">
            <canvas ref={chartRef} />
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-gray-500">
            <Clock className="mb-2 h-10 w-10 text-gray-300" />
            <p>No trades in this period</p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 p-6">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-800">Losing Trades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Symbol</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Loss</th>
              </tr>
            </thead>
            <tbody>
              {(data?.losingTrades || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No losing trades in this period
                  </td>
                </tr>
              ) : (
                data.losingTrades.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(t.timestamp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.symbol}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{t.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-800">
                      ₹{t.tradePrice?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      ₹{t.pnl?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
