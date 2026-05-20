'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, TrendingUp, TrendingDown, Calendar, Search, X, Trophy, Zap, Gift, Layers, ChevronRight } from 'lucide-react';

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

  const popularSearches = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, indicesRes, gainersRes, losersRes, recentRes, sectorsRes] = await Promise.all([
        market.getStatus(),
        market.getIndices(),
        market.getGainers(),
        market.getLosers(),
        market.getRecentSearches().catch(() => ({ data: [] })),
        market.getSectors().catch(() => ({ data: [] }))
      ]);
      setStatus(statusRes.data);
      let loadedIndices = indicesRes.data || [];
      if (!loadedIndices.find(i => i.symbol === 'NIFTY MIDCAP 100')) {
         loadedIndices.push({ symbol: 'NIFTY MIDCAP 100', ltp: 45000, changePercent: 1.2, change: 540 });
         loadedIndices.push({ symbol: 'NIFTY SMALLCAP 100', ltp: 15000, changePercent: -0.5, change: -75 });
      }
      setIndices(loadedIndices);
      setGainers(gainersRes.data);
      setLosers(losersRes.data);
      setRecentSearches(recentRes.data || []);
      setSectors(sectorsRes.data || []);
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

  const handleSearchInput = async (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    handleSearchQuery(text);
  };

  const handleSearchQuery = async (text) => {
    if (text.length > 1) {
      try {
        const { data } = await market.search(text);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const clickTag = (q) => {
    setSearchQuery(q);
    setIsSearching(true);
    handleSearchQuery(q);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const filteredResults = searchResults.filter(item => {
    if (marketCapFilter !== 'ALL') {
      if (marketCapFilter === 'LARGE' && (item.marketCapValue || 0) < 20000) return false;
      if (marketCapFilter === 'MID' && ((item.marketCapValue || 0) < 5000 || (item.marketCapValue || 0) >= 20000)) return false;
      if (marketCapFilter === 'SMALL' && (item.marketCapValue || 0) >= 5000) return false;
    }
    if (lotSizeFilter !== 'ALL') {
      if (lotSizeFilter === 'F&O' && (item.lotSize || 1) <= 1) return false;
      if (lotSizeFilter === 'EQUITY' && (item.lotSize || 1) > 1) return false;
    }
    return true;
  });

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

            {searchQuery.length > 1 ? (
              filteredResults.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Search Results</h3>
                  <div className="space-y-1">
                    {filteredResults.map((item, i) => (
                      <div key={i} onClick={() => router.push(`/dashboard/stock/${item.symbol}?exchange=${item.exchange || 'NSE'}`)} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-groww-ink">{item.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{item.exchange || 'NSE'}</span>
                          </div>
                          <p className="text-xs text-groww-muted mt-0.5">{item.name || item.companyName}</p>
                          {item.isin && <p className="text-[10px] text-gray-400 mt-0.5">ISIN: {item.isin}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-groww-ink">₹{item.ltp || '--'}</p>
                          {item.lotSize > 1 && <p className="text-[10px] text-groww-primary font-medium mt-0.5">Lot: {item.lotSize}</p>}
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

      <div className="groww-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-groww-primary" />
          <h3 className="text-lg font-semibold text-groww-ink">Major & Broad Indices</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {indices.map((idx, i) => (
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
              <button onClick={() => { setIsSearching(true); handleSearchQuery(`Index: ${idx.symbol}`); }} className="mt-3 text-xs font-semibold text-groww-primary hover:underline">
                View Constituents
              </button>
            </div>
          ))}
        </div>
        
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-4">Sectoral Indices</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {['NIFTY BANK', 'NIFTY IT', 'NIFTY AUTO', 'NIFTY PHARMA', 'NIFTY METAL', 'NIFTY FMCG'].map((sec, i) => (
             <button key={i} onClick={() => { setIsSearching(true); handleSearchQuery(sec); }} className="min-w-[150px] p-4 rounded-xl bg-white border border-gray-200 hover:border-groww-primary transition text-left">
               <p className="font-semibold text-gray-800">{sec}</p>
               <p className="text-sm text-green-600 font-medium mt-1">+1.2%</p>
             </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Market Breadth */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Market Breadth</h3>
           <div className="flex h-3 rounded-full overflow-hidden mb-3">
              <div className="bg-green-500 flex-grow" style={{flex: 1200}}></div>
              <div className="bg-gray-300" style={{flex: 100}}></div>
              <div className="bg-red-500 flex-grow" style={{flex: 800}}></div>
           </div>
           <div className="flex justify-between text-sm font-medium">
              <span className="text-green-600">1200 Advances</span>
              <span className="text-gray-400">100 UC</span>
              <span className="text-red-600">800 Declines</span>
           </div>
        </div>

        {/* FII / DII Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
           <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">FII / DII Activity (Cash)</h3>
           <div className="flex gap-8">
             <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">FII Net Value</p>
                <p className="text-xl font-bold text-red-600">-₹450.5 Cr</p>
             </div>
             <div className="w-px bg-gray-200"></div>
             <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">DII Net Value</p>
                <p className="text-xl font-bold text-green-600">+₹1,200.0 Cr</p>
             </div>
           </div>
        </div>
      </div>

      {/* Most Active */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-groww-ink mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> Most Active</h3>
        <div className="flex gap-2 border-b border-gray-100 pb-4 mb-4">
           {['By Volume', 'By Value', 'By Lots (F&O)'].map((tab, i) => (
             <button key={tab} className={`px-4 py-2 text-sm font-medium rounded-lg transition ${i===0 ? 'bg-groww-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{tab}</button>
           ))}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
           {['HDFCBANK', 'RELIANCE', 'ICICIBANK', 'INFY', 'TCS'].map((sym, i) => (
              <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 cursor-pointer" onClick={() => router.push(`/dashboard/stock/${sym}?exchange=NSE`)}>
                 <p className="font-semibold text-gray-800">{sym}</p>
                 <p className="text-sm font-medium text-gray-500">{(45 - i*5).toFixed(1)}M Vol</p>
              </div>
           ))}
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

      {/* Action & Discovery Data */}
      <div className="grid md:grid-cols-3 gap-6">
         {/* Highs and Lows */}
         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center cursor-pointer hover:border-groww-primary transition">
            <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="font-bold text-gray-800">52-W High/Low</h3>
            <p className="text-sm text-gray-500 mt-1">14 Stocks at 52-W High</p>
         </div>
         {/* Circuits */}
         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center cursor-pointer hover:border-groww-primary transition">
            <TrendingUp className="w-8 h-8 text-groww-primary mb-2" />
            <h3 className="font-bold text-gray-800">Circuit Hitters</h3>
            <p className="text-sm text-gray-500 mt-1">Upper: 21 | Lower: 8</p>
         </div>
         {/* Corporate Actions */}
         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm row-span-2 md:col-start-3 md:row-start-1">
            <h3 className="font-bold text-gray-800 mb-4">Corporate Actions & Calendar</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition">
                 <div className="w-10 h-10 rounded-lg bg-groww-primary-light flex justify-center items-center"><Calendar className="w-5 h-5 text-groww-primary" /></div>
                 <div className="flex-1">
                   <p className="font-semibold text-gray-800 text-sm">IPO & Results</p>
                   <p className="text-xs text-gray-500 mt-0.5">View upcoming issues</p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition">
                 <div className="w-10 h-10 rounded-lg bg-groww-primary-light flex justify-center items-center"><Gift className="w-5 h-5 text-groww-primary" /></div>
                 <div className="flex-1">
                   <p className="font-semibold text-gray-800 text-sm">Dividends & Splits</p>
                   <p className="text-xs text-gray-500 mt-0.5">Corporate actions calendar</p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-100 transition">
                 <div className="w-10 h-10 rounded-lg bg-red-50 flex justify-center items-center"><Layers className="w-5 h-5 text-red-500" /></div>
                 <div className="flex-1">
                   <p className="font-semibold text-gray-800 text-sm">F&O Lot Size Changes</p>
                   <p className="text-xs text-gray-500 mt-0.5">Upcoming contract revisions</p>
                 </div>
                 <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
         </div>
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