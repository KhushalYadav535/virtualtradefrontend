'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { portfolio as portfolioApi } from '../../../lib/api';
import { usePortfolioStore } from '../../../lib/store';
import {
  TrendingUp, TrendingDown, BarChart3, Loader2, Download, FileText,
  ArrowUpRight, ArrowDownRight, Info, X, History, ShoppingCart, PieChart, Calendar, Printer
} from 'lucide-react';
import InfoTooltip from '../../../components/InfoTooltip';

const SORT_OPTIONS = [
  { id: 'pnlPercent', label: 'P&L %' },
  { id: 'value', label: 'Value' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'lots', label: 'Lots held' },
  { id: 'dayChange', label: 'Day change' }
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'profit', label: 'In profit' },
  { id: 'loss', label: 'In loss' },
  { id: 'fractional', label: 'Fractional lot' },
  { id: 'tradable_lots', label: 'Tradable lots' }
];

export default function PortfolioPage() {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [sortBy, setSortBy] = useState('pnlPercent');
  const [filter, setFilter] = useState('all');
  const [tradeModal, setTradeModal] = useState(null);
  const [tradesLoading, setTradesLoading] = useState(false);
  const setSummary = usePortfolioStore((s) => s.setSummary);

  const loadData = useCallback(async () => {
    try {
      const [detailRes, summaryRes] = await Promise.all([
        portfolioApi.getHoldingsDetail({ sortBy, filter }),
        portfolioApi.getSummary()
      ]);
      setDetail(detailRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, filter, setSummary]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const openTrades = async (symbol) => {
    setTradeModal({ symbol, trades: [] });
    setTradesLoading(true);
    try {
      const { data } = await portfolioApi.getHoldingTrades(symbol);
      setTradeModal({ symbol, trades: data });
    } catch {
      setTradeModal({ symbol, trades: [], error: true });
    } finally {
      setTradesLoading(false);
    }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      if (type === 'csv') await portfolioApi.exportHoldingsCsv();
      else if (type === 'pdf') await portfolioApi.exportHoldingsPdf();
      else await portfolioApi.exportHoldingsReport();
    } catch {
      alert('Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  const holdings = detail?.holdings || [];
  const totals = detail?.totals || {};
  const analytics = detail?.analytics || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-groww-ink">Holdings</h1>
          <p className="text-groww-muted">Delivery (CNC) positions — lot breakdown & analytics</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={!!exporting || holdings.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-groww-border rounded-lg text-sm font-medium hover:bg-groww-bg disabled:opacity-50"
          >
            {exporting === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting || holdings.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-groww-border rounded-lg text-sm font-medium hover:bg-groww-bg disabled:opacity-50"
          >
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            PDF
          </button>
          <button
            type="button"
            onClick={() => handleExport('report')}
            disabled={!!exporting || holdings.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-groww-border rounded-lg text-sm font-medium hover:bg-groww-bg disabled:opacity-50"
          >
            {exporting === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            HTML
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="groww-card p-5">
          <p className="text-xs text-groww-muted uppercase tracking-wide">Holdings value</p>
          <p className="text-2xl font-bold text-groww-ink mt-1">₹{(totals.holdingsValue || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="groww-card p-5">
          <p className="text-xs text-groww-muted uppercase tracking-wide">Invested</p>
          <p className="text-2xl font-bold text-groww-ink mt-1">₹{(totals.investedValue || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="groww-card p-5">
          <p className="text-xs text-groww-muted uppercase tracking-wide">Total P&L</p>
          <p className={`text-2xl font-bold mt-1 ${(totals.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(totals.totalPnL || 0) >= 0 ? '+' : ''}₹{Math.abs(totals.totalPnL || 0).toLocaleString('en-IN')}
            <span className="text-sm font-medium ml-1">({totals.totalPnLPercent || 0}%)</span>
          </p>
        </div>
        <div className="groww-card p-5">
          <p className="text-xs text-groww-muted uppercase tracking-wide">Total lots · Day</p>
          <p className="text-2xl font-bold text-groww-ink mt-1">{totals.totalLotsHeld || 0} lots</p>
          <p className={`text-sm mt-1 ${(totals.totalDayChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Day {(totals.totalDayChange || 0) >= 0 ? '+' : ''}₹{Math.abs(totals.totalDayChange || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {(analytics.corporateActionsUpcoming?.length > 0) && (
        <div className="groww-card p-4 border-indigo-100 bg-indigo-50/60">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Corporate actions (your holdings)
          </h3>
          <p className="text-xs text-indigo-700 mt-1 mb-3">Simulated calendar for learning — not live NSE data.</p>
          <ul className="space-y-2">
            {analytics.corporateActionsUpcoming.map((a) => (
              <li key={`${a.symbol}-${a.exDate}-${a.type}`} className="text-sm flex flex-wrap gap-x-2 gap-y-1">
                <Link href={`/dashboard/stock/${a.symbol}`} className="font-semibold text-groww-primary">{a.symbol}</Link>
                <span className="text-indigo-800 capitalize">{a.type}</span>
                <span className="text-groww-muted">· ex {a.exDate}</span>
                <span className="w-full text-xs text-indigo-700">{a.title} — {a.impact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(analytics.fractionalHoldings?.length > 0) && (
        <div className="groww-card p-4 border-amber-200 bg-amber-50/80 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold flex items-center gap-2">
              Fractional lot holdings ({analytics.fractionalHoldings.length})
              <InfoTooltip text="MIS sells only in complete lots. Fractional shares (e.g. 13 when lot=10) cannot be sold via MIS until you complete the next lot. CNC delivery can sell any quantity." />
            </p>
            <p className="mt-1 text-amber-800">
              MIS sells only in complete lots. CNC delivery can sell any share. Extra shares below 1 lot cannot be sold via MIS.
            </p>
            <p className="mt-2 text-xs text-amber-700">
              {analytics.fractionalHoldings.map((f) => `${f.symbol} (+${f.fractionalShares} sh)`).join(' · ')}
            </p>
            {analytics.fractionalBuySuggestions?.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {analytics.fractionalBuySuggestions.map((s, i) => (
                  <li key={i} className="text-blue-800">💡 {s.message} (est. ₹{s.estCost?.toLocaleString('en-IN')})</li>
                ))}
              </ul>
            )}
            {analytics.fractionalCombinations?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs font-semibold text-amber-800 mb-1">Suggestions to consolidate:</p>
                {analytics.fractionalCombinations.map((c, i) => (
                  <p key={i} className="text-xs text-amber-700 mt-1">{c.message}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics */}
      {holdings.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="groww-card p-5">
            <h3 className="text-sm font-semibold text-groww-ink flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-600" /> Top gainers
            </h3>
            <ul className="mt-3 space-y-2">
              {(analytics.topGainers || []).slice(0, 5).map((h) => (
                <li key={h.symbol} className="flex justify-between text-sm">
                  <Link href={`/dashboard/stock/${h.symbol}`} className="font-medium text-groww-primary hover:underline">{h.symbol}</Link>
                  <span className="text-green-600">+{h.pnlPercent}%</span>
                </li>
              ))}
              {!(analytics.topGainers?.length) && <p className="text-sm text-groww-muted">—</p>}
            </ul>
          </div>
          <div className="groww-card p-5">
            <h3 className="text-sm font-semibold text-groww-ink flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-red-600" /> Top losers
            </h3>
            <ul className="mt-3 space-y-2">
              {(analytics.topLosers || []).slice(0, 5).map((h) => (
                <li key={h.symbol} className="flex justify-between text-sm">
                  <Link href={`/dashboard/stock/${h.symbol}`} className="font-medium text-groww-primary hover:underline">{h.symbol}</Link>
                  <span className="text-red-600">{h.pnlPercent}%</span>
                </li>
              ))}
              {!(analytics.topLosers?.length) && <p className="text-sm text-groww-muted">—</p>}
            </ul>
          </div>
          <div className="groww-card p-5">
            <h3 className="text-sm font-semibold text-groww-ink flex items-center gap-2">
              <PieChart className="w-4 h-4 text-groww-primary" /> Sector breakdown
            </h3>
            <ul className="mt-3 space-y-2">
              {(analytics.sectorBreakdown || []).slice(0, 6).map((s) => (
                <li key={s.sector} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-groww-ink">{s.sector}</span>
                    <span className="text-groww-muted">{s.weightPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-groww-bg rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-groww-primary rounded-full" style={{ width: `${s.weightPercent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sort / filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-sm border border-groww-border rounded-lg px-3 py-2 bg-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>Sort: {o.label}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setFilter(o.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                filter === o.id
                  ? 'bg-groww-primary text-white border-groww-primary'
                  : 'border-groww-border text-groww-muted hover:bg-groww-bg'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Holdings table */}
      <div className="groww-card overflow-hidden">
        {holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-groww-bg text-left">
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted">Stock</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted">Qty / Lots</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted">Tradable</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted text-right">Avg · LTP</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted text-right">Value · P&L</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted text-right">Day</th>
                  <th className="py-3 px-4 text-xs font-medium text-groww-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const pnlUp = h.pnl >= 0;
                  const dayUp = h.dayChange >= 0;
                  return (
                    <tr
                      key={h.symbol}
                      className={`border-b border-groww-border/70 ${h.hasFractional ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/stock/${h.symbol}`} className="font-semibold text-groww-ink hover:text-groww-primary">
                          {h.symbol}
                        </Link>
                        <p className="text-xs text-groww-muted truncate max-w-[140px]">{h.name}</p>
                        <p className="text-[10px] text-groww-muted">{h.sector}</p>
                        {h.hasCorporateAction && (
                          <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1" title={h.corporateActionHint}>
                            <Calendar className="w-3 h-3 shrink-0" />
                            {h.corporateActionHint}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="font-medium">{h.qty} sh</span>
                        <p className="text-xs text-groww-muted">{h.completeLotsLabel}</p>
                        {h.hasFractional && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            +{h.fractionalShares} non-MIS
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-groww-muted">
                        <div>CNC: {h.tradableQtyCnc}</div>
                        <div>MIS: {h.tradableQtyMis} ({h.tradableLotsMis} lots)</div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        <div>₹{h.avgBuyPrice?.toFixed(2)}</div>
                        <div className="text-groww-ink font-medium">₹{h.currentPrice?.toLocaleString('en-IN')}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        <div className="font-medium">₹{h.currentValue?.toLocaleString('en-IN')}</div>
                        <div className={pnlUp ? 'text-green-600' : 'text-red-600'}>
                          {pnlUp ? '+' : ''}₹{h.pnl?.toFixed(2)} ({h.pnlPercent}%)
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-right text-sm ${dayUp ? 'text-green-600' : 'text-red-600'}`}>
                        {dayUp ? '+' : ''}₹{Math.abs(h.dayChange).toFixed(0)}
                        <div className="text-xs">({h.dayChangePercent}%)</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          <Link
                            href={`/dashboard/trade?symbol=${h.symbol}&side=SELL&product=CNC`}
                            className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Sell
                          </Link>
                          <Link
                            href={`/dashboard/trade?symbol=${h.symbol}&side=BUY&product=CNC`}
                            className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            Add
                          </Link>
                          <button
                            type="button"
                            onClick={() => openTrades(h.symbol)}
                            className="px-2 py-1 text-xs font-medium rounded bg-groww-bg text-groww-muted hover:text-groww-ink"
                          >
                            <History className="w-3 h-3 inline" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-groww-muted">No holdings match this filter</p>
            <Link href="/dashboard/trade" className="inline-flex items-center gap-2 mt-4 text-groww-primary font-medium">
              <ShoppingCart className="w-4 h-4" /> Start trading
            </Link>
          </div>
        )}
      </div>

      {/* Trade history modal */}
      {tradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{tradeModal.symbol} — Trades</h3>
              <button type="button" onClick={() => setTradeModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {tradesLoading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-groww-primary" />
              ) : tradeModal.trades?.length ? (
                <ul className="space-y-2">
                  {tradeModal.trades.map((t) => (
                    <li key={t.id} className="flex justify-between text-sm border-b pb-2">
                      <span className={t.trade_type === 'BUY' ? 'text-green-600' : 'text-red-600'}>{t.trade_type}</span>
                      <span>{t.qty} @ ₹{parseFloat(t.trade_price).toFixed(2)}</span>
                      <span className="text-groww-muted">{new Date(t.timestamp).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-groww-muted text-center">No trades for this symbol</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
