'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { portfolio } from '../../../lib/api';
import { Loader2, Download, Receipt, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function TradeBookPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [taxLoading, setTaxLoading] = useState(false);
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dailySummary, setDailySummary] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [lotAnalytics, setLotAnalytics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [lotFilter, setLotFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [summaryView, setSummaryView] = useState('overview');
  const [expandedId, setExpandedId] = useState(null);

  const filterParams = {
    limit: 5000,
    side: sideFilter === 'all' ? undefined : sideFilter,
    symbol: searchQuery || undefined,
    dateFilter: dateFilter === 'all' ? undefined : dateFilter,
    lotFilter: lotFilter === 'all' ? undefined : lotFilter,
    product: productFilter === 'all' ? undefined : productFilter
  };

  const loadTradeBook = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await portfolio.getTradeBook(filterParams);
      setTrades(data.trades || []);
      setSummary(data.summary || null);
      setDailySummary(data.dailySummary || []);
      setMonthlySummary(data.monthlySummary || []);
      setLotAnalytics(data.lotAnalytics || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sideFilter, searchQuery, dateFilter, lotFilter, productFilter]);

  useEffect(() => {
    const t = setTimeout(loadTradeBook, searchQuery ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadTradeBook]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await portfolio.exportTradesCsv(filterParams);
    } catch (e) {
      window.alert(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleTaxReport = async () => {
    setTaxLoading(true);
    try {
      await portfolio.exportTradeBookTax(filterParams);
    } catch (e) {
      window.alert(e.message || 'Report failed');
    } finally {
      setTaxLoading(false);
    }
  };

  if (loading && !summary) {
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
        <p className="text-groww-muted">Executed trades with lots, charges, and P&amp;L analytics</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Filter by stock..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-56"
        />
        <FilterChips value={sideFilter} onChange={setSideFilter} options={['all', 'BUY', 'SELL']} labels={['All sides', 'Buy', 'Sell']} />
        <FilterChips
          value={dateFilter}
          onChange={setDateFilter}
          options={['all', 'today', 'week', 'month']}
          labels={['All time', 'Today', 'Week', 'Month']}
        />
        <FilterChips
          value={lotFilter}
          onChange={setLotFilter}
          options={['all', '1', '2-5', '5plus']}
          labels={['All lots', '1 lot', '2–5 lots', '5+ lots']}
        />
        <FilterChips
          value={productFilter}
          onChange={setProductFilter}
          options={['all', 'CNC', 'MIS', 'NRML']}
          labels={['All products', 'CNC', 'MIS', 'NRML']}
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Trades" value={summary.tradeCount} />
          <Stat label="Total lots" value={summary.totalLots} />
          <Stat label="Turnover" value={fmt(summary.turnover)} />
          <Stat label="Realized P&amp;L" value={fmt(summary.realizedPnl)} positive={summary.realizedPnl >= 0} />
          <Stat label="Charges" value={fmt(summary.totalCharges)} />
          <Stat label="Margin used" value={fmt(summary.totalMarginUsed)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {['overview', 'daily', 'monthly', 'lots'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSummaryView(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              summaryView === v ? 'bg-groww-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {v === 'lots' ? 'Lot analytics' : v}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          disabled={exporting}
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-groww-primary/10 text-groww-primary disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'CSV'}
        </button>
        <button
          type="button"
          disabled={taxLoading}
          onClick={handleTaxReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 disabled:opacity-50"
        >
          <Receipt className="w-4 h-4" />
          {taxLoading ? '…' : 'Tax P&amp;L PDF'}
        </button>
      </div>

      {summaryView === 'daily' && (
        <SummaryTable
          headers={['Date', 'Trades', 'Lots', 'Turnover', 'Realized P&amp;L']}
          rows={dailySummary.map((d) => [
            d.date,
            d.tradeCount,
            d.totalLots,
            fmt(d.turnover),
            fmt(d.realizedPnl)
          ])}
        />
      )}
      {summaryView === 'monthly' && (
        <SummaryTable
          headers={['Month', 'Trades', 'Lots', 'Turnover', 'Realized P&amp;L']}
          rows={monthlySummary.map((m) => [
            m.month,
            m.tradeCount,
            m.totalLots,
            fmt(m.turnover),
            fmt(m.realizedPnl)
          ])}
        />
      )}
      {summaryView === 'lots' && lotAnalytics && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3">Trades by lot size</h3>
            <p className="text-sm text-gray-600">1 lot: {lotAnalytics.buckets.oneLot}</p>
            <p className="text-sm text-gray-600">2–5 lots: {lotAnalytics.buckets.twoToFive}</p>
            <p className="text-sm text-gray-600">5+ lots: {lotAnalytics.buckets.fivePlus}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3">Top symbols by lots</h3>
            {lotAnalytics.topByLots.map((s) => (
              <p key={s.symbol} className="text-sm text-gray-600">
                {s.symbol}: {s.totalLots} lots · {fmt(s.turnover)}
              </p>
            ))}
          </div>
        </div>
      )}

      {(summaryView === 'overview' || summaryView === 'lots') && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-500">
                <tr>
                  <th className="p-3 text-left" />
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Symbol</th>
                  <th className="p-3 text-left">Side / Product</th>
                  <th className="p-3 text-right">Lots</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">P&amp;L</th>
                  <th className="p-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No trades match filters.
                    </td>
                  </tr>
                ) : (
                  trades.map((t) => {
                    const open = expandedId === t.id;
                    const ch = t.charges || {};
                    return (
                      <Fragment key={t.id}>
                        <tr className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <button type="button" onClick={() => setExpandedId(open ? null : t.id)} className="text-gray-400">
                              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="p-3 text-gray-500 text-xs">
                            {new Date(t.timestamp).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{t.symbol}</div>
                            <div className="text-xs text-gray-400">{String(t.tradeId).slice(0, 8)}</div>
                          </td>
                          <td className="p-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${t.tradeType === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.tradeType}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">{t.productType}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-medium">{t.lotsLabel}</div>
                            <div className="text-xs text-gray-400">₹{t.perLotValue}/lot</div>
                          </td>
                          <td className="p-3 text-right">₹{t.price}</td>
                          <td className={`p-3 text-right font-medium ${t.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {t.tradeType === 'SELL' ? (t.pnl >= 0 ? '+' : '') + fmt(t.pnl) : '—'}
                          </td>
                          <td className="p-3 text-right font-bold">{fmt(t.totalValue)}</td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50 border-b">
                            <td colSpan={8} className="p-4 text-xs text-gray-600">
                              <div className="grid md:grid-cols-4 gap-4">
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Charges</p>
                                  <p>Brokerage: ₹{ch.brokerage}</p>
                                  <p>STT: ₹{ch.stt}</p>
                                  <p>GST: ₹{ch.gst}</p>
                                  <p className="font-medium">Total: ₹{ch.total}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Amounts</p>
                                  <p>Net: {fmt(t.netAmount)}</p>
                                  <p>Margin: {fmt(t.marginUsed)}</p>
                                  <p>P&amp;L/lot: {t.tradeType === 'SELL' ? fmt(t.pnlPerLot) : '—'}</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Order</p>
                                  <p>Mode: {t.orderMode}</p>
                                  <p>Lot size: {t.lotSize}</p>
                                  <p>Qty: {t.qty} shares</p>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 mb-1">Turnover split</p>
                                  <p>Buy: {fmt(summary?.buyTurnover)}</p>
                                  <p>Sell: {fmt(summary?.sellTurnover)}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChips({ value, onChange, options, labels }) {
  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
            value === opt ? 'bg-groww-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, positive }) {
  const color =
    positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : 'text-gray-800';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function SummaryTable({ headers, rows }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-3 text-left font-medium text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-6 text-center text-gray-500">
                No data for period
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="p-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
