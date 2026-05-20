'use client';

import { useEffect, useState, useMemo } from 'react';
import { watchlist, market } from '../../../lib/api';
import { useMarketStore } from '../../../lib/store';
import { initSocket } from '../../../lib/socket';
import Link from 'next/link';
import {
  Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Pencil,
  Share2, ChevronUp, ChevronDown, Copy, Check
} from 'lucide-react';

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
  const { prices, updatePrice } = useMarketStore();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    loadWatchlists();
    watchlist.getTemplates().then(({ data }) => setTemplates(data || [])).catch(() => {});
    const socket = initSocket();
    socket.on('priceUpdate', (data) => updatePrice(data.quotes));
  }, []);

  useEffect(() => {
    if (selectedWatchlist?.symbols?.length) {
      selectedWatchlist.symbols.forEach((sym) => loadQuote(sym));
    }
  }, [selectedWatchlist?.id, selectedWatchlist?.symbols?.length]);

  const loadWatchlists = async () => {
    try {
      const { data } = await watchlist.getAll();
      setWatchlists(data);
      if (data.length > 0) {
        setSelectedWatchlist((prev) => data.find((w) => w.id === prev?.id) || data[0]);
      } else {
        setSelectedWatchlist(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    const sym = addSymbol.trim().toUpperCase();
    try {
      await watchlist.add(selectedWatchlist.id, sym);
      await loadWatchlists();
      loadQuote(sym);
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

  const moveSymbol = async (index, direction) => {
    if (!selectedWatchlist?.symbols) return;
    const next = [...selectedWatchlist.symbols];
    const j = index + direction;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await watchlist.reorder(selectedWatchlist.id, next);
      setSelectedWatchlist({ ...selectedWatchlist, symbols: next });
      setWatchlists(watchlists.map((w) => (w.id === selectedWatchlist.id ? { ...w, symbols: next } : w)));
    } catch (err) {
      showToast(err.response?.data?.error || 'Reorder failed');
    }
  };

  const sortedSymbols = useMemo(() => {
    let syms = selectedWatchlist?.symbols || [];
    
    if (filterBy === 'gainers') {
      syms = syms.filter(s => (prices[s]?.changePercent || 0) >= 0);
    } else if (filterBy === 'losers') {
      syms = syms.filter(s => (prices[s]?.changePercent || 0) < 0);
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

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Watchlist</h1>
        <p className="text-gray-500">Track stocks, import presets, and share lists</p>
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

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">My Lists</h3>

          <div className="space-y-2 mb-4">
            {watchlists.map((wl) => (
              <div
                key={wl.id}
                className={`flex items-center justify-between p-3 rounded-lg transition ${
                  selectedWatchlist?.id === wl.id ? 'bg-groww-primary-light border border-groww-primary-muted' : 'hover:bg-gray-50'
                }`}
              >
                {renamingId === wl.id ? (
                  <div className="flex flex-1 gap-1 items-center">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameWatchlist(wl.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                    />
                    <button type="button" onClick={() => handleRenameWatchlist(wl.id)} className="text-xs text-groww-primary">
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => setSelectedWatchlist(wl)}>
                      <Star className={`w-4 h-4 ${selectedWatchlist?.id === wl.id ? 'text-groww-primary fill-groww-primary' : 'text-gray-400'}`} />
                      <span className="font-medium">{wl.name} {wl.isDefault || watchlists[0]?.id === wl.id ? <span className="text-xs text-gray-400 font-normal">(Default)</span> : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">{wl.symbols?.length || 0}</span>
                      <button
                        type="button"
                        onClick={() => { setRenamingId(wl.id); setRenameValue(wl.name); }}
                        className="p-1 text-gray-400 hover:text-groww-primary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteWatchlist(wl.id)} className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
            />
            <button
              onClick={handleCreateWatchlist}
              disabled={creating}
              className="p-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
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
                <input
                  type="text"
                  value={addSymbol}
                  onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                  placeholder="Add symbol..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                />
                <button onClick={handleAddSymbol} className="px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-groww-primary-dark">
                  Add
                </button>
              </div>

              {sortedSymbols.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {sortBy === 'default' && <th className="w-16" />}
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
                          <tr key={sym} className="border-b border-gray-100 hover:bg-gray-50">
                            {sortBy === 'default' && (
                              <td className="py-2 px-2">
                                <div className="flex flex-col">
                                  <button type="button" onClick={() => moveSymbol(realIndex, -1)} className="p-0.5 text-gray-400 hover:text-gray-700">
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => moveSymbol(realIndex, 1)} className="p-0.5 text-gray-400 hover:text-gray-700">
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
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
                              <span className="inline-flex items-center gap-1 justify-end">
                                {(q?.changePercent || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                {q?.changePercent != null ? `${q.changePercent.toFixed(2)}%` : '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link href={`/dashboard/trade?symbol=${sym}&exchange=NSE`} className="text-xs font-medium text-groww-primary hover:underline">
                                  Trade
                                </Link>
                                <button type="button" onClick={() => handleRemoveSymbol(sym)} className="p-1 text-gray-400 hover:text-red-500">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
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
      </div>
    </div>
  );
}
