'use client';

import { useEffect, useState } from 'react';
import { portfolio as portfolioApi, wallet as walletApi } from '../../../lib/api';
import { usePortfolioStore, useMarketStore } from '../../../lib/store';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Loader2, Clock, Download } from 'lucide-react';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const setSummary = usePortfolioStore((s) => s.setSummary);
  const { prices } = useMarketStore();

  const handleExport = async () => {
    setExporting(true);
    try {
      await portfolioApi.exportHoldingsCsv();
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

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
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  const totalInvested = holdings.reduce((sum, h) => sum + h.investedValue, 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const realizedPnL = wallet?.total_profit || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-groww-ink">Portfolio</h1>
          <p className="text-groww-muted">Track your holdings and performance</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || holdings.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-groww-border rounded-lg text-sm font-medium hover:bg-groww-bg disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="groww-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-groww-primary-light rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-groww-primary" />
            </div>
            <span className="text-groww-muted text-sm">Cash Balance</span>
          </div>
          <p className="text-2xl font-bold text-groww-ink">₹{wallet?.balance?.toLocaleString() || 0}</p>
        </div>

        <div className="groww-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-groww-muted text-sm">Holdings Value</span>
          </div>
          <p className="text-2xl font-bold text-groww-ink">₹{totalCurrentValue.toLocaleString()}</p>
        </div>

        <div className="groww-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-groww-muted text-sm">Realized P&L</span>
          </div>
          <p className={`text-2xl font-bold ${realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString()}
          </p>
        </div>

        <div className="groww-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totalPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <span className="text-groww-muted text-sm">Unrealized P&L</span>
          </div>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="groww-card overflow-hidden">
          <div className="p-6 border-b border-groww-border">
            <h2 className="text-lg font-semibold text-groww-ink">Holdings</h2>
          </div>
          {holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-groww-bg">
                    <th className="text-left py-3 px-4 text-sm font-medium text-groww-muted">Symbol</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">Avg Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">LTP</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">Current Value</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={i} className="border-b border-groww-border/70">
                      <td className="py-3 px-4 font-medium text-groww-ink">{h.symbol}</td>
                      <td className="py-3 px-4 text-right text-groww-muted">
                        {(() => {
                          const lotSize = prices[h.symbol]?.lotSize || 1;
                          const completeLots = Math.floor(h.qty / lotSize);
                          const fractionalShares = h.qty % lotSize;
                          return (
                            <>
                              <div className="font-medium text-groww-ink">{h.qty}</div>
                              <div className="text-[10px] text-groww-muted">
                                {completeLots > 0 ? `${completeLots} Lots` : ''} 
                                {completeLots > 0 && fractionalShares > 0 ? ' + ' : ''}
                                {fractionalShares > 0 ? `${fractionalShares} shares` : ''}
                                {completeLots === 0 && fractionalShares === 0 ? '0 shares' : ''}
                              </div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right text-groww-muted">₹{parseFloat(h.avgBuyPrice || h.avg_buy_price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-groww-ink">₹{parseFloat(h.currentPrice || h.current_price || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium text-groww-ink">₹{h.currentValue?.toLocaleString()}</td>
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
              <p className="text-groww-muted">No holdings yet</p>
              <p className="text-sm text-gray-400">Start trading to build your portfolio</p>
            </div>
          )}
        </div>

        <div className="groww-card overflow-hidden">
          <div className="p-6 border-b border-groww-border">
            <h2 className="text-lg font-semibold text-groww-ink">Trade History</h2>
          </div>
          {trades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-groww-bg">
                    <th className="text-left py-3 px-4 text-sm font-medium text-groww-muted">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-groww-muted">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-groww-muted">Symbol</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-groww-muted">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={i} className="border-b border-groww-border/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-groww-muted">
                          <Clock className="w-3 h-3" />
                          {new Date(t.timestamp).toLocaleDateString()}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-medium ${t.trade_type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.trade_type}
                      </td>
                      <td className="py-3 px-4 font-medium text-groww-ink">{t.symbol}</td>
                      <td className="py-3 px-4 text-right text-groww-muted">{t.qty}</td>
                      <td className="py-3 px-4 text-right text-groww-ink">₹{parseFloat(t.trade_price).toLocaleString()}</td>
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
              <p className="text-groww-muted">No trades yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}