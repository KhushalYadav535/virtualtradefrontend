'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import StockBrowsePanel from '../../../components/StockBrowsePanel';
import TradeOrderPanel from '../../../components/TradeOrderPanel';
import { market, portfolio } from '../../../lib/api';
import { usePortfolioStore, useMarketStore, useAuthStore } from '../../../lib/store';
import { getTradingPrefsFromUser } from '../../../lib/tradingPrefs';
import { initSocket, subscribeStock, unsubscribeStock } from '../../../lib/socket';

function TradeContent() {
  const searchParams = useSearchParams();
  const summary = usePortfolioStore((s) => s.summary);
  const setSummary = usePortfolioStore((s) => s.setSummary);
  const prices = useMarketStore((s) => s.prices);
  const user = useAuthStore((s) => s.user);
  const prefs = getTradingPrefsFromUser(user);

  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const symbol = selected?.symbol;
  const exchange = selected?.exchange || 'NSE';
  const sideParam = searchParams.get('side');
  const productParam = searchParams.get('product');
  const initialOrderType = sideParam === 'SELL' ? 'SELL' : 'BUY';
  const initialProductType = ['CNC', 'MIS', 'NRML'].includes(productParam)
    ? productParam
    : prefs.defaultProductType;
  const liveQuote = symbol ? prices[symbol] : null;
  const ltp = liveQuote?.ltp ?? quote?.ltp;
  const lotSize = liveQuote?.lotSize ?? quote?.lotSize ?? 1;

  const loadQuote = useCallback(async (sym, ex) => {
    if (!sym) return;
    setLoadingQuote(true);
    try {
      const { data } = await market.getQuote(sym, ex);
      setQuote(data);
    } catch (err) {
      console.error(err);
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    initSocket();
    portfolio.getSummary().then(({ data }) => setSummary(data)).catch(() => {});
  }, [setSummary]);

  useEffect(() => {
    const sym = searchParams.get('symbol');
    const ex = searchParams.get('exchange') || 'NSE';
    if (sym) setSelected({ symbol: sym.toUpperCase(), exchange: ex, name: sym });
  }, [searchParams]);

  useEffect(() => {
    if (!symbol) return;
    loadQuote(symbol, exchange);
    subscribeStock(symbol);
    return () => unsubscribeStock(symbol);
  }, [symbol, exchange, loadQuote]);

  const handleSelect = (stock) => {
    setSelected(stock);
    window.history.replaceState(
      null,
      '',
      `/dashboard/trade?symbol=${stock.symbol}&exchange=${stock.exchange || 'NSE'}`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-groww-ink">Trade</h1>
        <p className="text-groww-muted">Market, limit, SL, bracket &amp; MIS intraday orders</p>
      </div>

      <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-6">
        <StockBrowsePanel selectedSymbol={symbol} selectedExchange={exchange} onSelect={handleSelect} />

        <div className="groww-card p-6">
          {!symbol ? (
            <p className="py-16 text-center text-groww-muted">Select a stock to start trading</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between border-b border-groww-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-groww-ink">{symbol}</h2>
                  <p className="text-sm text-groww-muted">{exchange}</p>
                </div>
                <div className="text-right">
                  {loadingQuote && !ltp ? (
                    <Loader2 className="ml-auto h-6 w-6 animate-spin text-groww-primary" />
                  ) : (
                    <p className="text-2xl font-bold text-groww-ink">
                      ₹{ltp != null ? Number(ltp).toLocaleString('en-IN') : '—'}
                    </p>
                  )}
                </div>
              </div>
              <TradeOrderPanel
                symbol={symbol}
                exchange={exchange}
                quote={quote}
                ltp={ltp}
                lotSize={lotSize}
                availableBalance={summary?.cashBalance ?? summary?.balance ?? 0}
                initialOrderType={initialOrderType}
                initialProductType={initialProductType}
                onSuccess={(s) => setSummary(s)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
        </div>
      }
    >
      <TradeContent />
    </Suspense>
  );
}
