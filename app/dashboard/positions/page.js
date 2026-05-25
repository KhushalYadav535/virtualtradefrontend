'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, XCircle, Plus, AlertTriangle } from 'lucide-react';
import { portfolio as portfolioApi } from '../../../lib/api';
import { usePortfolioStore, useMarketStore } from '../../../lib/store';
import { initSocket } from '../../../lib/socket';

export default function PositionsPage() {
  const setSummary = usePortfolioStore((s) => s.setSummary);
  const prices = useMarketStore((s) => s.prices);
  const updatePrices = useMarketStore((s) => s.updatePrices);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [squaring, setSquaring] = useState(null);
  const [error, setError] = useState('');
  const [managePos, setManagePos] = useState(null);
  const [partialLots, setPartialLots] = useState('1');
  const [convertLots, setConvertLots] = useState('1');
  const [partialBusy, setPartialBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);
  const [buildHistory, setBuildHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const positions = detail?.positions || [];
  const totals = detail?.totals || {};
  const autoSq = detail?.autoSquareOff || {};

  const load = useCallback(async () => {
    try {
      const { data } = await portfolioApi.getPositionsDetail();
      setDetail(data);
      setError('');
    } catch (e) {
      const status = e.response?.status;
      if (status === 404) {
        setError('Positions API not found. Restart backend (npm run dev in backend/).');
      } else {
        setError(
          e.response?.data?.error ||
            e.response?.data?.message ||
            (e.message === 'Network Error' ? 'Cannot reach API.' : 'Failed to load positions')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    initSocket();
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const refreshSummary = async () => {
    try {
      const { data } = await portfolioApi.getSummary();
      setSummary(data);
    } catch {
      /* ignore */
    }
  };

  const openManage = async (p) => {
    const maxLots = Math.max(1, p.lots || 1);
    setPartialLots('1');
    setConvertLots(String(maxLots));
    setManagePos(p);
    setBuildHistory([]);
    setHistoryLoading(true);
    try {
      const { data } = await portfolioApi.getPositionHistory(p.symbol);
      setBuildHistory(Array.isArray(data) ? data : []);
    } catch {
      setBuildHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePartialSquareOff = async () => {
    if (!managePos) return;
    const maxLots = Math.max(1, managePos.lots || 1);
    const lots = parseInt(partialLots, 10);
    if (!Number.isFinite(lots) || lots < 1 || lots > maxLots) {
      setError(`Enter lots between 1 and ${maxLots}`);
      return;
    }
    const qty = lots * (managePos.lotSize || 1);
    setPartialBusy(true);
    setError('');
    try {
      await portfolioApi.squareOffPosition(managePos.symbol, { qty });
      setManagePos(null);
      await load();
      await refreshSummary();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Partial square-off failed');
    } finally {
      setPartialBusy(false);
    }
  };

  const handleConvertCnc = async () => {
    if (!managePos) return;
    const maxLots = Math.max(1, managePos.lots || 1);
    const lots = parseInt(convertLots, 10);
    if (!Number.isFinite(lots) || lots < 1 || lots > maxLots) {
      setError(`Enter lots between 1 and ${maxLots} for conversion`);
      return;
    }
    const qty = lots * (managePos.lotSize || 1);
    setConvertBusy(true);
    setError('');
    try {
      await portfolioApi.convertMisToCnc(managePos.symbol, { qty });
      setManagePos(null);
      await load();
      await refreshSummary();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Convert to CNC failed');
    } finally {
      setConvertBusy(false);
    }
  };

  const handleSquareOff = async (symbol) => {
    setSquaring(symbol);
    setError('');
    try {
      await portfolioApi.squareOffPosition(symbol, {});
      await load();
      await refreshSummary();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Square-off failed');
    } finally {
      setSquaring(null);
    }
  };

  const handleSquareOffAll = async () => {
    if (!positions.length) return;
    if (!window.confirm('Square off all intraday (MIS) positions at market price?')) return;
    setSquaring('ALL');
    setError('');
    try {
      await portfolioApi.squareOffAllPositions();
      await load();
      await refreshSummary();
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Square-off failed');
    } finally {
      setSquaring(null);
    }
  };

  const livePositions = positions.map((p) => {
    const live = prices[p.symbol];
    if (!live?.ltp) return p;
    const ltp = live.ltp;
    const invested = p.avgBuyPrice * p.qty;
    const currentValue = ltp * p.qty;
    const pnl = currentValue - invested;
    const lots = p.lots || 1;
    const charges = p.charges?.total || 0;
    return {
      ...p,
      currentPrice: ltp,
      currentValue: parseFloat(currentValue.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercent: invested > 0 ? parseFloat(((pnl / invested) * 100).toFixed(2)) : 0,
      pnlPerLot: parseFloat((pnl / lots).toFixed(2)),
      netPnl: parseFloat((pnl - charges).toFixed(2))
    };
  });

  const totalPnl = livePositions.reduce((s, p) => s + (p.pnl || 0), 0);
  const totalNetPnl = livePositions.reduce((s, p) => s + (p.netPnl || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Intraday positions</h1>
          <p className="text-gray-500">MIS — lot-based P&L, square-off & convert to delivery</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {positions.length > 0 && (
            <button
              type="button"
              disabled={squaring === 'ALL'}
              onClick={handleSquareOffAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {squaring === 'ALL' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Square off all
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

      {autoSq.warning && (
        <div className="bg-amber-50 border border-amber-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800">Auto Square-off Warning (3:15 PM)</h4>
            <p className="text-sm text-amber-700 mt-1">{autoSq.message}</p>
          </div>
        </div>
      )}

      {autoSq.executing && (
        <div className="bg-red-50 border border-red-400 p-4 rounded-xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h4 className="font-semibold text-red-800">Auto Square-off (3:20 PM)</h4>
            <p className="text-sm text-red-700 mt-1">{autoSq.message}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Open positions</p>
          <p className="text-2xl font-bold text-gray-800">{totals.count ?? positions.length}</p>
          <p className="text-xs text-gray-400 mt-1">{totals.totalLots ?? 0} total lots</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Margin blocked</p>
          <p className="text-2xl font-bold text-gray-800">₹{(totals.totalMargin || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Unrealized P&L</p>
          <p className={`text-2xl font-bold flex items-center gap-1 ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Net P&L (after est. charges)</p>
          <p className={`text-2xl font-bold ${totalNetPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalNetPnl >= 0 ? '+' : ''}₹{totalNetPnl.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-2">No open intraday positions</p>
          <p className="text-sm text-gray-400 mb-4">Place a MIS buy order from Trade (lot multiples)</p>
          <Link href="/dashboard/trade?product=MIS&side=BUY" className="text-groww-primary font-medium hover:underline">
            Go to Trade
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Lots / Qty</th>
                  <th className="px-4 py-3 font-medium">Avg · LTP</th>
                  <th className="px-4 py-3 font-medium">P&L</th>
                  <th className="px-4 py-3 font-medium">Net P&L</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {livePositions.map((p) => (
                  <tr key={p.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/stock/${p.symbol}`} className="font-semibold text-groww-primary hover:underline">
                        {p.symbol}
                      </Link>
                      <p className="text-xs text-gray-400">{p.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.qty} sh</div>
                      <div className="text-xs text-gray-400">{p.lotsLabel} · lot {p.lotSize}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>₹{Number(p.avgBuyPrice).toLocaleString('en-IN')}</div>
                      <div className="text-xs text-gray-500">LTP ₹{Number(p.currentPrice || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td className={`px-4 py-3 font-medium ${(p.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div>{(p.pnl || 0) >= 0 ? '+' : ''}₹{Number(p.pnl || 0).toLocaleString('en-IN')} ({p.pnlPercent}%)</div>
                      <div className="text-xs opacity-80">₹{Number(p.pnlPerLot || 0).toLocaleString('en-IN')} / lot</div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${(p.netPnl || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {(p.netPnl || 0) >= 0 ? '+' : ''}₹{Number(p.netPnl || 0).toLocaleString('en-IN')}
                      <div className="text-gray-400">chg ₹{p.charges?.total?.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Link
                        href={`/dashboard/trade?symbol=${p.symbol}&side=BUY&product=MIS`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </Link>
                      <button type="button" onClick={() => openManage(p)} className="px-2 py-1.5 rounded-lg bg-groww-primary/10 text-groww-primary text-xs font-medium">
                        Manage
                      </button>
                      <button
                        type="button"
                        disabled={squaring === p.symbol}
                        onClick={() => handleSquareOff(p.symbol)}
                        className="px-2 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium disabled:opacity-50"
                      >
                        {squaring === p.symbol ? '…' : 'Exit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {managePos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Manage {managePos.symbol}</h3>
              <button type="button" onClick={() => setManagePos(null)} className="text-gray-400 hover:text-gray-700">
                <XCircle />
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2">Partial square-off (by lots)</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={managePos.lots || 1}
                  value={partialLots}
                  onChange={(e) => setPartialLots(e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg outline-none"
                  placeholder={`Max ${managePos.lots} lots`}
                />
                <button
                  type="button"
                  disabled={partialBusy}
                  onClick={handlePartialSquareOff}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {partialBusy ? '…' : 'Exit lots'}
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">= {parseInt(partialLots, 10) * (managePos.lotSize || 1) || 0} shares</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-2">Convert to delivery (CNC)</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={managePos.lots || 1}
                  value={convertLots}
                  onChange={(e) => setConvertLots(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none"
                />
                <button
                  type="button"
                  disabled={convertBusy}
                  onClick={handleConvertCnc}
                  className="px-4 py-2 bg-groww-primary text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {convertBusy ? '…' : 'Convert'}
                </button>
              </div>
            </div>

            {managePos.charges && (
              <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Est. exit charges (full position)</h4>
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Brokerage</span><span>₹{managePos.charges.brokerage}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>STT</span><span>₹{managePos.charges.stt}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>GST & others</span>
                  <span>₹{(managePos.charges.gst + managePos.charges.exchangeCharges).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-gray-800 border-t pt-2 mt-2">
                  <span>Total</span><span>₹{managePos.charges.total}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-700 mb-3">Position building history (today)</h4>
              {historyLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-groww-primary mx-auto" />
              ) : buildHistory.length ? (
                <ul className="space-y-2">
                  {buildHistory.map((h, i) => (
                    <li key={i} className="flex justify-between text-sm gap-2">
                      <span className="text-gray-500 shrink-0">
                        {new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-green-700 text-right">{h.label}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No MIS buys recorded today for this symbol.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
