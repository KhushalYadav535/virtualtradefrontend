'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { trading } from '../lib/api';
import { useAuthStore, usePortfolioStore, usePortfolioMgmtStore } from '../lib/store';
import { getTradingPrefsFromUser } from '../lib/tradingPrefs';
import { getEffectiveLotSize, snapQuantityToLot } from '../lib/lotUtils';
import { playOrderSuccess, playOrderError } from '../lib/sounds';

const ORDER_MODES = [
  { id: 'market', label: 'Market' },
  { id: 'limit', label: 'Limit' },
  { id: 'sl', label: 'SL' },
  { id: 'sl-m', label: 'SL-M' }
];

const PRODUCTS = [
  { id: 'MIS', label: 'Intraday' },
  { id: 'CNC', label: 'Delivery' },
  { id: 'NRML', label: 'F&O' }
];

const fmt = (n, dp = 2) =>
  n != null && Number.isFinite(Number(n))
    ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '—';

export default function WatchlistQuickTrade({ symbol, quote, onClose, onPlaced }) {
  const { user } = useAuthStore();
  const summary = usePortfolioStore((s) => s.summary);
  const { activePortfolioId } = usePortfolioMgmtStore();
  const prefs = getTradingPrefsFromUser(user);

  const [side, setSide] = useState('BUY');
  const [productType, setProductType] = useState(prefs.defaultProductType || 'MIS');
  const [orderMode, setOrderMode] = useState(prefs.defaultOrderType === 'LIMIT' ? 'limit' : 'market');
  const [lots, setLots] = useState('1');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [trigger, setTrigger] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const lotSize = useMemo(
    () => getEffectiveLotSize(quote || { symbol, lotSize: 1, lotSizeMis: 1, lotSizeNrml: 1 }, productType),
    [quote, symbol, productType]
  );
  const ltp = quote?.ltp ?? 0;

  useEffect(() => {
    const n = parseInt(lots, 10) || 0;
    setQty(String(n * lotSize));
  }, [lots, lotSize]);

  useEffect(() => {
    if (orderMode === 'limit' || orderMode === 'sl') {
      if (!price && ltp) setPrice(String(ltp.toFixed(2)));
    }
  }, [orderMode, ltp, price]);

  const isUp = (quote?.changePercent ?? 0) >= 0;
  const totalQty = parseInt(qty, 10) || 0;
  const refPrice = orderMode === 'market' || orderMode === 'sl-m' ? ltp : parseFloat(price) || 0;
  const orderValue = totalQty * refPrice;

  const cashBalance = summary?.cashBalance ?? 0;
  const requiresPrice = orderMode === 'limit' || orderMode === 'sl';
  const requiresTrigger = orderMode === 'sl' || orderMode === 'sl-m';

  const submit = async () => {
    setError('');
    if (!totalQty || totalQty < lotSize) {
      setError(`Enter at least ${lotSize} shares (1 lot)`);
      return;
    }
    if (totalQty % lotSize !== 0) {
      setError(`Quantity must be a multiple of ${lotSize}`);
      return;
    }
    if (requiresPrice && (!price || parseFloat(price) <= 0)) {
      setError('Enter a valid price');
      return;
    }
    if (requiresTrigger && (!trigger || parseFloat(trigger) <= 0)) {
      setError('Enter a valid trigger price');
      return;
    }

    setSubmitting(true);
    try {
      await trading.placeOrder({
        symbol,
        exchange: quote?.exchange || 'NSE',
        qty: totalQty,
        orderType: side,
        orderMode,
        price: requiresPrice ? parseFloat(price) : undefined,
        triggerPrice: requiresTrigger ? parseFloat(trigger) : undefined,
        productType,
        validity: 'DAY',
        portfolioId: activePortfolioId || undefined
      });
      playOrderSuccess?.();
      onPlaced?.();
      onClose?.();
    } catch (err) {
      playOrderError?.();
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  const sideAccent = side === 'BUY'
    ? 'border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50/70 via-white to-white'
    : 'border-l-4 border-rose-500 bg-gradient-to-br from-rose-50/70 via-white to-white';

  return (
    <div className={`groww-card-elevated overflow-hidden ${sideAccent}`} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-groww-border bg-groww-surface/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
            isUp ? 'bg-groww-profit-soft text-groww-profit' : 'bg-groww-loss-soft text-groww-loss'
          }`}>
            {symbol.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-groww-ink truncate">{symbol}</p>
            <p className="text-[11px] text-groww-muted truncate">
              {quote?.name || quote?.companyName || 'Quick trade'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-groww-muted hover:bg-groww-bg hover:text-groww-ink"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-groww-border sm:grid-cols-9">
        {[
          { label: 'BID', value: fmt(quote?.bid ?? quote?.ltp), tone: 'text-groww-ink' },
          { label: 'ASK', value: fmt(quote?.ask ?? quote?.ltp), tone: 'text-groww-ink' },
          { label: 'LTP', value: fmt(ltp), tone: isUp ? 'text-profit' : 'text-loss', strong: true },
          { label: 'CHG %', value: quote?.changePercent != null ? `${quote.changePercent >= 0 ? '+' : ''}${Number(quote.changePercent).toFixed(2)}%` : '—', tone: isUp ? 'text-profit' : 'text-loss' },
          { label: 'NET CHG', value: quote?.change != null ? `${quote.change >= 0 ? '+' : ''}${Number(quote.change).toFixed(2)}` : '—', tone: isUp ? 'text-profit' : 'text-loss' },
          { label: 'HIGH', value: fmt(quote?.high), tone: 'text-groww-ink' },
          { label: 'LOW', value: fmt(quote?.low), tone: 'text-groww-ink' },
          { label: 'OPEN', value: fmt(quote?.open), tone: 'text-groww-ink' },
          { label: 'CLOSE', value: fmt(quote?.prevClose ?? quote?.close), tone: 'text-groww-ink' }
        ].map((cell) => (
          <div key={cell.label} className="bg-groww-surface px-2.5 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-groww-muted">{cell.label}</p>
            <p className={`mt-0.5 text-xs font-bold tabular-nums ${cell.tone} ${cell.strong ? 'text-sm' : ''}`}>
              {cell.value}
            </p>
          </div>
        ))}
      </div>

      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-4">
          {[
            { id: 'BUY', label: 'BUY', dot: 'bg-emerald-500', text: 'text-emerald-700' },
            { id: 'SELL', label: 'SELL', dot: 'bg-rose-500', text: 'text-rose-700' }
          ].map((opt) => {
            const active = side === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSide(opt.id)}
                className={`flex items-center gap-2 text-sm font-semibold transition ${
                  active ? opt.text : 'text-groww-muted hover:text-groww-ink'
                }`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  active
                    ? `border-current ${opt.text}`
                    : 'border-groww-border-strong'
                }`}>
                  {active && <span className={`h-2 w-2 rounded-full ${opt.dot}`} />}
                </span>
                {opt.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-groww-border bg-groww-surface p-0.5">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductType(p.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                  productType === p.id
                    ? 'bg-groww-primary text-white shadow-groww-xs'
                    : 'text-groww-muted hover:text-groww-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="grid gap-3 md:grid-cols-[140px_1fr_1fr_1fr_auto] md:items-end">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-groww-muted">Order type</label>
            <select
              value={orderMode}
              onChange={(e) => setOrderMode(e.target.value)}
              className="mt-1 groww-input py-2 text-sm"
            >
              {ORDER_MODES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-groww-muted">Lot</label>
            <input
              type="number"
              min={1}
              value={lots}
              onChange={(e) => setLots(e.target.value.replace(/[^0-9]/g, ''))}
              className="mt-1 groww-input py-2 text-sm tabular-nums"
              placeholder="1"
            />
            <p className="mt-1 text-[10px] text-groww-muted">
              1 lot = {lotSize} sh
            </p>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-groww-muted">Qty</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => {
                const n = parseInt(e.target.value || '0', 10);
                setQty(e.target.value);
                if (n && lotSize > 0) setLots(String(Math.max(1, Math.round(n / lotSize))));
              }}
              onBlur={() => {
                const n = parseInt(qty || '0', 10);
                const snapped = snapQuantityToLot(n, lotSize, prefs.lotRounding || 'up');
                if (snapped !== n) setQty(String(snapped));
              }}
              className="mt-1 groww-input py-2 text-sm tabular-nums"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-groww-muted">
              {requiresTrigger ? 'Trigger' : 'Price'}
            </label>
            {requiresTrigger ? (
              <input
                type="number"
                step="0.05"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder={fmt(ltp)}
                className="mt-1 groww-input py-2 text-sm tabular-nums"
              />
            ) : (
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={fmt(ltp)}
                disabled={orderMode === 'market'}
                className="mt-1 groww-input py-2 text-sm tabular-nums disabled:bg-groww-bg disabled:text-groww-muted"
              />
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !totalQty}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-groww-xs transition active:scale-[0.98] disabled:opacity-50 ${
                side === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-groww-border bg-groww-surface px-4 py-2.5 text-sm font-semibold text-groww-ink hover:bg-groww-bg-soft active:scale-[0.98]"
            >
              CANCEL
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-groww-muted">
          <span>
            Approx value:{' '}
            <span className="font-semibold tabular-nums text-groww-ink">
              ₹{orderValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </span>
          <span>
            Available cash:{' '}
            <span className="font-semibold tabular-nums text-groww-ink">
              ₹{Number(cashBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </span>
          {productType === 'MIS' && (
            <span className="font-semibold uppercase tracking-wide text-amber-600">
              Auto square-off applies
            </span>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs font-medium text-loss">{error}</p>
        )}
      </div>
    </div>
  );
}
