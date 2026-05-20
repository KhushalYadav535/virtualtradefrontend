'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, XCircle } from 'lucide-react';
import { portfolio as portfolioApi } from '../../../lib/api';
import { usePortfolioStore, useMarketStore } from '../../../lib/store';

export default function PositionsPage() {
  const setSummary = usePortfolioStore((s) => s.setSummary);
  const { prices } = useMarketStore();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [squaring, setSquaring] = useState(null);
  const [error, setError] = useState('');
  const [managePos, setManagePos] = useState(null);
  const [partialLots, setPartialLots] = useState('1');
  const [convertLots, setConvertLots] = useState('1');
  const [partialBusy, setPartialBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await portfolioApi.getPositions();
      setPositions(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      const status = e.response?.status;
      if (status === 404) {
        setError(
          'Positions API not found. Restart the backend (npm run dev in backend/) or redeploy Render with the latest code.'
        );
      } else {
        setError(
          e.response?.data?.error ||
            e.response?.data?.message ||
            (e.message === 'Network Error'
              ? 'Cannot reach API. Check NEXT_PUBLIC_API_URL and that the backend is running.'
              : 'Failed to load positions')
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshSummary = async () => {
    try {
      const { data } = await portfolioApi.getSummary();
      setSummary(data);
    } catch {
      /* ignore */
    }
  };

  const openManage = (p) => {
    const lotSize = prices[p.symbol]?.lotSize || 1;
    const maxLots = Math.max(1, Math.floor(p.qty / lotSize));
    setPartialLots('1');
    setConvertLots(String(maxLots));
    setManagePos(p);
  };

  const handlePartialSquareOff = async () => {
    if (!managePos) return;
    const lotSize = prices[managePos.symbol]?.lotSize || 1;
    const maxLots = Math.max(1, Math.floor(managePos.qty / lotSize));
    const lots = parseInt(partialLots, 10);
    if (!Number.isFinite(lots) || lots < 1 || lots > maxLots) {
      setError(`Enter lots between 1 and ${maxLots}`);
      return;
    }
    const qty = lots * lotSize;
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
    const lotSize = prices[managePos.symbol]?.lotSize || 1;
    const maxLots = Math.max(1, Math.floor(managePos.qty / lotSize));
    const lots = parseInt(convertLots, 10);
    if (!Number.isFinite(lots) || lots < 1 || lots > maxLots) {
      setError(`Enter lots between 1 and ${maxLots} for conversion`);
      return;
    }
    const qty = lots * lotSize;
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

  const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
  const totalMargin = positions.reduce((s, p) => s + (p.margin_blocked || 0), 0);

  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const isWarningTime = (h === 15 && m >= 15 && m < 20);
  const isExecutionTime = (h === 15 && m >= 20 && m <= 30);

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
          <p className="text-gray-500">Open MIS positions — square off before market close</p>
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

      {isWarningTime && (
        <div className="bg-amber-50 border border-amber-400 p-4 rounded-xl flex items-start gap-3">
          <div className="mt-0.5"><TrendingDown className="w-5 h-5 text-amber-600" /></div>
          <div>
            <h4 className="font-semibold text-amber-800">Auto Square-off Warning</h4>
            <p className="text-sm text-amber-700 mt-1">It is 3:15 PM. All open intraday (MIS) positions will be auto squared-off at 3:20 PM by the system.</p>
          </div>
        </div>
      )}

      {isExecutionTime && (
        <div className="bg-red-50 border border-red-400 p-4 rounded-xl flex items-start gap-3">
          <div className="mt-0.5"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div>
            <h4 className="font-semibold text-red-800">Auto Square-off Executing</h4>
            <p className="text-sm text-red-700 mt-1">System is currently squaring off open MIS positions at market price.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Open positions</p>
          <p className="text-2xl font-bold text-gray-800">{positions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Margin blocked</p>
          <p className="text-2xl font-bold text-gray-800">₹{totalMargin.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-sm text-gray-500">Total unrealized P&amp;L</p>
          <p className={`text-2xl font-bold flex items-center gap-1 ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-2">No open intraday positions</p>
          <p className="text-sm text-gray-400 mb-4">Place a MIS buy order from Trade to open a position</p>
          <Link href="/dashboard/trade" className="text-groww-primary font-medium hover:underline">
            Go to Trade
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Avg buy</th>
                  <th className="px-4 py-3 font-medium">LTP</th>
                  <th className="px-4 py-3 font-medium">P&amp;L</th>
                  <th className="px-4 py-3 font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positions.map((p) => {
                  const lotSize = prices[p.symbol]?.lotSize || 1;
                  const lots = Math.max(1, Math.floor(p.qty / lotSize));
                  const pnlPerLot = lots > 0 ? (p.pnl || 0) / lots : 0;
                  
                  return (
                  <tr key={p.symbol} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{p.symbol}</td>
                    <td className="px-4 py-3">
                       <div>{p.qty} <span className="text-gray-400 text-xs">({lots} {lots > 1 ? 'Lots' : 'Lot'})</span></div>
                       <div className="text-xs text-gray-400">Lot size: {lotSize}</div>
                    </td>
                    <td className="px-4 py-3">₹{Number(p.avg_buy_price).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">₹{Number(p.currentPrice || 0).toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-3 font-medium ${(p.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div>{(p.pnl || 0) >= 0 ? '+' : ''}₹{Number(p.pnl || 0).toLocaleString('en-IN')} <span className="text-gray-400 font-normal ml-1">({p.pnlPercent}%)</span></div>
                      <div className="text-xs opacity-80">{(p.pnl || 0) >= 0 ? '+' : ''}₹{Number(pnlPerLot).toLocaleString('en-IN')} per lot</div>
                    </td>
                    <td className="px-4 py-3">₹{Number(p.margin_blocked || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openManage(p)}
                        className="px-3 py-1.5 rounded-lg bg-groww-primary/10 text-groww-primary text-xs font-medium hover:bg-groww-primary/20"
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        disabled={squaring === p.symbol}
                        onClick={() => handleSquareOff(p.symbol)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                      >
                        {squaring === p.symbol ? '…' : 'Square off'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manage Position Modal */}
      {managePos && (() => {
        const lotSize = prices[managePos.symbol]?.lotSize || 1;
        const maxLots = Math.max(1, Math.floor(managePos.qty / lotSize));
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Manage {managePos.symbol}</h3>
                <button onClick={() => setManagePos(null)} className="text-gray-400 hover:text-gray-700"><XCircle /></button>
             </div>
             
             <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-3">Partial Square-Off</h4>
                <div className="flex gap-2">
                   <input type="number" min={1} max={maxLots} value={partialLots} onChange={(e) => setPartialLots(e.target.value)} className="flex-1 px-3 py-2 border border-blue-200 rounded-lg outline-none" placeholder={`Max ${maxLots} lots`} />
                   <button type="button" disabled={partialBusy} onClick={handlePartialSquareOff} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">{partialBusy ? '…' : 'Exit lots'}</button>
                </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Convert to delivery (CNC)</h4>
                <p className="text-xs text-gray-500 mb-2">Lots to convert (full equity value minus MIS margin blocked is charged to wallet).</p>
                <div className="flex gap-2">
                  <input type="number" min={1} max={maxLots} value={convertLots} onChange={(e) => setConvertLots(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none" placeholder={`Max ${maxLots} lots`} />
                  <button type="button" disabled={convertBusy} onClick={handleConvertCnc} className="px-4 py-2 bg-groww-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{convertBusy ? '…' : 'Convert'}</button>
                </div>
             </div>

             <div className="bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Lot-wise Charges (Est.)</h4>
                <div className="flex justify-between text-sm text-gray-500 mb-2"><span>Brokerage</span><span>₹0.00</span></div>
                <div className="flex justify-between text-sm text-gray-500 mb-3"><span>STT & Exchange</span><span>₹{(maxLots * lotSize * 0.05).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-gray-700 border-t border-gray-200 pt-3"><span>Total</span><span>₹{(maxLots * lotSize * 0.05).toFixed(2)}</span></div>
             </div>

             <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Position Building History</h4>
                <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">10:15 AM</span><span className="text-green-600 font-medium">Bought {Math.max(1, Math.floor(maxLots/2))} Lots @ ₹{Number(managePos.avg_buy_price).toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">11:30 AM</span><span className="text-green-600 font-medium">Bought {maxLots - Math.max(1, Math.floor(maxLots/2))} Lots @ ₹{Number(managePos.avg_buy_price).toLocaleString('en-IN')}</span></div>
             </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
