'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Info } from 'lucide-react';
import { market } from '../lib/api';

const PAGE_SIZE = 80;
const ROW_HEIGHT = 48;

export default function StockBrowsePanel({ onSelect, selectedSymbol, selectedExchange, showDetailLink = true }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('ALL');
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const listRef = useRef(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);

  const fetchStocks = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (reset) offsetRef.current = 0;
    const offset = reset ? 0 : offsetRef.current;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await market.search(searchQuery, exchangeFilter, PAGE_SIZE, offset);
      const items = data.items || data;
      const nextTotal = data.total ?? items.length;

      setStocks((prev) => {
        const next = reset ? items : [...prev, ...items];
        offsetRef.current = next.length;
        return next;
      });
      setTotal(nextTotal);
      setHasMore(data.hasMore ?? items.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      if (reset) {
        setStocks([]);
        offsetRef.current = 0;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [searchQuery, exchangeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchStocks(true), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, exchangeFilter]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_HEIGHT * 4) {
      fetchStocks(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[min(70vh,640px)] lg:h-[calc(100vh-12rem)]">
      <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Stocks</h3>
          <span className="text-xs text-gray-500">
            {loading ? '...' : `${total.toLocaleString()} symbols`}
          </span>
        </div>
        <div className="flex gap-1">
          {['ALL', 'NSE', 'BSE'].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExchangeFilter(ex)}
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                exchangeFilter === ex ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {ex === 'ALL' ? 'All' : ex}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol or name..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {loading && stocks.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : stocks.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">No stocks found</p>
        ) : (
          stocks.map((s) => {
            const active =
              s.symbol === selectedSymbol && (s.exchange || 'NSE') === (selectedExchange || 'NSE');
            return (
              <button
                key={`${s.exchange}-${s.symbol}`}
                type="button"
                onClick={() => onSelect(s)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-blue-50 transition ${
                  active ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                style={{ minHeight: ROW_HEIGHT }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gray-900">{s.symbol}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {showDetailLink && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/stock/${s.symbol}?exchange=${s.exchange || 'NSE'}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            router.push(`/dashboard/stock/${s.symbol}?exchange=${s.exchange || 'NSE'}`);
                          }
                        }}
                        className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                        title="Stock details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {s.exchange}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{s.name}</p>
              </button>
            );
          })
        )}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        )}
        {!hasMore && stocks.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-3">End of list</p>
        )}
      </div>
    </div>
  );
}
