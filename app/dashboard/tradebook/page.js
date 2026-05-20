'use client';

import { useEffect, useState, useMemo } from 'react';
import { portfolio } from '../../../lib/api';
import { useMarketStore } from '../../../lib/store';
import { Loader2, Download, Receipt } from 'lucide-react';

export default function TradeBookPage() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { prices } = useMarketStore();

  const loadTrades = async () => {
    try {
      const { data } = await portfolio.getTrades(5000);
      setTrades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    let result = trades;
    if (sideFilter !== 'all') result = result.filter((t) => t.trade_type === sideFilter);
    if (searchQuery) result = result.filter((t) => t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter((t) => {
        const td = new Date(t.timestamp);
        if (dateFilter === 'today') return td.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const diff = now.getTime() - td.getTime();
          return diff <= 7 * 24 * 60 * 60 * 1000;
        }
        if (dateFilter === 'month') {
          return td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    return result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [trades, sideFilter, searchQuery, dateFilter]);

  const { buyVal, sellVal } = useMemo(() => {
    let b = 0;
    let s = 0;
    filteredTrades.forEach((t) => {
      const val = parseFloat(t.trade_price) * t.qty;
      if (t.trade_type === 'BUY') b += val;
      else s += val;
    });
    return { buyVal: b, sellVal: s };
  }, [filteredTrades]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await portfolio.exportTradesCsv();
    } catch (e) {
      window.alert(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-groww-ink">Trade Book</h1>
        <p className="text-groww-muted">Detailed log of executed trades from your trade history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Filter by stock..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-groww-primary w-64"
        />

        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {['all', 'BUY', 'SELL'].map((tab) => (
            <button
              key={`side-${tab}`}
              type="button"
              onClick={() => setSideFilter(tab)}
              className={`px-4 py-2 text-sm font-medium ${
                sideFilter === tab ? 'bg-groww-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'all' ? 'All Sides' : tab}
            </button>
          ))}
        </div>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {['all', 'today', 'week', 'month'].map((tab) => (
            <button
              key={`date-${tab}`}
              type="button"
              onClick={() => setDateFilter(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                dateFilter === tab ? 'bg-groww-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab === 'all' ? 'All Time' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Turnover Summary</h3>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-groww-primary/10 text-groww-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-groww-primary/20 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Preparing…' : 'Export CSV'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Buy</p>
              <p className="text-xl font-bold text-green-600">
                ₹{buyVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Sell</p>
              <p className="text-xl font-bold text-red-600">
                ₹{sellVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
          <Receipt className="w-8 h-8 text-gray-400 mb-2" />
          <h3 className="font-bold text-gray-800 mb-1">Tax P&amp;L Statement</h3>
          <p className="text-xs text-gray-500 mb-3">Generate official statement for tax filing</p>
          <button
            type="button"
            onClick={() => window.alert('Tax P&L statement generation will be sent to your registered email address.')}
            className="text-sm font-semibold text-groww-primary hover:underline"
          >
            Request Statement
          </button>
        </div>
      </div>

      {/* Trade Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="text-left p-4 font-medium">Time</th>
                <th className="text-left p-4 font-medium">Trade ID</th>
                <th className="text-left p-4 font-medium">Symbol</th>
                <th className="text-left p-4 font-medium">Side</th>
                <th className="text-right p-4 font-medium">Qty (Lots)</th>
                <th className="text-right p-4 font-medium">Price</th>
                <th className="text-right p-4 font-medium">P&amp;L</th>
                <th className="text-right p-4 font-medium">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No executed trades found matching filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const lotSize = prices[t.symbol]?.lotSize || 1;
                  const lots = t.qty / lotSize;
                  const price = parseFloat(t.trade_price);
                  const pnl = t.pnl != null ? parseFloat(t.pnl) : 0;
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-gray-500">
                        {new Date(t.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-500 uppercase">{String(t.id).slice(0, 8)}</td>
                      <td className="p-4 font-semibold text-gray-800">{t.symbol}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            t.trade_type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {t.trade_type}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-semibold text-gray-800">{t.qty}</div>
                        <div className="text-xs text-gray-500">{lots % 1 === 0 ? lots : lots.toFixed(2)} lots</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-semibold text-gray-800">
                          ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          1 lot: ₹{(price * lotSize).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold text-gray-800">
                        ₹{(price * t.qty).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
