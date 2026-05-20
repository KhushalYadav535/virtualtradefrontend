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
  const [sectorFilter, setSectorFilter] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const [sectors, setSectors] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popular, setPopular] = useState([]);
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
      const { data } = await market.search(searchQuery, exchangeFilter, PAGE_SIZE, offset, {
        sector: sectorFilter || undefined,
        lotFilter: lotFilter || undefined
      });
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
  }, [searchQuery, exchangeFilter, sectorFilter, lotFilter]);

  useEffect(() => {
    market.getSectors().then(({ data }) => setSectors(data || [])).catch(() => {});
    market.getPopularSearches().then(({ data }) => setPopular(data || [])).catch(() => {});
    market.getRecentSearches().then(({ data }) => setRecentSearches(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchStocks(true), 400);
    return () => clearTimeout(timer);
  }, [fetchStocks]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_HEIGHT * 4) {
      fetchStocks(false);
    }
  };

  return (
    <div className="groww-card-flat flex h-[min(70vh,640px)] flex-col lg:h-[calc(100vh-12rem)]">
      <div className="shrink-0 space-y-2 border-b border-groww-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-groww-ink">Stocks</h3>
          <span className="text-xs text-groww-muted">
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
                exchangeFilter === ex ? 'bg-groww-primary text-white' : 'bg-groww-bg text-groww-muted'
              }`}
            >
              {ex === 'ALL' ? 'All' : ex}
            </button>
          ))}
        </div>
        {sectors.length > 0 && (
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="groww-input py-2 text-sm"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <select
          value={lotFilter}
          onChange={(e) => setLotFilter(e.target.value)}
          className="groww-input py-2 text-sm"
        >
          <option value="">All lot sizes</option>
          <option value="eq1">Lot size = 1 (equity cash)</option>
          <option value="gt1">Lot size &gt; 1 (F&amp;O-style)</option>
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Symbol, name, or ISIN..."
            className="groww-input py-2 pl-8 text-sm"
          />
        </div>
        {(recentSearches.length > 0 || popular.length > 0) && !searchQuery && (
          <div className="flex flex-wrap gap-1">
            {recentSearches.slice(0, 5).map((r) => (
              <button
                key={r.query}
                type="button"
                onClick={() => setSearchQuery(r.symbol || r.query)}
                className="rounded-full bg-groww-primary-light px-2 py-0.5 text-[10px] font-medium text-groww-primary"
              >
                {r.symbol || r.query}
              </button>
            ))}
            {popular.slice(0, 4).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setSearchQuery(sym)}
                className="rounded-full bg-groww-bg px-2 py-0.5 text-[10px] text-groww-muted"
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {loading && stocks.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-groww-primary" />
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
                className={active ? 'groww-stock-row-active' : 'groww-stock-row'}
                style={{ minHeight: ROW_HEIGHT }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-groww-ink">{s.symbol}</span>
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
                        className="rounded-lg p-1 text-groww-muted hover:bg-groww-primary-light hover:text-groww-primary"
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
                <p className="text-[10px] text-gray-400 truncate">Lot {s.lotSize || 1}</p>
              </button>
            );
          })
        )}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-groww-primary" />
          </div>
        )}
        {!hasMore && stocks.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-3">End of list</p>
        )}
      </div>
    </div>
  );
}
