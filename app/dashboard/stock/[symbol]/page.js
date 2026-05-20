'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { market } from '../../../../lib/api';
import { usePortfolioStore } from '../../../../lib/store';
import { Loader2, TrendingUp, TrendingDown, ArrowLeft, Wallet } from 'lucide-react';

function StockDetailContent() {
  const { symbol } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const exchange = (searchParams.get('exchange') || 'NSE').toUpperCase();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const { summary } = usePortfolioStore();

  useEffect(() => {
    if (!symbol) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await market.getQuote(symbol, exchange);
        setQuote(data);
      } catch (err) {
        console.error(err);
        setQuote(null);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [symbol, exchange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Stock not found</p>
        <button type="button" onClick={() => router.back()} className="text-groww-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const isUp = (quote.change || 0) >= 0;
  const cashBalance = summary?.cashBalance ?? 0;
  const affordableLots = quote?.ltp && quote?.lotSize ? Math.floor(cashBalance / (quote.ltp * quote.lotSize)) : 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{quote.symbol}</h1>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">{exchange}</span>
            </div>
            <p className="text-gray-500 mt-1">{quote.name || quote.companyName}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">₹{quote.ltp?.toLocaleString('en-IN')}</p>
            <p className={`flex items-center justify-end gap-1 font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? '+' : ''}{quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: quote.open },
          { label: 'High', value: quote.high },
          { label: 'Low', value: quote.low },
          { label: 'Prev Close', value: quote.previousClose || quote.prevClose },
          { label: 'Lot Size', value: quote.lotSize },
          { label: 'Volume', value: quote.volume },
          { label: '52W High', value: quote.week52High },
          { label: '52W Low', value: quote.week52Low },
          { label: 'Market Cap', value: quote.marketCap },
          { label: 'P/E Ratio', value: quote.peRatio },
          { label: 'Dividend Yield', value: quote.dividendYield ? `${quote.dividendYield}%` : null },
          { label: 'Upper Circuit', value: quote.upperCircuit ? `₹${quote.upperCircuit}` : null },
          { label: 'Lower Circuit', value: quote.lowerCircuit ? `₹${quote.lowerCircuit}` : null }
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="text-lg font-semibold text-gray-800 mt-1">
              {item.value != null && item.value !== ''
                ? typeof item.value === 'number'
                  ? item.value.toLocaleString('en-IN')
                  : item.value
                : '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-blue-900">
          <Wallet className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm">Cash Available: ₹{cashBalance.toLocaleString('en-IN')}</p>
            <p className="font-semibold">Max Affordable Lots: {affordableLots}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/trade?symbol=${quote.symbol}&exchange=${exchange}`)}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          Trade
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/charts?symbol=${quote.symbol}`)}
          className="px-6 py-2.5 bg-groww-primary text-white rounded-lg font-medium hover:bg-groww-primary-dark"
        >
          View Chart
        </button>
      </div>
    </div>
  );
}

export default function StockDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
        </div>
      }
    >
      <StockDetailContent />
    </Suspense>
  );
}
