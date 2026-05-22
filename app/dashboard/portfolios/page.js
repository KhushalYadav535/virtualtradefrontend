'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Check, Loader2, FolderKanban, AlertCircle } from 'lucide-react';
import { portfoliosMgmt } from '../../../lib/api';
import { usePortfolioMgmtStore } from '../../../lib/store';

export default function PortfoliosPage() {
  const { portfolios, activePortfolioId, setPortfolios, setActivePortfolioId } = usePortfolioMgmtStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCapital, setNewCapital] = useState('100000');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [comparisons, setComparisons] = useState([]);

  const fetchPortfolios = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await portfoliosMgmt.list();
      setPortfolios(data.portfolios || []);
      if (data.activeId) setActivePortfolioId(data.activeId);
      portfoliosMgmt.compare().then(({ data: cmp }) => setComparisons(cmp.comparisons || [])).catch(() => {});
    } catch (e) {
      setError('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPortfolios(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await portfoliosMgmt.create({ name: newName.trim(), description: newDesc.trim(), startingCapital: parseFloat(newCapital) || 100000 });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewCapital('100000');
      await fetchPortfolios();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create portfolio');
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await portfoliosMgmt.activate(id);
      setActivePortfolioId(id);
      await fetchPortfolios();
    } catch (e) {
      setError('Failed to switch portfolio');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this portfolio? Holdings and trades will be orphaned.')) return;
    try {
      await portfoliosMgmt.delete(id);
      if (activePortfolioId === id) setActivePortfolioId(null);
      await fetchPortfolios();
    } catch (e) {
      setError('Failed to delete portfolio');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await portfoliosMgmt.update(id, { name: editName, description: editDesc });
      setEditId(null);
      await fetchPortfolios();
    } catch (e) {
      setError('Failed to update portfolio');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolios</h1>
          <p className="text-sm text-gray-500 mt-1">Manage multiple portfolios with different strategies</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-groww-primary text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Portfolio
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {comparisons.length > 1 && (
        <div className="bg-white border rounded-xl p-4 overflow-x-auto">
          <h2 className="font-semibold text-gray-800 mb-3">Compare portfolios</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th>
                <th className="pb-2">Return %</th>
                <th className="pb-2">Est. value</th>
                <th className="pb-2">Realized P&amp;L</th>
                <th className="pb-2">Holdings</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.id} className={`border-b ${c.active ? 'bg-green-50' : ''}`}>
                  <td className="py-2 font-medium">{c.name}{c.active ? ' ✓' : ''}</td>
                  <td className={c.returnPct >= 0 ? 'text-green-600' : 'text-red-600'}>{c.returnPct}%</td>
                  <td>₹{c.estimatedValue?.toLocaleString('en-IN')}</td>
                  <td>₹{c.realizedPnl?.toLocaleString('en-IN')}</td>
                  <td>{c.holdingsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No portfolios yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first portfolio to start organizing your trades</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {portfolios.map((p) => (
            <div
              key={p.id}
              className={`bg-white border rounded-xl p-5 transition cursor-pointer ${
                activePortfolioId === p.id ? 'ring-2 ring-groww-primary border-groww-primary' : 'hover:border-gray-300'
              }`}
              onClick={() => handleActivate(p.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FolderKanban className={`w-5 h-5 ${activePortfolioId === p.id ? 'text-groww-primary' : 'text-gray-400'}`} />
                  <div>
                    {editId === p.id ? (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <input className="border rounded px-2 py-1 text-sm w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <input className="border rounded px-2 py-1 text-sm w-full" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" />
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdate(p.id)} className="text-xs px-2 py-1 bg-groww-primary text-white rounded">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 border rounded">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          Capital: ₹{Number(p.starting_capital).toLocaleString('en-IN')}
                          {p.estimated_value != null && ` · Est. value: ₹${Number(p.estimated_value).toLocaleString('en-IN')}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                {editId !== p.id && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {activePortfolioId === p.id && <Check className="w-4 h-4 text-green-600" />}
                    <button
                      onClick={() => { setEditId(p.id); setEditName(p.name); setEditDesc(p.description || ''); }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Portfolio</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Long-term Strategy" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Description</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Starting Capital (₹)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={newCapital} onChange={(e) => setNewCapital(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 py-2 bg-groww-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
