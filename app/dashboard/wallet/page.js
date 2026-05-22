'use client';

import { useEffect, useState, useCallback } from 'react';
import { wallet as walletApi } from '../../../lib/api';
import { Wallet, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';

export default function WalletPage() {
  const [walletData, setWalletData] = useState(null);
  const [history, setHistory] = useState({ transactions: [], marginLedger: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [psRisk, setPsRisk] = useState(1000);
  const [psStopLoss, setPsStopLoss] = useState(5);
  const [psLotSize, setPsLotSize] = useState(15);
  const [psCapitalPct, setPsCapitalPct] = useState(2);

  const [mlSymbol, setMlSymbol] = useState('RELIANCE');
  const [mlProduct, setMlProduct] = useState('MIS');
  const [maxLotsData, setMaxLotsData] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  const cashBal = walletData?.cashBalance ?? walletData?.balance ?? 0;
  const riskFromCapital = Math.floor((cashBal * psCapitalPct) / 100);
  const effectiveRisk = psRisk > 0 ? psRisk : riskFromCapital;
  const psShares = psStopLoss > 0 ? Math.floor(effectiveRisk / psStopLoss) : 0;
  const psLots = psLotSize > 0 ? Math.floor(psShares / psLotSize) : 0;

  const loadData = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletApi.getFunds(),
        walletApi.getHistory(100)
      ]);
      setWalletData(walletRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchMaxLots = useCallback(async () => {
    const sym = mlSymbol.trim().toUpperCase();
    if (!sym) return;
    setMlLoading(true);
    try {
      const { data } = await walletApi.getMaxLots(sym, mlProduct);
      setMaxLotsData(data);
    } catch (err) {
      console.error(err);
      setMaxLotsData(null);
    } finally {
      setMlLoading(false);
    }
  }, [mlSymbol, mlProduct]);

  useEffect(() => {
    const t = setTimeout(fetchMaxLots, 400);
    return () => clearTimeout(t);
  }, [fetchMaxLots]);

  const formatDate = (date) =>
    new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const handleTopUp = async () => {
    const amount = window.prompt('Enter amount to add (₹):', '500000');
    if (!amount) return;
    const amt = parseInt(amount, 10);
    if (!Number.isFinite(amt) || amt <= 0) {
      window.alert('Enter a valid amount');
      return;
    }
    setTopUpLoading(true);
    try {
      const { data } = await walletApi.addFunds(amt);
      window.alert(data.message || 'Funds added');
      setWalletData(data.funds || data);
      await loadData();
    } catch (err) {
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Could not add funds');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Reset account? This cancels pending orders, clears holdings, intraday positions and trade history, and restores your virtual balance.'
      )
    ) {
      return;
    }
    setResetLoading(true);
    try {
      const { data } = await walletApi.resetAccount();
      window.alert(data.message || 'Account reset');
      await loadData();
      setMaxLotsData(null);
    } catch (err) {
      window.alert(err.response?.data?.message || err.response?.data?.error || 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  const w = walletData || {};
  const utilization = w.marginUtilizationPercent ?? 0;
  const ledgerRows =
    activeTab === 'margin' ? history.marginLedger || [] : history.transactions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Virtual Wallet</h1>
          <p className="text-gray-500">Cash, margin, ledger &amp; lot calculators</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={resetLoading}
            className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {resetLoading ? 'Resetting…' : 'Reset Account'}
          </button>
          <button
            onClick={handleTopUp}
            disabled={topUpLoading}
            className="px-3 py-2 text-white bg-groww-primary hover:bg-groww-primary-dark rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            {topUpLoading ? 'Adding…' : '+ Add Funds'}
          </button>
        </div>
      </div>

      {w.lowMarginAlert && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <TrendingDown className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Low Margin Alert</h4>
            <p className="text-xs">
              Margin utilization is {utilization.toFixed(1)}%. Add funds or square off MIS positions before new trades.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">Available Cash</p>
            <p className="text-3xl font-bold text-gray-800">
              ₹{(w.availableCash ?? w.balance ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ~{w.lotsAffordableCash ?? 0} lots affordable (MIS ref.)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Used Margin (MIS)</p>
            <p className="text-2xl font-bold text-gray-800">
              ₹{(w.usedMargin ?? 0).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Available for new MIS: ₹{(w.availableMargin ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Collateral (holdings × 50%)</p>
            <p className="text-2xl font-bold text-indigo-700">
              ₹{(w.collateralMargin ?? 0).toLocaleString('en-IN')}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${utilization > 80 ? 'bg-red-500' : 'bg-groww-primary'}`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{utilization.toFixed(1)}% margin utilized</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total invested</span>
            <span className="font-semibold">₹{(w.total_invested || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total P&amp;L</span>
            <span className={`font-semibold ${(w.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(w.total_profit || 0) >= 0 ? '+' : ''}₹{(w.total_profit || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'transactions', label: 'All ledger' },
              { id: 'margin', label: 'Margin only' },
              { id: 'orders', label: 'Orders' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-groww-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {activeTab === 'orders' ? (
              history.orders?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 text-gray-500">Date</th>
                        <th className="text-left py-3 px-4 text-gray-500">Symbol</th>
                        <th className="text-left py-3 px-4 text-gray-500">Type</th>
                        <th className="text-right py-3 px-4 text-gray-500">Qty</th>
                        <th className="text-left py-3 px-4 text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.orders.map((order) => (
                        <tr key={order.id} className="border-t border-gray-100">
                          <td className="py-3 px-4 text-gray-500">{formatDate(order.timestamp)}</td>
                          <td className="py-3 px-4 font-medium">{order.symbol}</td>
                          <td className="py-3 px-4">{order.order_type}</td>
                          <td className="py-3 px-4 text-right">{order.qty}</td>
                          <td className="py-3 px-4 capitalize">{order.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-500">No orders yet</p>
              )
            ) : ledgerRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-gray-500">Date</th>
                      <th className="text-left py-3 px-4 text-gray-500">Type</th>
                      <th className="text-right py-3 px-4 text-gray-500">Amount</th>
                      <th className="text-right py-3 px-4 text-gray-500">Balance</th>
                      <th className="text-right py-3 px-4 text-gray-500">Lots ~</th>
                      <th className="text-left py-3 px-4 text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((txn) => (
                      <tr key={txn.id} className="border-t border-gray-100">
                        <td className="py-3 px-4 text-gray-500">{formatDate(txn.created_at)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {txn.type === 'credit' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {txn.type.toUpperCase()}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${
                            txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{parseFloat(txn.balance_after).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-500">
                          {txn.lotsAffordableBefore} → {txn.lotsAffordableAfter}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{txn.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No ledger entries</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-groww-primary" />
              Max lots affordable
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                value={mlSymbol}
                onChange={(e) => setMlSymbol(e.target.value.toUpperCase())}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase"
                placeholder="Symbol"
              />
              <select
                value={mlProduct}
                onChange={(e) => setMlProduct(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm"
              >
                <option value="MIS">MIS</option>
                <option value="CNC">CNC</option>
                <option value="NRML">NRML</option>
              </select>
            </div>
            {mlLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-groww-primary mx-auto" />
            ) : maxLotsData ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lot size</span>
                  <span className="font-bold">{maxLotsData.lotSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin / lot</span>
                  <span className="font-bold">₹{maxLotsData.marginPerLot?.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-groww-primary/10 p-3 rounded-lg border border-groww-primary/20 text-center">
                  <p className="text-xs text-groww-primary font-medium">Max lots you can buy</p>
                  <p className="text-2xl font-bold text-groww-primary">{maxLotsData.maxLots ?? 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center">Enter a symbol</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-groww-primary" />
              Position sizing
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Risk % of capital ({cashBal ? `₹${Number(cashBal).toLocaleString('en-IN')}` : '—'})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="100"
                  value={psCapitalPct}
                  onChange={(e) => setPsCapitalPct(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Auto risk budget: ₹{riskFromCapital.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Max risk (₹) override</label>
                <input
                  type="number"
                  value={psRisk}
                  onChange={(e) => setPsRisk(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Stop loss (₹/share)</label>
                <input
                  type="number"
                  value={psStopLoss}
                  onChange={(e) => setPsStopLoss(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold mb-1 block">Lot size</label>
                <input
                  type="number"
                  value={psLotSize}
                  onChange={(e) => setPsLotSize(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
              </div>
              <div className="pt-3 border-t flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Recommended lots</span>
                <span className="text-xl font-bold text-groww-primary">{psLots}</span>
              </div>
              <p className="text-[10px] text-gray-400 text-center">{psShares} shares max at this risk</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-groww-primary-light border border-groww-primary-muted rounded-xl p-4">
        <p className="text-sm text-groww-ink">
          <strong>Note:</strong> Virtual wallet only — no real money. Collateral is indicative (50% of holdings value).
          Lots affordable in ledger uses a reference MIS margin per lot.
        </p>
      </div>
    </div>
  );
}
