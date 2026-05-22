'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, TrendingUp, TrendingDown, Calendar, Search, X, Trophy, Zap, Gift, Layers, ChevronRight } from 'lucide-react';
import { market } from '../../../lib/api';
import { buildSearchOpts, isIsinQuery } from '../../../lib/searchUtils';

const INDEX_KEY_MAP = {
  'NIFTY 50': 'nifty50',
  'NIFTY BANK': 'banknifty',
  'NIFTY IT': 'it',
  'NIFTY PHARMA': 'pharma'
};

const CAP_TO_API = { LARGE: 'Large', MID: 'Mid', SMALL: 'Small' };

export default function MarketStatusPage() {
  const [status, setStatus] = useState(null);
  const [indices, setIndices] = useState([]);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [marketCapFilter, setMarketCapFilter] = useState('ALL');
  const [lotSizeFilter, setLotSizeFilter] = useState('ALL');
  const [indexPack, setIndexPack] = useState(null);
  const [indexPackLoading, setIndexPackLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [hub, setHub] = useState(null);
  const [calendarPanel, setCalendarPanel] = useState(null);
  const [activeTab, setActiveTab] = useState('volume');

  const popularSearches = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS'];
  const indexPacks = [
    { key: 'nifty50', label: 'Nifty 50' },
    { key: 'nifty100', label: 'Nifty 100' },
    { key: 'banknifty', label: 'Nifty Bank' },
    { key: 'it', label: 'IT Pack' },
    { key: 'pharma', label: 'Pharma Pack' }
  ];

  const activeStocks =
    activeTab === 'value'
      ? overview?.mostActiveByValue || []
      : activeTab === 'lots'
        ? overview?.mostActiveByLots || []
        : overview?.mostActiveByVolume || [];

  const searchOpts = useCallback(() => {
    const opts = {};
    if (marketCapFilter !== 'ALL') opts.marketCap = CAP_TO_API[marketCapFilter];
    if (lotSizeFilter === 'EQUITY') opts.lotFilter = 'eq1';
    if (lotSizeFilter === 'F&O') opts.lotFilter = 'gt1';
    return opts;
  }, [marketCapFilter, lotSizeFilter]);

  const handleSearchQuery = useCallback(async (text) => {
    if (text.length > 1) {
      try {
        const { data } = await market.search(text, 'ALL', 50, 0, buildSearchOpts(text, searchOpts()));
        setSearchResults(data?.items || []);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  }, [searchOpts]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) handleSearchQuery(searchQuery);
  }, [marketCapFilter, lotSizeFilter, handleSearchQuery]);

  const loadData = async () => {
    try {
      const [hubRes, recentRes, sectorsRes] = await Promise.all([
        market.getDataHub(),
        market.getRecentSearches().catch(() => ({ data: [] })),
        market.getSectors().catch(() => ({ data: [] }))
      ]);
      const data = hubRes.data;
      setHub(data);
      setStatus(data?.status);
      setIndices(data?.indices || []);
      setOverview(data?.overview);
      setGainers(data?.gainers || []);
      setLosers(data?.losers || []);
      setRecentSearches(recentRes.data || []);
      setSectors(sectorsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInput = (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    setIndexPack(null);
    handleSearchQuery(text);
  };

  const openIndexPack = async (key) => {
    setIsSearching(true);
    setIndexPackLoading(true);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const { data } = await market.getIndexConstituents(key);
      setIndexPack(data);
    } catch {
      setIndexPack(null);
    } finally {
      setIndexPackLoading(false);
    }
  };

  const openIndexByLabel = (label) => {
    const key = INDEX_KEY_MAP[label];
    if (key) openIndexPack(key);
  };

  const clickTag = (q) => {
    setSearchQuery(q);
    setIsSearching(true);
    handleSearchQuery(q);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIndexPack(null);
    setIsSearching(false);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-groww-ink">Market</h1>
          <p className="text-groww-muted">NSE/BSE overview, indices, and discovery</p>
        </div>
      </div>

      <div className="relative z-50">
        <div className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-all ${isSearching ? 'border-groww-primary ring-4 ring-groww-primary-light/50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Symbol, Company or ISIN..."
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => setIsSearching(true)}
            className="flex-1 outline-none text-sm text-groww-ink bg-transparent"
          />
          {isSearching && (
            <button onClick={clearSearch} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {isSearching && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 p-5 max-h-[70vh] overflow-y-auto">
            
            {searchQuery.length > 1 && isIsinQuery(searchQuery) && (
              <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3">
                ISIN search mode — matching by security identifier
              </p>
            )}

            {searchQuery.length > 1 && (
              <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-gray-100">
                <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                  {['ALL', 'LARGE', 'MID', 'SMALL'].map(cap => (
                    <button key={cap} onClick={() => setMarketCapFilter(cap)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${marketCapFilter === cap ? 'bg-white text-groww-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {cap} CAP
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
                  {['ALL', 'EQUITY', 'F&O'].map(lot => (
                    <button key={lot} onClick={() => setLotSizeFilter(lot)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${lotSizeFilter === lot ? 'bg-white text-groww-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {lot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {indexPackLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-groww-primary" />
              </div>
            ) : indexPack?.constituents?.length ? (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {indexPack.name} ({indexPack.constituents.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {indexPack.constituents.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => router.push(`/dashboard/stock/${item.symbol}?exchange=NSE`)}
                      className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                    >
                      <div>
                        <span className="font-semibold text-groww-ink">{item.symbol}</span>
                        <p className="text-xs text-groww-muted mt-0.5">{item.sector}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-groww-ink">
                          {item.ltp != null ? `₹${item.ltp.toLocaleString('en-IN')}` : '—'}
                        </p>
                        {item.changePercent != null && (
                          <p className={`text-xs font-medium ${item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchQuery.length > 1 ? (
              searchResults.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Search Results</h3>
                  <div className="space-y-1">
                    {searchResults.map((item, i) => (
                      <div key={i} onClick={() => router.push(`/dashboard/stock/${item.symbol}?exchange=${item.exchange || 'NSE'}`)} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-groww-ink">{item.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{item.exchange || 'NSE'}</span>
                          </div>
                          <p className="text-xs text-groww-muted mt-0.5">{item.name || item.companyName}</p>
                          {item.isin && <p className="text-[10px] text-gray-400 mt-0.5">ISIN: {item.isin}</p>}
                          {item.marketCap && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{item.marketCap} cap · Lot {item.lotSize || 1}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.ltp != null && <p className="font-semibold text-groww-ink">₹{item.ltp}</p>}
                          {(item.lotSize || 1) > 1 && (
                            <p className="text-[10px] text-groww-primary font-medium mt-0.5">F&amp;O lot: {item.lotSize}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-groww-muted">No results found for "{searchQuery}"</p>
                </div>
              )
            ) : (
              <div className="space-y-6">
                {recentSearches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Searches</h3>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((s, i) => (
                        <button key={i} onClick={() => clickTag(s.symbol || s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition border border-gray-100">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {s.symbol || s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Popular</h3>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((s, i) => (
                      <button key={i} onClick={() => clickTag(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-groww-primary-light/30 hover:bg-groww-primary-light border border-groww-primary-muted text-sm text-groww-primary font-medium rounded-lg transition">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {sectors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Browse Sectors</h3>
                    <div className="flex flex-wrap gap-2">
                      {sectors.map((s, i) => (
                        <button key={i} onClick={() => clickTag(`Sector: ${s.name || s}`)} className="px-3 py-1.5 bg-white border border-gray-200 hover:border-groww-primary text-sm text-gray-700 hover:text-groww-primary rounded-lg transition">
                          {s.name || s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-xl p-6 border ${
        status?.isOpen ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-groww-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              status?.isOpen ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${status?.isOpen ? 'text-green-700' : 'text-gray-700'}`}>
                Market {status?.isOpen ? 'Open' : 'Closed'}
              </h2>
              <p className="text-groww-muted">{status?.message}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-groww-muted">Next Open</div>
            <div className="font-medium">{formatTime(status?.nextOpen)}</div>
            <div className="text-sm text-groww-muted mt-1">Next Close</div>
            <div className="font-medium">{formatTime(status?.nextClose)}</div>
          </div>
        </div>
      </div>

      {hub?.sectoralIndices?.length > 0 && (
        <div className="groww-card p-6">
          <h3 className="text-lg font-semibold text-groww-ink mb-4">Sectoral Indices</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hub.sectoralIndices.map((idx, i) => (
              <div key={i} className="p-3 rounded-xl bg-groww-bg border border-groww-border/60">
                <p className="text-sm font-semibold text-groww-ink">{idx.symbol}</p>
                <p className="text-lg font-bold text-groww-ink mt-1">₹{idx.ltp?.toLocaleString('en-IN')}</p>
                <p className={`text-xs font-medium ${idx.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="groww-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-groww-primary" />
          <h3 className="text-lg font-semibold text-groww-ink">Major & Broad Indices</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {indices.filter((idx) => !['NIFTY IT', 'NIFTY AUTO', 'NIFTY PHARMA', 'NIFTY FMCG', 'NIFTY METAL'].includes(idx.symbol)).map((idx, i) => (
            <div key={i} className="p-4 rounded-xl bg-groww-bg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-groww-muted">{idx.symbol}</p>
                  <p className="text-2xl font-bold text-groww-ink">₹{idx.ltp?.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 ${idx.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {idx.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="font-medium">{idx.changePercent?.toFixed(2)}%</span>
                </div>
              </div>
              <p className={`text-sm ${idx.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {idx.change >= 0 ? '+' : ''}₹{idx.change?.toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => openIndexByLabel(idx.symbol)}
                disabled={!INDEX_KEY_MAP[idx.symbol]}
                className={`mt-3 text-xs font-semibold hover:underline ${INDEX_KEY_MAP[idx.symbol] ? 'text-groww-primary' : 'text-gray-300 cursor-not-allowed'}`}
              >
                {INDEX_KEY_MAP[idx.symbol] ? 'View Constituents' : 'Index only'}
              </button>
            </div>
          ))}
        </div>
        
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-4">Index packs</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {indexPacks.map((pack) => (
            <button
              key={pack.key}
              type="button"
              onClick={() => openIndexPack(pack.key)}
              className="min-w-[150px] p-4 rounded-xl bg-white border border-gray-200 hover:border-groww-primary transition text-left"
            >
              <p className="font-semibold text-gray-800">{pack.label}</p>
              <p className="text-xs text-groww-primary font-medium mt-1">View constituents</p>
            </button>
          ))}
        </div>
      </div>

      {hub?.fiiDii && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">FII / DII (NSE cash, ₹ Cr)</h3>
            <div className="flex items-center gap-2">
              {hub.fiiDii.available ? (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  hub.fiiDii.cached ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}>
                  {hub.fiiDii.cached ? 'Cached · NSE' : 'Live · NSE'}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  Unavailable
                </span>
              )}
              {hub.fiiDii.available && hub.fiiDii.asOf && (
                <span className="text-xs text-gray-400">As of {hub.fiiDii.asOf}</span>
              )}
            </div>
          </div>
          {hub.fiiDii.available && hub.fiiDii.latest ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                {hub.fiiDii.latest.fii && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase">FII / FPI</p>
                    <p className={`text-xl font-bold mt-1 ${hub.fiiDii.latest.fii.netValueCr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net {hub.fiiDii.latest.fii.netValueCr >= 0 ? '+' : ''}
                      {hub.fiiDii.latest.fii.netValueCr} Cr
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Buy {hub.fiiDii.latest.fii.buyValueCr} · Sell {hub.fiiDii.latest.fii.sellValueCr}
                    </p>
                  </div>
                )}
                {hub.fiiDii.latest.dii && (
                  <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-800 uppercase">DII</p>
                    <p className={`text-xl font-bold mt-1 ${hub.fiiDii.latest.dii.netValueCr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net {hub.fiiDii.latest.dii.netValueCr >= 0 ? '+' : ''}
                      {hub.fiiDii.latest.dii.netValueCr} Cr
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      Buy {hub.fiiDii.latest.dii.buyValueCr} · Sell {hub.fiiDii.latest.dii.sellValueCr}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">{hub.fiiDii.note}</p>
            </>
          ) : (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-700">
                Live FII/DII feed is not reachable right now ({hub.fiiDii.source || 'unknown'}).
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {hub.fiiDii.note || 'Retry later — indices and stock quotes below still update from the simulator.'}
              </p>
              <p className="text-[10px] text-amber-700 mt-2 font-medium">
                Educational mode: do not use for real trading decisions until NSE data loads.
              </p>
            </div>
          )}
        </div>
      )}

      {overview?.breadth && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Market Breadth (Nifty universe)</h3>
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              <div
                className="bg-green-500"
                style={{ flex: Math.max(1, overview.breadth.advances) }}
              />
              <div className="bg-gray-300" style={{ flex: Math.max(1, overview.breadth.unchanged) }} />
              <div
                className="bg-red-500"
                style={{ flex: Math.max(1, overview.breadth.declines) }}
              />
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-green-600">{overview.breadth.advances} Advances</span>
              <span className="text-gray-500">{overview.breadth.unchanged} Unchanged</span>
              <span className="text-red-600">{overview.breadth.declines} Declines</span>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Sector view</h3>
            <p className="text-sm text-groww-muted mb-3">Explore sector performance from live Nifty 50 quotes.</p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/sectors')}
              className="text-sm font-semibold text-groww-primary hover:underline text-left"
            >
              Open sector analytics →
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-groww-ink mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" /> Most Active
        </h3>
        <div className="flex gap-2 border-b border-gray-100 pb-4 mb-4">
          {[
            { id: 'volume', label: 'By Volume' },
            { id: 'value', label: 'By Value' },
            { id: 'lots', label: 'By Lots (F&O)' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === tab.id ? 'bg-groww-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {activeStocks.length > 0 ? (
            activeStocks.map((row) => (
              <div
                key={row.symbol}
                className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 cursor-pointer"
                onClick={() => router.push(`/dashboard/stock/${row.symbol}?exchange=NSE`)}
              >
                <div>
                  <p className="font-semibold text-gray-800">{row.symbol}</p>
                  <p className={`text-xs font-medium ${row.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.changePercent >= 0 ? '+' : ''}{row.changePercent?.toFixed(2)}%
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-500">
                  {activeTab === 'value'
                    ? `₹${(row.turnover / 1e7).toFixed(1)} Cr`
                    : `${((row.volume || 0) / 1e6).toFixed(1)}M vol`}
                </p>
              </div>
            ))
          ) : (
            <p className="text-groww-muted col-span-3 text-center py-6">Loading market activity…</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="groww-card overflow-hidden">
          <div className="p-6 border-b border-groww-border flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-groww-ink">Top Gainers</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {gainers.slice(0, 10).map((g, i) => (
              <div key={i} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium text-groww-ink">{g.symbol}</p>
                  <p className="text-sm text-groww-muted">₹{g.ltp?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">+{g.changePercent?.toFixed(2)}%</p>
                  <p className="text-sm text-green-600">+₹{g.change?.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {gainers.length === 0 && (
              <div className="text-center py-8 text-groww-muted">No data available</div>
            )}
          </div>
        </div>

        <div className="groww-card overflow-hidden">
          <div className="p-6 border-b border-groww-border flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-groww-ink">Top Losers</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {losers.slice(0, 10).map((l, i) => (
              <div key={i} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium text-groww-ink">{l.symbol}</p>
                  <p className="text-sm text-groww-muted">₹{l.ltp?.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">{l.changePercent?.toFixed(2)}%</p>
                  <p className="text-sm text-red-600">₹{l.change?.toFixed(2)}</p>
                </div>
              </div>
            ))}
            {losers.length === 0 && (
              <div className="text-center py-8 text-groww-muted">No data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold text-gray-800">52-Week High / Low</h3>
            <span className="text-xs text-gray-500 ml-auto">
              {hub?.week52?.counts?.high ?? 0} high · {hub?.week52?.counts?.low ?? 0} low
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 uppercase">Near 52W High</p>
              {(hub?.week52?.week52High || []).slice(0, 6).map((row) => (
                <div
                  key={row.symbol}
                  onClick={() => router.push(`/dashboard/stock/${row.symbol}?exchange=NSE`)}
                  className="flex justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-1 rounded"
                >
                  <span className="font-medium text-sm">{row.symbol}</span>
                  <span className="text-green-600 text-sm font-medium">₹{row.ltp?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 uppercase">Near 52W Low</p>
              {(hub?.week52?.week52Low || []).slice(0, 6).map((row) => (
                <div
                  key={row.symbol}
                  onClick={() => router.push(`/dashboard/stock/${row.symbol}?exchange=NSE`)}
                  className="flex justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-1 rounded"
                >
                  <span className="font-medium text-sm">{row.symbol}</span>
                  <span className="text-red-600 text-sm font-medium">₹{row.ltp?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-groww-primary" />
            <h3 className="font-bold text-gray-800">Circuit Hitters</h3>
            <span className="text-xs text-gray-500 ml-auto">
              UC {hub?.circuits?.counts?.upper ?? 0} · LC {hub?.circuits?.counts?.lower ?? 0}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2 uppercase">Upper circuit</p>
              {(hub?.circuits?.upperCircuit || []).slice(0, 6).map((row) => (
                <div
                  key={row.symbol}
                  onClick={() => router.push(`/dashboard/stock/${row.symbol}?exchange=NSE`)}
                  className="flex justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-1 rounded"
                >
                  <span className="font-medium text-sm">{row.symbol}</span>
                  <span className="text-sm text-gray-600">₹{row.upperCircuit}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 uppercase">Lower circuit</p>
              {(hub?.circuits?.lowerCircuit || []).slice(0, 6).map((row) => (
                <div
                  key={row.symbol}
                  onClick={() => router.push(`/dashboard/stock/${row.symbol}?exchange=NSE`)}
                  className="flex justify-between py-2 border-b border-gray-50 cursor-pointer hover:bg-gray-50 px-1 rounded"
                >
                  <span className="font-medium text-sm">{row.symbol}</span>
                  <span className="text-sm text-gray-600">₹{row.lowerCircuit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-1">Calendars & Corporate Actions</h3>
        {hub?.corporateActionsSource && (
          <p className="text-xs text-gray-500 mb-4">
            Corp actions: {hub.corporateActionsSource === 'nse_live' ? 'Live NSE' : 'Education calendar'}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'ipo', label: 'IPO' },
            { id: 'results', label: 'Results' },
            { id: 'corp', label: 'Corp actions' },
            { id: 'lots', label: 'Lot changes' },
            { id: 'holidays', label: 'Holidays' },
            { id: 'bulk', label: 'Bulk deals' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCalendarPanel(calendarPanel === t.id ? null : t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                calendarPanel === t.id ? 'bg-groww-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {calendarPanel === 'ipo' && (
          <div className="space-y-2">
            {(hub?.calendars?.ipo || []).map((ipo) => (
              <div key={ipo.symbol} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-semibold">{ipo.company} ({ipo.symbol})</p>
                <p className="text-gray-500 text-xs mt-1">{ipo.openDate} – {ipo.closeDate} · Lot {ipo.lotSize} · {ipo.issueSize}</p>
              </div>
            ))}
          </div>
        )}
        {calendarPanel === 'results' && (
          <div className="space-y-2">
            {(hub?.calendars?.results || []).map((r) => (
              <div key={`${r.symbol}-${r.date}`} className="flex justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <span className="font-semibold">{r.symbol}</span>
                <span className="text-gray-500">{r.date} · {r.type}</span>
              </div>
            ))}
          </div>
        )}
        {calendarPanel === 'corp' && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(hub?.corporateActions || []).map((a) => (
              <div
                key={`${a.symbol}-${a.exDate}`}
                className="p-3 bg-gray-50 rounded-lg text-sm cursor-pointer hover:bg-gray-100"
                onClick={() => router.push(`/dashboard/stock/${a.symbol}?exchange=NSE`)}
              >
                <p className="font-semibold">{a.symbol} — {a.type}</p>
                <p className="text-gray-600 text-xs mt-1">{a.title}</p>
                <p className="text-gray-400 text-xs">
                  Ex {a.exDate}
                  {a.source === 'nse_live' ? ' · NSE live' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
        {calendarPanel === 'lots' && (
          <div className="space-y-2">
            {(hub?.calendars?.lotSizeChanges || []).map((l) => (
              <div key={l.symbol} className="p-3 bg-red-50 rounded-lg text-sm">
                <p className="font-semibold">{l.symbol} · {l.segment}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Effective {l.effectiveDate}: {l.oldLot} → {l.newLot} shares/lot
                </p>
              </div>
            ))}
          </div>
        )}
        {calendarPanel === 'holidays' && (
          <div className="grid sm:grid-cols-2 gap-2">
            {(hub?.calendars?.holidays || []).map((h) => (
              <div key={h.date} className="p-2 bg-gray-50 rounded-lg text-sm flex justify-between">
                <span>{h.name}</span>
                <span className="text-gray-500">{h.date}</span>
              </div>
            ))}
          </div>
        )}
        {calendarPanel === 'bulk' && (
          <div className="space-y-2">
            {(hub?.bulkDeals || []).map((b, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-semibold">{b.symbol} · {b.date}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {b.qty.toLocaleString('en-IN')} sh ({b.lots} lots) @ ₹{b.price} · ₹{b.valueCr} Cr
                </p>
                <p className="text-xs text-gray-400">{b.buyer} ← {b.seller}</p>
              </div>
            ))}
          </div>
        )}
        {!calendarPanel && (
          <p className="text-sm text-gray-500">Select a tab to view IPO, results, corporate actions, lot revisions, NSE holidays, or bulk deals.</p>
        )}
      </div>

      <div className="bg-groww-primary-light border border-groww-primary-muted rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-groww-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-groww-ink">Market Timings</p>
            <p className="text-sm text-groww-primary mt-1">
              <strong>Regular Session:</strong> 9:15 AM - 3:30 PM IST (Monday to Friday)<br/>
              <strong>Weekend:</strong> Market is closed on Saturday and Sunday<br/>
              <strong>Holidays:</strong> Market remains closed on public holidays
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}