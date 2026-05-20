'use client';

import { useEffect, useState } from 'react';
import { watchlist, market } from '../../../lib/api';
import { useMarketStore } from '../../../lib/store';
import { initSocket } from '../../../lib/socket';
import { Star, Plus, Trash2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addSymbol, setAddSymbol] = useState('');
  const { prices, updatePrice } = useMarketStore();

  useEffect(() => {
    loadWatchlists();
    const socket = initSocket();
    socket.on('priceUpdate', (data) => {
      updatePrice(data.quotes);
    });
  }, []);

  useEffect(() => {
    if (selectedWatchlist) {
      selectedWatchlist.symbols.forEach(sym => {
        loadQuote(sym);
      });
    }
  }, [selectedWatchlist]);

  const loadWatchlists = async () => {
    try {
      const { data } = await watchlist.getAll();
      if (data.length > 0) {
        setWatchlists(data);
        setSelectedWatchlist(data[0]);
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
      setWatchlists([...watchlists, data]);
      setSelectedWatchlist(data);
      setNewName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWatchlist = async (id) => {
    try {
      await watchlist.delete(id);
      const updated = watchlists.filter(w => w.id !== id);
      setWatchlists(updated);
      if (selectedWatchlist?.id === id) {
        setSelectedWatchlist(updated[0] || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSymbol = async () => {
    if (!addSymbol.trim() || !selectedWatchlist) return;
    try {
      await watchlist.add(selectedWatchlist.id, addSymbol.trim().toUpperCase());
      const updated = watchlists.map(w =>
        w.id === selectedWatchlist.id
          ? { ...w, symbols: [...w.symbols, addSymbol.trim().toUpperCase()] }
          : w
      );
      setWatchlists(updated);
      setSelectedWatchlist(updated.find(w => w.id === selectedWatchlist.id));
      loadQuote(addSymbol.trim().toUpperCase());
      setAddSymbol('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSymbol = async (symbol) => {
    if (!selectedWatchlist) return;
    try {
      await watchlist.remove(selectedWatchlist.id, symbol);
      const updated = watchlists.map(w =>
        w.id === selectedWatchlist.id
          ? { ...w, symbols: w.symbols.filter(s => s !== symbol) }
          : w
      );
      setWatchlists(updated);
      setSelectedWatchlist(updated.find(w => w.id === selectedWatchlist.id));
    } catch (err) {
      console.error(err);
    }
  };

  const getPriceData = (symbol) => prices[symbol] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Watchlist</h1>
          <p className="text-gray-500">Track your favorite stocks</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">My Lists</h3>

          <div className="space-y-2 mb-4">
            {watchlists.map((wl) => (
              <div
                key={wl.id}
                onClick={() => setSelectedWatchlist(wl)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${
                  selectedWatchlist?.id === wl.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${selectedWatchlist?.id === wl.id ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
                  <span className="font-medium">{wl.name}</span>
                </div>
                <span className="text-sm text-gray-500">{wl.symbols?.length || 0}</span>
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
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedWatchlist ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-500 fill-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-800">{selectedWatchlist.name}</h3>
                </div>
                <button
                  onClick={() => handleDeleteWatchlist(selectedWatchlist.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={addSymbol}
                  onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                  placeholder="Add symbol..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                />
                <button
                  onClick={handleAddSymbol}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>

              {selectedWatchlist.symbols?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Symbol</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Change</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">High</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Low</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWatchlist.symbols.map((sym) => {
                        const q = getPriceData(sym);
                        return (
                          <tr key={sym} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="font-medium text-gray-800">{sym}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {q ? `₹${q.ltp?.toLocaleString()}` : '-'}
                            </td>
                            <td className={`py-3 px-4 text-right flex items-center justify-end gap-1 ${
                              (q?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(q?.changePercent || 0) >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              <span>{q?.changePercent?.toFixed(2)}%</span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {q ? `₹${q.high?.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {q ? `₹${q.low?.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleRemoveSymbol(sym)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                  <p className="text-sm text-gray-400">Add symbols above to track them</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No watchlist selected</p>
              <p className="text-sm text-gray-400">Create or select a watchlist to start tracking stocks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}