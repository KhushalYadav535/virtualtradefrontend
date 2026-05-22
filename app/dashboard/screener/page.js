'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { advanced } from '../../../lib/api';

const DEFAULT_FILTERS = {
  sector: 'ALL',
  minChangePct: '',
  maxChangePct: '',
  minVolume: '',
  maxVolume: '',
  minLotValue: '',
  maxLotValue: '',
  minPe: '',
  maxPe: '',
  minPb: '',
  maxPb: '',
  minDivYield: '',
  minMarketCap: '',
  minLotsTraded: '',
  lotFilter: 'ALL',
  sortBy: 'changePercent',
  sortDir: 'desc'
};

export default function ScreenerPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedScans, setSavedScans] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scanAlerts, setScanAlerts] = useState([]);
  const [presets, setPresets] = useState([]);

  const buildParams = useCallback((f) => {
    const p = { ...f, limit: 40 };
    Object.keys(p).forEach((k) => { if (p[k] === '' || p[k] === 'ALL') delete p[k]; });
    return p;
  }, []);

  const run = useCallback((f) => {
    setLoading(true);
    const params = buildParams(f || filters);
    advanced.getScreener(params)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters, buildParams]);

  const loadScans = useCallback(() => {
    advanced.listScans().then((r) => setSavedScans(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    run();
    loadScans();
    advanced.listScanAlerts().then((r) => setScanAlerts(r.data || [])).catch(() => {});
    advanced.getScreenerPresets().then((r) => setPresets(r.data || [])).catch(() => {});
  }, []);

  const applyPreset = (preset) => {
    const f = { ...DEFAULT_FILTERS, ...preset.filters, sector: preset.filters.sector || 'ALL', lotFilter: preset.filters.lotFilter || 'ALL' };
    setFilters(f);
    run(f);
  };

  const subscribeAlert = async () => {
    const name = saveName.trim() || `Alert ${new Date().toLocaleDateString('en-IN')}`;
    try {
      await advanced.subscribeScanAlert({ name, filters: buildParams(filters) });
      const { data } = await advanced.listScanAlerts();
      setScanAlerts(data || []);
      alert('Scan alert enabled — notifications when matches change');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to subscribe');
    }
  };

  const handleSave = async () => {
    if (!saveName.trim()) return;
    try {
      await advanced.saveScan({ name: saveName, filters: buildParams(filters) });
      setSaveName('');
      setShowSave(false);
      loadScans();
    } catch (e) { console.error(e); }
  };

  const handleLoad = async (id) => {
    try {
      const { data: scan } = await advanced.getScan(id);
      setFilters({ ...DEFAULT_FILTERS, ...scan.filters, sector: scan.filters.sector || 'ALL', lotFilter: scan.filters.lotFilter || 'ALL' });
      run(scan.filters);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this saved scan?')) return;
    try { await advanced.deleteScan(id); loadScans(); }
    catch (e) { console.error(e); }
  };

  const setFilter = (key, val) => setFilters((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock Screener</h1>
          <p className="text-sm text-gray-500">Find stocks by price, volume, lot value, fundamentals &amp; more</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowSave(!showSave)} className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50"><Save className="w-4 h-4" /> Save</button>
          <button type="button" onClick={subscribeAlert} className="text-sm border border-amber-300 bg-amber-50 rounded-lg px-3 py-1.5 text-amber-900 font-medium">Enable alert</button>
        </div>
      </div>

      {showSave && (
        <div className="bg-white border rounded-xl p-4 flex gap-3 items-center">
          <input type="text" className="border rounded-lg px-3 py-1.5 flex-1 text-sm" placeholder="Scan name..." value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          <button type="button" onClick={handleSave} className="bg-groww-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold">Save</button>
          <button type="button" onClick={() => setShowSave(false)} className="text-sm text-gray-500">Cancel</button>
        </div>
      )}

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 w-full font-medium">Pre-built scans</span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              title={p.description}
              className="px-3 py-1.5 text-sm border border-indigo-200 bg-indigo-50 text-indigo-900 rounded-lg hover:bg-indigo-100"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {scanAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-gray-500 font-medium">Active alerts:</span>
          {scanAlerts.map((a) => (
            <span key={a.id} className="px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              {a.name} ({a.last_match_count} matches)
            </span>
          ))}
        </div>
      )}

      {savedScans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {savedScans.map((sc) => (
            <div key={sc.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 text-sm">
              <button type="button" onClick={() => handleLoad(sc.id)} className="text-groww-primary font-medium hover:underline">{sc.name}</button>
              <button type="button" onClick={() => handleDelete(sc.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm"><span className="text-gray-500">Sector</span>
            <select className="block border rounded-lg px-2 py-1.5 mt-1" value={filters.sector} onChange={(e) => setFilter('sector', e.target.value)}>
              <option value="ALL">All</option>{(data?.sectors || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm"><span className="text-gray-500">Lot filter</span>
            <select className="block border rounded-lg px-2 py-1.5 mt-1" value={filters.lotFilter} onChange={(e) => setFilter('lotFilter', e.target.value)}>
              <option value="ALL">All</option><option value="gt1">F&amp;O lots</option><option value="eq1">Equity (1)</option>
            </select>
          </label>
          <label className="text-sm"><span className="text-gray-500">Min % change</span>
            <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minChangePct} onChange={(e) => setFilter('minChangePct', e.target.value)} />
          </label>
          <label className="text-sm"><span className="text-gray-500">Sort by</span>
            <select className="block border rounded-lg px-2 py-1.5 mt-1" value={filters.sortBy} onChange={(e) => setFilter('sortBy', e.target.value)}>
              <option value="changePercent">% Change</option><option value="ltp">Price</option><option value="lotValue">Lot value</option>
              <option value="volume">Volume</option><option value="lotSize">Lot size</option><option value="symbol">Symbol</option>
            </select>
          </label>
          <label className="text-sm"><span className="text-gray-500">Order</span>
            <select className="block border rounded-lg px-2 py-1.5 mt-1" value={filters.sortDir} onChange={(e) => setFilter('sortDir', e.target.value)}>
              <option value="desc">High→Low</option><option value="asc">Low→High</option>
            </select>
          </label>
          <button type="button" onClick={() => run()} className="flex items-center gap-2 bg-groww-primary text-white px-4 py-2 rounded-lg font-semibold">
            <Search className="w-4 h-4" /> Scan
          </button>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Advanced
          </button>
        </div>

        {showAdvanced && (
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            <label className="text-sm"><span className="text-gray-500">Max % change</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.maxChangePct} onChange={(e) => setFilter('maxChangePct', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min volume</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minVolume} onChange={(e) => setFilter('minVolume', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Max volume</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.maxVolume} onChange={(e) => setFilter('maxVolume', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min lot value (₹)</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minLotValue} onChange={(e) => setFilter('minLotValue', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Max lot value (₹)</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.maxLotValue} onChange={(e) => setFilter('maxLotValue', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min P/E</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minPe} onChange={(e) => setFilter('minPe', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Max P/E</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.maxPe} onChange={(e) => setFilter('maxPe', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min P/B</span>
              <input type="number" step="0.1" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minPb} onChange={(e) => setFilter('minPb', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Max P/B</span>
              <input type="number" step="0.1" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.maxPb} onChange={(e) => setFilter('maxPb', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min div yield %</span>
              <input type="number" step="0.1" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minDivYield} onChange={(e) => setFilter('minDivYield', e.target.value)} />
            </label>
            <label className="text-sm"><span className="text-gray-500">Min lots traded</span>
              <input type="number" className="block border rounded-lg px-2 py-1.5 mt-1 w-24" value={filters.minLotsTraded} onChange={(e) => setFilter('minLotsTraded', e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-groww-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.results?.map((s) => (
            <Link key={s.symbol} href={`/dashboard/stock/${s.symbol}`} className="bg-white border rounded-xl p-4 hover:border-groww-primary transition">
              <p className="font-bold text-gray-900">{s.symbol}</p>
              <p className="text-xs text-gray-500">{s.sector} · Lot {s.lotSize} · ₹{s.lotValue?.toLocaleString('en-IN')}/lot</p>
              <p className="text-lg font-semibold mt-1">
                ₹{s.ltp?.toLocaleString('en-IN')}
                <span className={`ml-2 text-sm ${(s.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(s.changePercent || 0) >= 0 ? '+' : ''}{s.changePercent}%
                </span>
              </p>
              {(s.peRatio || s.pbRatio) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  P/E {s.peRatio ?? '—'} · P/B {s.pbRatio ?? '—'} · Vol {s.volume?.toLocaleString('en-IN')}
                </p>
              )}
            </Link>
          ))}
          {data?.results?.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">No stocks match your filters</p>}
        </div>
      )}
    </div>
  );
}
