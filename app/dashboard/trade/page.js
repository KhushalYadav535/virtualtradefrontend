'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { market, trading, portfolio } from '../../../lib/api';
import { useMarketStore, usePortfolioStore } from '../../../lib/store';
import { initSocket, subscribeStock } from '../../../lib/socket';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import StockBrowsePanel from '../../../components/StockBrowsePanel';

function TradePageContent() {
  const searchParams = useSearchParams();
  const [symbol, setSymbol] = useState('RELIANCE');
  const [selectedExchange, setSelectedExchange] = useState('NSE');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderType, setOrderType] = useState('BUY');
  const [orderMode, setOrderMode] = useState('market');
  const [qty, setQty] = useState(1);
  const [limitPrice, setLimitPrice] = useState('');
  const [confirmModal, setConfirmModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const { prices, updatePrice } = useMarketStore();
  const setSummary = usePortfolioStore((s) => s.setSummary);

  useEffect(() => {
    const socket = initSocket();
    socket.on('stockData', (data) => {
      updatePrice(data);
      if (data.symbol === symbol) setQuote(data);
    });
    const urlSymbol = searchParams.get('symbol');
    const urlExchange = searchParams.get('exchange') || 'NSE';
    if (urlSymbol) {
      setSymbol(urlSymbol.toUpperCase());
      setSelectedExchange(urlExchange.toUpperCase());
      loadQuote(urlSymbol.toUpperCase(), urlExchange.toUpperCase());
    } else {
      loadQuote('RELIANCE', 'NSE');
    }
    loadOrders();
    return () => {
      socket.off('stockData');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prices[symbol]) {
      setQuote(prices[symbol]);
      setLoading(false);
    }
  }, [prices, symbol]);

  const loadQuote = async (sym, exchange = selectedExchange) => {
    setLoading(true);
    subscribeStock(sym);
    try {
      const { data } = await market.getQuote(sym, exchange);
      setQuote(data);
      if (data?.exchange) setSelectedExchange(data.exchange);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await trading.getOrders();
      setRecentOrders(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSymbolSelect = (stock) => {
    setSymbol(stock.symbol);
    setSelectedExchange(stock.exchange || 'NSE');
    subscribeStock(stock.symbol);
    loadQuote(stock.symbol, stock.exchange || 'NSE');
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const price = orderMode === 'limit' ? parseFloat(limitPrice) : undefined;
      const { data } = await trading.placeOrder({
        symbol,
        exchange: selectedExchange,
        qty: parseInt(qty, 10),
        orderType,
        orderMode,
        price
      });
      setOrderSuccess(data.order);
      setConfirmModal(false);
      setQty(1);
      setLimitPrice('');
      loadOrders();
      portfolio.getSummary().then(({ data }) => setSummary(data)).catch(() => {});
      setTimeout(() => setOrderSuccess(null), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  const totalCost = quote ? (orderMode === 'market' ? quote.ltp * qty : parseFloat(limitPrice || 0) * qty) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Trade</h1>
        <p className="text-gray-500">Buy and sell stocks with virtual money</p>
      </div>

      {orderSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">Order placed successfully!</p>
          <p className="text-green-600 text-sm">
            {orderSuccess.order_type} {orderSuccess.qty} {orderSuccess.symbol} @ ₹
            {orderSuccess.executed_price || orderSuccess.price}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <StockBrowsePanel
            onSelect={handleSymbolSelect}
            selectedSymbol={symbol}
            selectedExchange={selectedExchange}
          />
        </div>

        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : quote ? (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">{symbol}</h2>
                    <p className="text-sm text-gray-500">{quote.exchange || selectedExchange}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-800">₹{quote.ltp?.toLocaleString()}</p>
                    <p
                      className={`flex items-center justify-end gap-1 ${
                        quote.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {quote.changePercent >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {quote.change >= 0 ? '+' : ''}
                      {quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Open', value: quote.open },
                    { label: 'High', value: quote.high },
                    { label: 'Low', value: quote.low },
                    { label: 'Prev Close', value: quote.prevClose },
                    { label: 'Volume', value: quote.volume },
                    { label: '52W High', value: quote.week52High },
                    { label: '52W Low', value: quote.week52Low }
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="font-medium text-gray-800">
                        {typeof item.value === 'number'
                          ? item.label === 'Volume'
                            ? item.value.toLocaleString()
                            : `₹${item.value.toLocaleString()}`
                          : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Select a stock from the list</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h3>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span
                        className={`font-medium ${
                          order.order_type === 'BUY' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {order.order_type}
                      </span>
                      <span className="ml-2 font-medium text-gray-800">
                        {order.qty} {order.symbol}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">{order.order_mode}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{order.executed_price || order.price}</p>
                      <p
                        className={`text-xs ${
                          order.status === 'executed'
                            ? 'text-green-600'
                            : order.status === 'pending'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No recent orders</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Place Order</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('BUY')}
                    className={`py-2 rounded-lg font-medium transition ${
                      orderType === 'BUY'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('SELL')}
                    className={`py-2 rounded-lg font-medium transition ${
                      orderType === 'SELL'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderMode('market')}
                    className={`py-2 rounded-lg font-medium transition ${
                      orderMode === 'market'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Market
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('limit')}
                    className={`py-2 rounded-lg font-medium transition ${
                      orderMode === 'limit'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Limit
                  </button>
                </div>
              </div>

              {orderMode === 'limit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Limit Price</label>
                  <input
                    type="number"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Enter price"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="font-medium">
                    ₹{orderMode === 'market' ? quote?.ltp?.toLocaleString() || '-' : limitPrice || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Quantity</span>
                  <span className="font-medium">{qty}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>₹{totalCost.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmModal(true)}
                disabled={!quote || qty < 1 || (orderMode === 'limit' && !limitPrice)}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  orderType === 'BUY'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {orderType === 'BUY' ? 'Buy' : 'Sell'} {symbol}
              </button>

              <p className="text-xs text-center text-gray-500">
                This is a paper trade. No real money involved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Order</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Symbol</span>
                <span className="font-medium">{symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className={`font-medium ${orderType === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                  {orderType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode</span>
                <span className="font-medium capitalize">{orderMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity</span>
                <span className="font-medium">{qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="font-medium">
                  {orderMode === 'market'
                    ? `₹${quote?.ltp?.toLocaleString()}`
                    : `₹${parseFloat(limitPrice).toLocaleString()}`}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{totalCost.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={placing}
                className={`flex-1 py-2 rounded-lg font-medium text-white ${
                  orderType === 'BUY' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {placing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <TradePageContent />
    </Suspense>
  );
}

