'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { market } from '../lib/api';

export default function WatchlistSymbolSearch({ onSelect, placeholder = 'Search symbol or company…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await market.search(query.trim(), 'ALL', 12, 0);
        const items = data.items || data || [];
        setResults(Array.isArray(items) ? items : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (stock) => {
    onSelect(stock.symbol);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-groww-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-groww-muted" />}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {results.map((s) => (
            <li key={`${s.symbol}-${s.exchange || 'NSE'}`}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-groww-bg"
              >
                <span className="text-sm font-semibold text-groww-ink">{s.symbol}</span>
                <span className="text-xs text-groww-muted truncate">{s.name || s.companyName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
