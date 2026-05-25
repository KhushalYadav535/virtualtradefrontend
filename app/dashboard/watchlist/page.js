'use client';

import React, { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { watchlist, market } from '../../../lib/api';
import { useMarketStore } from '../../../lib/store';
import { useConnectionStore } from '../../../lib/connectionStore';
import { initSocket } from '../../../lib/socket';
import { getPollIntervalMs } from '../../../lib/pollInterval';
import { mergeTradingPrefs } from '../../../lib/tradingPrefs';
import { loadCachedWatchlists, saveWatchlistsCache } from '../../../lib/portfolioCache';
import Link from 'next/link';
import {
  Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Pencil,
  Share2, ChevronUp, ChevronDown, Copy, Check, GripVertical, RefreshCw, Cloud
} from 'lucide-react';
import WatchlistSymbolSearch from '../../../components/WatchlistSymbolSearch';
import WatchlistQuickTrade from '../../../components/WatchlistQuickTrade';

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addSymbol, setAddSymbol] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [templates, setTemplates] = useState([]);
  const [importing, setImporting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [cloneToken, setCloneToken] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [cloning, setCloning] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [filterBy, setFilterBy] = useState('all');
  const [lotFilter, setLotFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [popupSymbol, setPopupSymbol] = useState(null);
  const updatePrice = useMarketStore((s) => s.updatePrice);
  const updatePrices = useMarketStore((s) => s.updatePrices);
  const prices = useMarketStore((s) => s.prices);
  const socketStatus = useConnectionStore((s) => s.socketStatus);

  const canDragReorder = sortBy === 'default' && filterBy === 'all' && lotFilter === 'all';

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const cached = loadCachedWatchlists();
    if (cached?.length) {
      setWatchlists(cached);
      setSelectedWatchlist(cached[0]);
      setLoading(false);
    }
    loadWatchlists();
    watchlist.getTemplates().then(({ data }) => setTemplates(data || [])).catch(() => {});
    initSocket();
  }, []);

  useEffect(() => {
    const syms = selectedWatchlist?.symbols;
    if (!syms?.length) return;
    let cancelled = false;
    const loadBatch = async () => {
      if (cancelled) return;
      try {
        const { data } = await market.getQuotes(syms);
        if (!cancelled && Array.isArray(data) && data.length) updatePrices(data);
      } catch {
        if (!cancelled) syms.forEach((sym) => loadQuote(sym));
      }
    };
    loadBatch();
    const prefs = mergeTradingPrefs(JSON.parse(localStorage.getItem('tradingPrefs') || 'null'));
    const baseMs = getPollIntervalMs(prefs, navigator.onLine);
    const intervalMs = socketStatus === 'connected' ? Math.max(60_000, baseMs * 4) : baseMs;
    const t = setInterval(loadBatch, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedWatchlist?.id, selectedWatchlist?.symbols?.join(','), socketStatus]);

  const loadWatchlists = async () => {
    try {
      const { data } = await watchlist.getAll();
      setWatchlists(data);
      saveWatchlistsCache(data);
      if (data.length > 0) {
        setSelectedWatchlist((prev) => data.find((w) => w.id === prev?.id) || data[0]);
      } else {
        setSelectedWatchlist(null);
      }
      setLastSyncedAt(new Date());
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('watchlistLastSync', String(Date.now()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await loadWatchlists();
      showToast('Watchlist synced from server');
    } catch {
      showToast('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('watchlistLastSync');
    if (stored) setLastSyncedAt(new Date(parseInt(stored, 10)));
  }, []);

  const loadQuote = async (sym) => {
    try {
      const { data } = await market.getQuote(sym);
      updatePrice({ symbol: sym, ...data });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await watchlist.create(newName.trim());
      setWatchlists([...watchlists, { ...data, symbols: [] }]);
      setSelectedWatchlist({ ...data, symbols: [] });
      setNewName('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not create list');
    } finally {
      setCreating(false);
    }
  };

  const handleRenameWatchlist = async (id) => {
    if (!renameValue.trim()) return;
    try {
      const { data } = await watchlist.rename(id, renameValue.trim());
      const updated = watchlists.map((w) => (w.id === id ? { ...w, name: data.name } : w));
      setWatchlists(updated);
      if (selectedWatchlist?.id === id) {
        setSelectedWatchlist({ ...selectedWatchlist, name: data.name });
      }
      setRenamingId(null);
      setRenameValue('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Rename failed');
    }
  };

  const handleDeleteWatchlist = async (id) => {
    if (!window.confirm('Delete this watchlist?')) return;
    try {
      await watchlist.delete(id);
      const updated = watchlists.filter((w) => w.id !== id);
      setWatchlists(updated);
      setSelectedWatchlist(updated[0] || null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleAddSymbol = async () => {
    if (!addSymbol.trim() || !selectedWatchlist) return;
    await handleAddSymbolFromSearch(addSymbol.trim().toUpperCase());
  };

  const handleAddSymbolFromSearch = async (sym) => {
    if (!sym || !selectedWatchlist) return;
    const symbol = sym.trim().toUpperCase();
    try {
      await watchlist.add(selectedWatchlist.id, symbol);
      await loadWatchlists();
      loadQuote(symbol);
      setAddSymbol('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not add symbol');
    }
  };

  const handleRemoveSymbol = async (symbol) => {
    if (!selectedWatchlist) return;
    try {
      await watchlist.remove(selectedWatchlist.id, symbol);
      await loadWatchlists();
    } catch (err) {
      showToast(err.response?.data?.error || 'Remove failed');
    }
  };

  const handleImportTemplate = async (templateKey) => {
    if (!selectedWatchlist) return;
    setImporting(true);
    try {
      const { data } = await watchlist.importTemplate(selectedWatchlist.id, templateKey);
      showToast(`Imported ${data.imported} symbols from ${data.name}`);
      await loadWatchlists();
    } catch (err) {
      showToast(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleShare = async () => {
    if (!selectedWatchlist) return;
    try {
      const { data } = await watchlist.share(selectedWatchlist.id);
      const url = `${window.location.origin}/dashboard/watchlist?share=${data.shareToken}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Share link copied to clipboard');
    } catch (err) {
      showToast(err.response?.data?.error || 'Share failed');
    }
  };

  const handleCloneShared = async () => {
    if (!cloneToken.trim()) return;
    setCloning(true);
    try {
      const token = cloneToken.trim().replace(/.*share=/, '');
      await watchlist.cloneShared(token, cloneName.trim() || undefined);
      setCloneToken('');
      setCloneName('');
      showToast('Watchlist cloned');
      await loadWatchlists();
    } catch (err) {
      showToast(err.response?.data?.error || 'Invalid share link');
    } finally {
      setCloning(false);
    }
  };

  const persistSymbolOrder = async (next) => {
    if (!selectedWatchlist) return;
    try {
      await watchlist.reorder(selectedWatchlist.id, next);
      setSelectedWatchlist({ ...selectedWatchlist, symbols: next });
      setWatchlists(watchlists.map((w) => (w.id === selectedWatchlist.id ? { ...w, symbols: next } : w)));
    } catch (err) {
      showToast(err.response?.data?.error || 'Reorder failed');
    }
  };

  const moveSymbol = async (index, direction) => {
    if (!selectedWatchlist?.symbols) return;
    const next = [...selectedWatchlist.symbols];
    const j = index + direction;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await persistSymbolOrder(next);
  };

  const handleDragDrop = async (fromIndex, toIndex) => {
    if (!selectedWatchlist?.symbols || fromIndex === toIndex) return;
    const next = [...selectedWatchlist.symbols];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setDragIndex(null);
    await persistSymbolOrder(next);
  };

  const sortedSymbols = useMemo(() => {
    let syms = selectedWatchlist?.symbols || [];
    
    if (filterBy === 'gainers') {
      syms = syms.filter((s) => (prices[s]?.changePercent || 0) > 0);
    } else if (filterBy === 'losers') {
      syms = syms.filter((s) => (prices[s]?.changePercent || 0) < 0);
    } else if (filterBy === 'active') {
      syms = [...syms].sort((a, b) => (prices[b]?.volume || 0) - (prices[a]?.volume || 0)).slice(0, 50);
    }

    if (lotFilter === 'eq1') {
      syms = syms.filter((s) => (prices[s]?.lotSize || 1) === 1);
    } else if (lotFilter === 'gt1') {
      syms = syms.filter((s) => (prices[s]?.lotSize || 1) > 1);
    }

    if (sortBy === 'alpha') return [...syms].sort();
    if (sortBy === 'change') {
      return [...syms].sort((a, b) => {
        const pa = prices[a]?.changePercent ?? 0;
        const pb = prices[b]?.changePercent ?? 0;
        return pb - pa;
      });
    }
    if (sortBy === 'price') {
      return [...syms].sort((a, b) => (prices[b]?.ltp ?? 0) - (prices[a]?.ltp ?? 0));
    }
    if (sortBy === 'lotSize') {
      return [...syms].sort((a, b) => (prices[b]?.lotSize ?? 1) - (prices[a]?.lotSize ?? 1));
    }
    if (sortBy === 'volume') {
      return [...syms].sort((a, b) => (prices[b]?.volume ?? 0) - (prices[a]?.volume ?? 0));
    }
    return syms;
  }, [selectedWatchlist?.symbols, sortBy, filterBy, lotFilter, prices]);

  const getPriceData = (symbol) => prices[symbol] || null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) setCloneToken(token);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Watchlist</h1>
          <p className="text-gray-500">Synced across devices when you log in</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Cloud className="w-4 h-4" />
            {lastSyncedAt
              ? `Last synced ${lastSyncedAt.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`
              : 'Not synced yet'}
          </div>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync now
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Import shared watchlist</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={cloneToken}
            onChange={(e) => setCloneToken(e.target.value)}
            placeholder="Paste share token or link"
            className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm"
          />
          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="New list name (optional)"
            className="w-40 px-3 py-2 border rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={handleCloneShared}
            disabled={cloning}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {cloning ? 'Cloning…' : 'Clone'}
          </button>
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {watchlists.map((wl) => (
          <div
            key={wl.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap transition ${
              selectedWatchlist?.id === wl.id
                ? 'bg-groww-primary-light text-groww-primary border border-groww-primary-muted font-semibold'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium'
            }`}
            onClick={() => setSelectedWatchlist(wl)}
          >
            {renamingId === wl.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="px-2 py-0.5 border rounded text-sm w-32"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameWatchlist(wl.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  autoFocus
                />
                <button type="button" onClick={(e) => { e.stopPropagation(); handleRenameWatchlist(wl.id); }} className="text-xs text-groww-primary">
                  Save
                </button>
              </div>
            ) : (
              <>
                <Star className={`w-4 h-4 ${selectedWatchlist?.id === wl.id ? 'fill-groww-primary' : 'text-gray-400'}`} />
                <span>
                  {wl.name}
                  {wl.isDefault && <span className="text-xs opacity-60 ml-1">(Default)</span>}
                </span>
                <span className="text-xs opacity-60 px-1">{wl.symbols?.length || 0}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setRenamingId(wl.id); setRenameValue(wl.name); }}
                  className="p-1 opacity-50 hover:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }}
                  className="p-1 opacity-50 hover:text-red-600 hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        
        {/* Add new list tab */}
        <div className="flex items-center gap-2 px-3 py-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 shrink-0">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name"
            className="w-32 px-2 py-1 border rounded text-sm bg-white"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
          />
          <button
            onClick={handleCreateWatchlist}
            disabled={creating}
            className="p-1.5 bg-groww-primary text-white rounded hover:bg-groww-primary-dark disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {selectedWatchlist ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-groww-primary fill-groww-primary" />
                  <h3 className="text-lg font-semibold text-gray-800">{selectedWatchlist.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value=""
                    disabled={importing}
                    onChange={(e) => {
                      if (e.target.value) handleImportTemplate(e.target.value);
                      e.target.value = '';
                    }}
                    className="text-sm border rounded-lg px-3 py-1.5 bg-white"
                  >
                    <option value="">Import preset…</option>
                    {templates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name} ({t.count})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                    Share
                  </button>
                  <select
                    value={lotFilter}
                    onChange={(e) => setLotFilter(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-1.5"
                  >
                    <option value="all">All lot sizes</option>
                    <option value="eq1">Lot = 1 (cash)</option>
                    <option value="gt1">Lot &gt; 1 (contracts)</option>
                  </select>
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-1.5"
                  >
                    <option value="all">All</option>
                    <option value="gainers">Gainers</option>
                    <option value="losers">Losers</option>
                    <option value="active">Most active</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border rounded-lg px-3 py-1.5"
                  >
                    <option value="default">Custom order</option>
                    <option value="alpha">A–Z</option>
                    <option value="change">% change</option>
                    <option value="price">Price</option>
                    <option value="lotSize">Lot size</option>
                    <option value="volume">Volume</option>
                  </select>
                </div>
              </div>

              {shareUrl && (
                <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-600 flex items-center gap-2 break-all">
                  <span className="flex-1">{shareUrl}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="shrink-0 p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 mb-6">
                <WatchlistSymbolSearch
                  onSelect={(sym) => {
                    setAddSymbol(sym);
                    handleAddSymbolFromSearch(sym);
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSymbol}
                  disabled={!addSymbol.trim()}
                  className="px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {sortedSymbols.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {sortBy === 'default' && <th className="w-20" />}
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Symbol</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Lot</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Volume</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Change</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSymbols.map((sym, idx) => {
                        const q = getPriceData(sym);
                        const realIndex = selectedWatchlist.symbols.indexOf(sym);
                        return (
                          <Fragment key={sym}>
                            <tr
                              className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${dragIndex === realIndex ? 'opacity-50' : ''}`}
                              onClick={() => setPopupSymbol(sym)}
                              draggable={canDragReorder}
                              onDragStart={() => canDragReorder && setDragIndex(realIndex)}
                              onDragEnd={() => setDragIndex(null)}
                              onDragOver={(e) => canDragReorder && e.preventDefault()}
                              onDrop={() => canDragReorder && dragIndex != null && handleDragDrop(dragIndex, realIndex)}
                            >
                            {sortBy === 'default' && (
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-0.5">
                                  {canDragReorder && (
                                    <span className="cursor-grab text-gray-400 active:cursor-grabbing" title="Drag to reorder">
                                      <GripVertical className="w-4 h-4" />
                                    </span>
                                  )}
                                  <div className="flex flex-col">
                                    <button type="button" onClick={() => moveSymbol(realIndex, -1)} className="p-0.5 text-gray-400 hover:text-gray-700">
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => moveSymbol(realIndex, 1)} className="p-0.5 text-gray-400 hover:text-gray-700">
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="py-3 px-4">
                              <Link href={`/dashboard/stock/${sym}`} className="font-medium text-gray-800 hover:text-groww-primary flex flex-col">
                                <span>{sym}</span>
                                {q && <span className="text-xs text-gray-500 font-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-40">{q.name || q.companyName || sym}</span>}
                              </Link>
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-gray-600">
                              {q ? (
                                <>
                                  <div className="font-medium text-gray-800">{q.lotSize || 1}</div>
                                  <div className="text-[11px] text-gray-400">1L: ₹{((q.ltp || 0) * (q.lotSize || 1)).toLocaleString('en-IN')}</div>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-gray-500">
                              {q?.volume ? q.volume.toLocaleString('en-IN') : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {q ? `₹${q.ltp?.toLocaleString()}` : '—'}
                            </td>
                            <td className={`py-3 px-4 text-right ${(q?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="inline-flex items-center gap-1">
                                  {(q?.changePercent || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                  {q?.change != null
                                    ? `${q.change >= 0 ? '+' : ''}₹${Math.abs(q.change).toFixed(2)}`
                                    : '—'}
                                </span>
                                <span className="text-xs opacity-90">
                                  {q?.changePercent != null ? `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%` : ''}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveSymbol(sym); }} className="p-1 text-gray-400 hover:text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {popupSymbol === sym ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-3 bg-groww-bg-soft border-b border-groww-border">
                                <WatchlistQuickTrade
                                  symbol={sym}
                                  quote={q}
                                  onClose={() => setPopupSymbol(null)}
                                  onPlaced={() => showToast('Order placed')}
                                />
                              </td>
                            </tr>
                          ) : q && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={7} className="px-4 py-2 border-b border-gray-100">
                                <div className="flex flex-wrap justify-between gap-4 text-xs text-gray-700">
                                  <div className="flex flex-col"><span className="text-gray-400">Bid Rate</span><span className="font-medium">{q.bid || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Ask Rate</span><span className="font-medium">{q.ask || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">LTP</span><span className="font-medium">{q.ltp || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Change %</span><span className="font-medium">{q.changePercent != null ? `${q.changePercent}%` : '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Net Change</span><span className="font-medium">{q.change || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">High</span><span className="font-medium">{q.high || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Low</span><span className="font-medium">{q.low || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Open</span><span className="font-medium">{q.open || '-'}</span></div>
                                  <div className="flex flex-col"><span className="text-gray-400">Close</span><span className="font-medium">{q.close || q.previousClose || '-'}</span></div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No symbols in this watchlist</p>
                  <p className="text-sm text-gray-400">Add symbols or import a preset (Nifty 50, Bank Nifty, etc.)</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Create a watchlist to get started</p>
            </div>
          )}
      </div>
      
      {/* Buy/Sell Popup Modal */}
      {popupSymbol && !sortedSymbols?.includes(popupSymbol) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPopupSymbol(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <WatchlistQuickTrade
              symbol={popupSymbol}
              quote={getPriceData(popupSymbol)}
              onClose={() => setPopupSymbol(null)}
              onPlaced={() => showToast('Order placed')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
