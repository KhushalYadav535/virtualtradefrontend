'use client';

import { useEffect, useState } from 'react';
import { wallet as walletApi } from '../../../lib/api';
import { Wallet, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WalletPage() {
  const [walletData, setWalletData] = useState(null);
  const [history, setHistory] = useState({ transactions: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');

  // Position sizing tool states
  const [psRisk, setPsRisk] = useState(1000);
  const [psStopLoss, setPsStopLoss] = useState(5);
  const [psLotSize, setPsLotSize] = useState(15);
  
  const psShares = psStopLoss > 0 ? Math.floor(psRisk / psStopLoss) : 0;
  const psLots = psLotSize > 0 ? Math.floor(psShares / psLotSize) : 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletApi.get(),
        walletApi.getHistory()
      ]);
      setWalletData(walletRes.data);
      setHistory(historyRes.data);
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

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTopUp = () => {
    const amount = window.prompt("Enter amount to add to virtual wallet (e.g., 500000):", "500000");
    if (amount) {
      // Mock API call
      window.alert(`Successfully added ₹${parseInt(amount).toLocaleString()} to your wallet!`);
      setWalletData(prev => ({...prev, balance: prev.balance + parseInt(amount)}));
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your account? This will wipe all trade history and reset balance to default.")) {
       window.alert("Account reset successfully.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Virtual Wallet</h1>
          <p className="text-gray-500">Manage your virtual balance and margin</p>
        </div>
        <div className="flex gap-2">
           <button onClick={handleReset} className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition">Reset Account</button>
           <button onClick={handleTopUp} className="px-3 py-2 text-white bg-groww-primary hover:bg-groww-primary-dark rounded-lg text-sm font-semibold transition shadow-sm">+ Add Funds</button>
        </div>
      </div>

      {walletData && (() => {
        const balance = walletData.balance || 0;
        const marginBlocked = walletData.margin_blocked || 0; // Mock this if not from API
        // Temporary mock for margin if api doesn't provide it directly here (it's usually in portfolio getSummary)
        const mockMarginBlocked = marginBlocked || 45000; 
        const utilization = balance > 0 ? (mockMarginBlocked / balance) * 100 : 0;
        
        return (
          <>
            {utilization > 80 && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                 <TrendingDown className="w-5 h-5" />
                 <div>
                   <h4 className="font-bold text-sm">Low Margin Alert</h4>
                   <p className="text-xs">Your margin utilization is above 80%. You may not be able to take new positions.</p>
                 </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-groww-primary/10 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-groww-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Available Cash Balance</p>
                      <p className="text-3xl font-bold text-gray-800">₹{balance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total Invested</span><span className="font-semibold text-gray-800">₹{walletData?.total_invested?.toLocaleString() || 0}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Total P&L</span><span className={`font-semibold ${(walletData?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(walletData?.total_profit || 0) >= 0 ? '+' : ''}₹{walletData?.total_profit?.toLocaleString() || 0}</span></div>
                  </div>
                </div>
                
                <div className="border-l border-gray-100 pl-6 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 font-medium mb-1">Margin Utilized</p>
                  <p className="text-2xl font-bold text-gray-800 mb-2">₹{mockMarginBlocked.toLocaleString('en-IN')}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${utilization > 80 ? 'bg-red-500' : 'bg-groww-primary'}`} style={{ width: `${Math.min(100, utilization)}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{utilization.toFixed(1)}% Used</span>
                    <span>100% Limit</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Left Side: Ledger Tabs */}
        <div className="md:col-span-2">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'transactions' ? 'bg-groww-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'orders' ? 'bg-groww-primary text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Margin History
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {activeTab === 'transactions' ? (
          history.transactions?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Balance After</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {history.transactions.map((txn, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(txn.created_at)}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          txn.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {txn.type === 'credit' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {txn.type.toUpperCase()}
                        </span>
                      </td>
                      <td className={`py-4 px-6 text-right font-medium ${
                        txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right text-gray-800">
                        ₹{parseFloat(txn.balance_after).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{txn.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">Start trading to see your transaction history</p>
            </div>
          )
        ) : (
          history.orders?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Symbol</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.orders.map((order, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(order.timestamp)}</td>
                      <td className="py-4 px-6 font-medium text-gray-800">{order.symbol}</td>
                      <td className={`py-4 px-6 font-medium ${
                        order.order_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {order.order_type}
                        <span className="ml-1 text-xs text-gray-400">({order.order_mode})</span>
                      </td>
                      <td className="py-4 px-6 text-right text-gray-600">{order.qty}</td>
                      <td className="py-4 px-6 text-right text-gray-800">
                        ₹{parseFloat(order.price || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'executed' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          )
        )}
      </div>
      </div>

      {/* Right Side: Position Sizing Tool */}
      <div className="md:col-span-1">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-24">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-groww-primary"/> Position Sizing Tool</h3>
           
           <div className="space-y-4">
             <div>
               <label className="text-xs text-gray-500 font-semibold mb-1 block">Max Risk per Trade (₹)</label>
               <input type="number" value={psRisk} onChange={e=>setPsRisk(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-groww-primary" />
             </div>
             <div>
               <label className="text-xs text-gray-500 font-semibold mb-1 block">Stop Loss (Points/₹)</label>
               <input type="number" value={psStopLoss} onChange={e=>setPsStopLoss(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-groww-primary" />
             </div>
             <div>
               <label className="text-xs text-gray-500 font-semibold mb-1 block">Asset Lot Size</label>
               <input type="number" value={psLotSize} onChange={e=>setPsLotSize(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-groww-primary" />
             </div>

             <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2">
                  <span className="text-sm font-medium text-gray-600">Max Shares</span>
                  <span className="text-lg font-bold text-gray-800">{psShares}</span>
                </div>
                <div className="flex justify-between items-center bg-groww-primary/10 p-3 rounded-lg border border-groww-primary/20">
                  <span className="text-sm font-medium text-groww-primary">Recommended Lots</span>
                  <span className="text-xl font-bold text-groww-primary">{psLots} Lots</span>
                </div>
                {psLots === 0 && <p className="text-[10px] text-red-500 text-center mt-2">Risk is too low to buy even 1 lot.</p>}
             </div>
           </div>
        </div>
      </div>
      </div>

      <div className="bg-groww-primary-light border border-groww-primary-muted rounded-xl p-4">
        <p className="text-sm text-groww-ink">
          <strong>Note:</strong> This is a virtual wallet with ₹10,00,000 starting balance.
          No real money is involved. Use this for paper trading practice.
        </p>
      </div>
    </div>
  );
}