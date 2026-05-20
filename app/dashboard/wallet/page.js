'use client';

import { useEffect, useState } from 'react';
import { wallet as walletApi } from '../../../lib/api';
import { Wallet, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function WalletPage() {
  const [walletData, setWalletData] = useState(null);
  const [history, setHistory] = useState({ transactions: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Virtual Wallet</h1>
          <p className="text-gray-500">Manage your virtual balance and transactions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-3xl font-bold text-gray-800">₹{walletData?.balance?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Invested</p>
                <p className="font-medium text-gray-800">₹{walletData?.total_invested?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Total P&L</p>
                <p className={`font-medium ${(walletData?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(walletData?.total_profit || 0) >= 0 ? '+' : ''}₹{walletData?.total_profit?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'transactions' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'orders' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Order History
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is a virtual wallet with ₹10,00,000 starting balance.
          No real money is involved. Use this for paper trading practice.
        </p>
      </div>
    </div>
  );
}