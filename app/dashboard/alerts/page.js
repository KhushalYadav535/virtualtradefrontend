'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, BellRing, History } from 'lucide-react';
import { alerts as alertsApi, market } from '../../../lib/api';
import StockBrowsePanel from '../../../components/StockBrowsePanel';

const CONDITION_LABELS = {
  above: 'Price goes above',
  below: 'Price goes below',
  pct_up: 'Rises by %',
  pct_down: 'Falls by %',
  volume_above: 'Volume above',
  lot_value_above: 'Lot value above (₹)'
};

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [quote, setQuote] = useState(null);
  const [conditionType, setConditionType] = useState('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [targetPct, setTargetPct] = useState('5');
  const [minVolume, setMinVolume] = useState('1000000');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        alertsApi.getAll(),
        alertsApi.getHistory()
      ]);
      setAlerts(activeRes.data);
      setHistory(histRes.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected?.symbol) return;
    market.getQuote(selected.symbol, selected.exchange || 'NSE')
      .then(({ data }) => {
        setQuote(data);
        if (data?.ltp && !targetPrice) setTargetPrice(String(data.ltp));
      })
      .catch(() => setQuote(null));
  }, [selected?.symbol, selected?.exchange]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selected?.symbol) {
      setError('Select a stock');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const symbol = String(selected.symbol || '')
        .trim()
        .toUpperCase()
        .split(/[\s,]+/)[0]
        .replace(/[^A-Z0-9.-]/g, '')
        .slice(0, 20);
      if (!symbol) {
        setError('Select a valid stock symbol');
        setSubmitting(false);
        return;
      }
      const payload = {
        symbol,
        exchange: selected.exchange || 'NSE',
        conditionType
      };
      if (conditionType === 'above' || conditionType === 'below' || conditionType === 'lot_value_above') {
        payload.targetPrice = parseFloat(targetPrice);
      } else if (conditionType === 'volume_above') {
        payload.minVolume = parseInt(minVolume, 10);
      } else {
        payload.targetPct = parseFloat(targetPct);
      }
      await alertsApi.create(payload);
      setShowForm(false);
      setSelected(null);
      setTargetPrice('');
      await load();
    } catch (err) {
      const details = err.response?.data?.details;
      setError(
        details?.[0]?.message ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Could not create alert'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await alertsApi.delete(id);
      await load();
    } catch {
      setError('Delete failed');
    }
  };

  const list = activeTab === 'active' ? alerts : history;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-groww-ink">Price alerts</h1>
          <p className="text-groww-muted">Get notified when price crosses your target (checked every 30s)</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-groww-primary px-4 py-2 text-sm font-medium text-white hover:bg-groww-primary-dark"
        >
          <Plus className="h-4 w-4" />
          New alert
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="grid gap-6 rounded-xl border border-groww-border bg-groww-surface p-6 lg:grid-cols-2">
          <StockBrowsePanel
            selectedSymbol={selected?.symbol}
            selectedExchange={selected?.exchange}
            onSelect={setSelected}
          />
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-groww-ink">Symbol</p>
              <p className="text-lg font-bold">{selected?.symbol || '—'}</p>
              {quote?.ltp != null && (
                <p className="text-sm text-groww-muted">LTP ₹{Number(quote.ltp).toLocaleString('en-IN')}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-groww-muted">Condition</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                className="groww-input mt-1 px-3 py-2"
              >
                {Object.entries(CONDITION_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            {conditionType === 'volume_above' ? (
              <div>
                <label className="text-sm text-groww-muted">Minimum volume</label>
                <input
                  type="number"
                  required
                  value={minVolume}
                  onChange={(e) => setMinVolume(e.target.value)}
                  className="groww-input mt-1 px-3 py-2"
                />
              </div>
            ) : (conditionType === 'above' || conditionType === 'below' || conditionType === 'lot_value_above') ? (
              <div>
                <label className="text-sm text-groww-muted">
                  {conditionType === 'lot_value_above' ? 'Min lot value (₹)' : 'Target price (₹)'}
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="groww-input mt-1 px-3 py-2"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm text-groww-muted">Change %</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  value={targetPct}
                  onChange={(e) => setTargetPct(e.target.value)}
                  className="groww-input mt-1 px-3 py-2"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="groww-btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create alert'}
            </button>
          </form>
        </div>
      )}

      <div className="flex gap-2 border-b border-groww-border">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'active' ? 'border-groww-primary text-groww-primary' : 'border-transparent text-groww-muted'
          }`}
        >
          <BellRing className="h-4 w-4" />
          Active ({alerts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === 'history' ? 'border-groww-primary text-groww-primary' : 'border-transparent text-groww-muted'
          }`}
        >
          <History className="h-4 w-4" />
          Triggered ({history.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-groww-border bg-groww-surface p-12 text-center text-groww-muted">
          {activeTab === 'active' ? 'No active alerts' : 'No triggered alerts yet'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-groww-border bg-groww-surface p-4">
              <div>
                <p className="font-bold text-groww-ink">{a.symbol}</p>
                <p className="text-sm text-groww-muted">
                  {CONDITION_LABELS[a.condition_type]}
                  {a.target_price != null && ` ₹${Number(a.target_price).toLocaleString('en-IN')}`}
                  {a.target_pct != null && ` ${a.target_pct}%`}
                  {a.baseline_price != null && a.condition_type.startsWith('pct') && (
                    <span className="text-gray-400"> · from ₹{Number(a.baseline_price).toLocaleString('en-IN')}</span>
                  )}
                </p>
                {a.status === 'triggered' && a.triggered_price != null && (
                  <p className="text-xs text-green-600 mt-1">
                    Triggered @ ₹{Number(a.triggered_price).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
              {activeTab === 'active' && (
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
