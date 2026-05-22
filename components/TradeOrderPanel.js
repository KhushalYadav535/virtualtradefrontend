'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trading, portfolio, market, offline as offlineApi } from '../lib/api';
import { useAuthStore, usePortfolioMgmtStore, usePortfolioStore } from '../lib/store';
import { calculateOrderCharges } from '../lib/orderCharges';
import { getTradingPrefsFromUser } from '../lib/tradingPrefs';
import { playOrderSuccess, playOrderError } from '../lib/sounds';
import {
  getEffectiveLotSize,
  getFreezeQtyShares,
  snapQuantityToLot,
  validateOrderQuantity
} from '../lib/lotUtils';

const ORDER_MODES = [
  { id: 'market', label: 'Market' },
  { id: 'limit', label: 'Limit' },
  { id: 'sl', label: 'SL' },
  { id: 'sl-m', label: 'SL-M' },
  { id: 'bo', label: 'Bracket' },
  { id: 'co', label: 'Cover' }
];

export default function TradeOrderPanel({
  symbol,
  exchange,
  quote,
  ltp,
  lotSize: lotSizeProp = 1,
  availableBalance = 0,
  onSuccess,
  initialOrderType = 'BUY',
  initialProductType = 'CNC',
  initialOrderMode = null
}) {
  const { user } = useAuthStore();
  const { activePortfolioId } = usePortfolioMgmtStore();
  const summary = usePortfolioStore((s) => s.summary);
  const prefs = getTradingPrefsFromUser(user);
  const lotPresets = prefs.lotQuickButtons?.length ? prefs.lotQuickButtons : [1, 2, 5, 10];

  const [orderType, setOrderType] = useState(initialOrderType === 'SELL' ? 'SELL' : 'BUY');

  useEffect(() => {
    if (initialOrderType === 'BUY' || initialOrderType === 'SELL') {
      setOrderType(initialOrderType);
    }
  }, [initialOrderType, symbol]);
  const [productType, setProductType] = useState(
    ['CNC', 'MIS', 'NRML'].includes(initialProductType) ? initialProductType : prefs.defaultProductType
  );
  useEffect(() => {
    if (['CNC', 'MIS', 'NRML'].includes(initialProductType)) {
      setProductType(initialProductType);
    }
  }, [initialProductType, symbol]);
  const [orderMode, setOrderMode] = useState(
    initialOrderMode || (prefs.defaultOrderType === 'LIMIT' ? 'limit' : 'market')
  );
  const [qtyMode, setQtyMode] = useState(prefs.qtyInputMode === 'shares' ? 'shares' : 'lots');
  const [qtyInput, setQtyInput] = useState(String(prefs.defaultQty || 1));
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stoplossPrice, setStoplossPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [validity, setValidity] = useState('DAY');
  const [isAmo, setIsAmo] = useState(false);
  const [disclosedQty, setDisclosedQty] = useState('');
  const [marketStatus, setMarketStatus] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(prefs.showLotSizeEverywhere);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [hedgeInfo, setHedgeInfo] = useState(null);
  const [spreadInfo, setSpreadInfo] = useState(null);
  const [lotWarnings, setLotWarnings] = useState([]);
  const [orderPinRequired, setOrderPinRequired] = useState(false);
  const [orderPinInput, setOrderPinInput] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    setQtyMode(prefs.qtyInputMode === 'shares' ? 'shares' : 'lots');
    setQtyInput(String(prefs.defaultQty || 1));
    if (!initialOrderMode) {
      setOrderMode(prefs.defaultOrderType === 'LIMIT' ? 'limit' : 'market');
    }
    if (prefs.showLotSizeEverywhere) setShowLotInfo(true);
  }, [symbol, prefs.qtyInputMode, prefs.defaultQty, prefs.defaultOrderType, prefs.showLotSizeEverywhere]);

  useEffect(() => {
    market.getStatus().then(({ data }) => setMarketStatus(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (marketStatus && !marketStatus.isOpen) setIsAmo(true);
  }, [marketStatus?.isOpen]);

  useEffect(() => {
    if (validity === 'GTT' && orderMode !== 'limit') setOrderMode('limit');
  }, [validity]);

  useEffect(() => {
    if (!symbol || !orderType) { setHedgeInfo(null); setSpreadInfo(null); return; }
    trading.getHedgeBenefit({ symbol, orderType }).then(({ data }) => setHedgeInfo(data)).catch(() => setHedgeInfo(null));
    trading.getSpreadMargin({ symbol, orderType, productType }).then(({ data }) => setSpreadInfo(data)).catch(() => setSpreadInfo(null));
  }, [symbol, orderType, productType]);

  useEffect(() => {
    import('../lib/api').then(({ authSecurity }) => {
      authSecurity.getOrderPinStatus().then(({ data }) => setOrderPinRequired(!!data?.required)).catch(() => {});
    });
  }, []);

  const effectiveLotSize = getEffectiveLotSize(quote, productType) || lotSizeProp;
  const freezeQty = getFreezeQtyShares(quote, productType);

  useEffect(() => {
    if (productType === 'CNC' && qtyMode === 'lots' && effectiveLotSize === 1) {
      setQtyInput(String(Math.max(1, parseInt(qtyInput, 10) || 1)));
    }
  }, [productType]);

  const parsedInput = parseInt(qtyInput, 10) || 0;
  const effectiveShares = qtyMode === 'lots' ? parsedInput * effectiveLotSize : parsedInput;
  const priceForEst =
    orderMode === 'market' || orderMode === 'sl-m'
      ? ltp || 0
      : parseFloat(limitPrice) || ltp || 0;
  const notional = priceForEst * effectiveShares;

  useEffect(() => {
    if (!symbol || effectiveShares < 1) { setLotWarnings([]); return; }
    trading.getLotPreview({
      symbol,
      productType,
      qty: effectiveShares,
      orderType,
      price: priceForEst || undefined
    }).then(({ data }) => setLotWarnings(data?.warnings || [])).catch(() => setLotWarnings([]));
  }, [symbol, effectiveShares, productType, orderType, priceForEst]);

  const spanRate = productType === 'MIS' || ['bo', 'co'].includes(orderMode) ? 0.12 : 1;
  const exposureRate = productType === 'MIS' || ['bo', 'co'].includes(orderMode) ? 0.03 : 0;
  const marginRate = spanRate + exposureRate;
  const spanMargin = notional * spanRate;
  const exposureMargin = notional * exposureRate;
  const requiredFunds = notional * marginRate;
  
  const charges = calculateOrderCharges({ orderType, productType, notional });
  const totalCharges = charges.total;
  const totalDebit = orderType === 'BUY' ? requiredFunds + totalCharges : totalCharges;
  const limitPx = parseFloat(limitPrice) || 0;
  const estPnlPerShare =
    orderMode === 'limit' && limitPx > 0 && ltp
      ? orderType === 'BUY'
        ? ltp - limitPx
        : limitPx - ltp
      : null;
  const estOrderPnl =
    estPnlPerShare != null ? parseFloat((estPnlPerShare * effectiveShares).toFixed(2)) : null;
  const costPerLot = priceForEst * effectiveLotSize * marginRate;
  const maxLots =
    orderType === 'BUY' && costPerLot > 0
      ? Math.max(0, Math.floor((availableBalance - totalCharges) / costPerLot))
      : 0;

  const setLots = (lots) => {
    setQtyMode('lots');
    setQtyInput(String(Math.max(1, lots)));
  };

  const incrementLots = () => {
    if (qtyMode === 'lots') setQtyInput(String(parsedInput + 1));
    else setQtyInput(String(parsedInput + effectiveLotSize));
  };

  const decrementLots = () => {
    if (qtyMode === 'lots') setQtyInput(String(Math.max(1, parsedInput - 1)));
    else setQtyInput(String(Math.max(effectiveLotSize, parsedInput - effectiveLotSize)));
  };

  const handleQtyBlur = () => {
    if (qtyMode === 'shares') {
      const val = parseInt(qtyInput, 10) || 0;
      if (val > 0 && val % effectiveLotSize !== 0) {
        const { qty, adjusted, message } = snapQuantityToLot(val, effectiveLotSize, orderType, prefs.lotRounding);
        if (adjusted) {
          setQtyInput(String(qty));
          setError(message);
          setTimeout(() => setError(''), 4000);
        }
      }
    }
  };

  const buildPayload = (pin) => {
    const payload = {
      symbol,
      exchange,
      qty: effectiveShares,
      orderType,
      orderMode,
      productType,
      validity,
      isAmo: isAmo || (marketStatus && !marketStatus.isOpen),
      disclosedQty: disclosedQty ? parseInt(disclosedQty, 10) : undefined,
      portfolioId: activePortfolioId || undefined,
      orderPin: pin || undefined
    };
    if (['limit', 'sl', 'bo'].includes(orderMode) && limitPrice) {
      payload.price = parseFloat(limitPrice);
    }
    if (['sl', 'sl-m'].includes(orderMode) && triggerPrice) {
      payload.triggerPrice = parseFloat(triggerPrice);
    }
    if (orderMode === 'bo') {
      payload.targetPrice = parseFloat(targetPrice);
      payload.stoplossPrice = parseFloat(stoplossPrice);
    }
    if (orderMode === 'co' && stoplossPrice) {
      payload.stoplossPrice = parseFloat(stoplossPrice);
    }
    return payload;
  };

  const validate = () => {
    const lotErr = validateOrderQuantity(effectiveShares, quote, productType, orderType);
    if (!lotErr.valid) return lotErr.message;
    if (effectiveShares > freezeQty) {
      return `Maximum order: ${Math.floor(freezeQty / effectiveLotSize)} lots`;
    }
    if (orderType === 'BUY' && maxLots < effectiveShares / effectiveLotSize) {
      return `Insufficient margin for 1 lot (₹${costPerLot.toFixed(2)} needed)`;
    }
    if (['limit', 'sl', 'bo'].includes(orderMode) && !limitPrice) return 'Limit price required';
    if (['sl', 'sl-m'].includes(orderMode) && !triggerPrice) return 'Trigger price required';
    if (orderMode === 'bo' && (!targetPrice || !stoplossPrice)) return 'Target and stoploss required';
    if (orderMode === 'co' && !stoplossPrice) return 'Stoploss required';
    if (validity === 'GTT' && orderMode !== 'limit') return 'GTT requires limit order mode';
    if (marketStatus && !marketStatus.isOpen && orderMode === 'market' && !isAmo) {
      return 'Market is closed — enable AMO or use limit/GTT';
    }
    const dq = disclosedQty ? parseInt(disclosedQty, 10) : null;
    if (dq != null && (dq <= 0 || dq > effectiveShares)) {
      return 'Disclosed qty must be between 1 and order quantity';
    }
    return null;
  };

  const handleSubmit = async (pinOverride) => {
    const err = validate();
    if (err) {
      setError(err);
      playOrderError(prefs.soundEffects);
      return;
    }
    if (orderPinRequired && !pinOverride) {
      setPendingSubmit(true);
      return;
    }
    setShowConfirm(false);
    setPendingSubmit(false);
    setSubmitting(true);
    setError('');
    setSuccess('');
    setOfflineQueued(false);
    try {
      const { data } = await trading.placeOrder(buildPayload(pinOverride || orderPinInput));
      setOrderPinInput('');
      setSuccess(data.message || 'Order placed');
      setQtyInput(qtyMode === 'lots' ? '1' : String(effectiveLotSize));
      const summaryRes = await portfolio.getSummary();
      onSuccess?.(summaryRes.data);
    } catch (e) {
      const isNetworkError = !e.response && e.message !== 'Canceled';
      if (isNetworkError) {
        try {
          const payload = buildPayload();
          const queuedOrders = [{
            symbol: payload.symbol,
            exchange: payload.exchange,
            qty: payload.qty,
            order_type: payload.orderType,
            order_mode: payload.orderMode,
            price: payload.price,
            product_type: payload.productType,
            trigger_price: payload.triggerPrice
          }];
          const { data: queueData } = await offlineApi.queue(queuedOrders);
          setOfflineQueued(true);
          setSuccess(`${queueData.queued} order(s) queued offline — will sync when connected`);
        } catch (queueErr) {
          setError('Failed to place order and could not queue offline.');
        }
      } else {
        setError(e.response?.data?.error || e.response?.data?.message || 'Order failed');
        playOrderError(prefs.soundEffects);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

      <div className="flex gap-2">
        {['BUY', 'SELL'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm ${
              orderType === t
                ? t === 'BUY'
                  ? 'bg-groww-primary text-white shadow-sm'
                  : 'bg-groww-loss text-white shadow-sm'
                : 'bg-groww-bg text-groww-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'CNC', label: 'Delivery (CNC)' },
          { id: 'MIS', label: 'Intraday (MIS)' },
          { id: 'NRML', label: 'NRML' }
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setProductType(p.id);
              if (p.id === 'CNC') setOrderMode('market');
            }}
            className={`flex-1 min-w-[90px] py-2 rounded-lg text-sm font-medium ${
              productType === p.id ? 'bg-groww-ink text-white' : 'bg-groww-bg text-groww-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ORDER_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setOrderMode(m.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              orderMode === m.id ? 'bg-groww-primary text-white' : 'bg-groww-bg text-groww-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-600">Qty in</span>
        {['lots', 'shares'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setQtyMode(m)}
            className={`px-3 py-1 rounded text-sm ${
              qtyMode === m ? 'bg-groww-ink text-white' : 'bg-groww-bg text-groww-muted'
            }`}
          >
            {m}
          </button>
        ))}
        <span className="text-xs text-gray-400">
          Lot: {effectiveLotSize}
          {productType === 'CNC' ? ' (CNC · per share)' : ` (${productType})`}
        </span>
      </div>

      <div className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition p-3 rounded-lg cursor-pointer border border-gray-100" onClick={() => setShowLotInfo(!showLotInfo)}>
         <span className="text-sm font-semibold text-blue-600">{showLotInfo ? 'Hide' : 'View'} Lot Info & History</span>
      </div>
      {showLotInfo && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-100">
           <div>
             <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Lot Size Master Data</h4>
             <div className="flex justify-between mt-1"><span className="text-sm text-blue-800">Lot ({productType})</span><span className="text-sm font-semibold text-blue-900">{effectiveLotSize}</span></div>
             <div className="flex justify-between mt-0.5"><span className="text-sm text-blue-800">F&O lot (exchange)</span><span className="text-sm font-semibold text-blue-900">{quote?.lotSize ?? lotSizeProp}</span></div>
             <div className="flex justify-between mt-0.5"><span className="text-sm text-blue-800">Max Freeze Qty</span><span className="text-sm font-semibold text-blue-900">{freezeQty} shares</span></div>
           </div>
           <p className="text-sm text-blue-800 mt-2">
             CNC delivery uses 1 share per lot. MIS/NRML use exchange lot size {quote?.lotSize ?? lotSizeProp}.
             Freeze max {Math.floor(freezeQty / effectiveLotSize)} lots per order.
           </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {lotPresets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setLots(n)}
            className="rounded-lg bg-groww-bg px-3 py-1.5 text-xs font-medium text-groww-ink hover:bg-groww-primary-light"
          >
            {n} Lot{n > 1 ? 's' : ''}
          </button>
        ))}
        {maxLots > 0 && (
          <button
            type="button"
            onClick={() => setLots(maxLots)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-800 border border-amber-200"
          >
            Max ({maxLots})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={decrementLots} className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-lg">
          -
        </button>
        <input
          type="number"
          min="1"
          value={qtyInput}
          onBlur={handleQtyBlur}
          onChange={(e) => setQtyInput(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-center outline-none focus:border-groww-primary focus:ring-1 focus:ring-groww-primary"
          placeholder={qtyMode === 'lots' ? 'Lots' : 'Shares'}
        />
        <button type="button" onClick={incrementLots} className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-lg">
          +
        </button>
      </div>

      {maxLots > 0 && (
        <div className="px-1 mt-2">
          <input 
            type="range" 
            min="1" 
            max={maxLots || 1} 
            value={qtyMode === 'lots' ? parsedInput : (parsedInput / effectiveLotSize) || 1} 
            onChange={(e) => setLots(parseInt(e.target.value, 10))}
            className="w-full accent-groww-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {parsedInput > 0 && (
        <p className="text-xs text-gray-500">
          {qtyMode === 'lots'
            ? `${parsedInput} lot${parsedInput > 1 ? 's' : ''} (${effectiveShares} shares × ${effectiveLotSize})`
            : `${effectiveShares} shares (${(effectiveShares / effectiveLotSize).toFixed(2)} lots)`}
          {effectiveLotSize > 1 && ` · Lot value ₹${(priceForEst * effectiveLotSize).toLocaleString('en-IN')}`}
        </p>
      )}
      {orderType === 'BUY' && availableBalance > 0 && (
        <p className="text-xs text-gray-500">
          Available ₹{Number(availableBalance).toLocaleString('en-IN')}
          {maxLots > 0 && ` · up to ${maxLots} lot(s)`}
        </p>
      )}

      {['limit', 'sl', 'bo'].includes(orderMode) && (
        <div>
          <label className="text-sm text-gray-600">Limit price (₹)</label>
          <input
            type="number"
            step="0.05"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mt-1"
          />
        </div>
      )}

      {['sl', 'sl-m'].includes(orderMode) && (
        <div>
          <label className="text-sm text-gray-600">Trigger price (₹)</label>
          <input
            type="number"
            step="0.05"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mt-1"
          />
        </div>
      )}

      {orderMode === 'bo' && (
        <>
          <div>
            <label className="text-sm text-gray-600">Target (₹)</label>
            <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Stoploss (₹)</label>
            <input type="number" value={stoplossPrice} onChange={(e) => setStoplossPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" />
          </div>
        </>
      )}

      {orderMode === 'co' && (
        <div>
          <label className="text-sm text-gray-600">Stoploss (₹)</label>
          <input type="number" value={stoplossPrice} onChange={(e) => setStoplossPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg mt-1" />
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm text-gray-600">Validity</span>
        {['DAY', 'IOC', 'GTT'].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValidity(v)}
            className={`px-3 py-1 rounded text-xs font-medium ${
              validity === v ? 'bg-groww-primary text-white' : 'bg-groww-bg text-groww-muted'
            }`}
          >
            {v}
          </button>
        ))}
        <label className="flex items-center gap-2 text-xs text-gray-600 ml-auto">
          <input
            type="checkbox"
            checked={isAmo || (marketStatus && !marketStatus.isOpen)}
            disabled={marketStatus && !marketStatus.isOpen}
            onChange={(e) => setIsAmo(e.target.checked)}
          />
          AMO {marketStatus && !marketStatus.isOpen ? '(auto)' : ''}
        </label>
      </div>

      {marketStatus && (
        <p
          className={`text-xs px-2 py-1 rounded ${
            marketStatus.isOpen ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {marketStatus.message}
          {validity === 'GTT' && ' · GTT stays active until price triggers'}
          {validity === 'IOC' && ' · IOC cancels unfilled qty in ~90s'}
        </p>
      )}

      <div>
        <label className="text-sm text-gray-600">Disclosed quantity (optional)</label>
        <input
          type="number"
          min="1"
          max={effectiveShares || undefined}
          value={disclosedQty}
          onChange={(e) => setDisclosedQty(e.target.value)}
          placeholder={`Max ${effectiveShares || '—'} shares`}
          className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
        />
      </div>

      {estOrderPnl != null && (
        <p
          className={`text-sm font-medium ${estOrderPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}
        >
          Est. P&amp;L if limit fills now: {estOrderPnl >= 0 ? '+' : ''}₹
          {estOrderPnl.toLocaleString('en-IN')} ({estPnlPerShare >= 0 ? '+' : ''}
          {estPnlPerShare?.toFixed(2)}/share)
        </p>
      )}

      {quote?.upperCircuit && (
        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
          Circuit: ₹{quote.lowerCircuit} – ₹{quote.upperCircuit}
        </p>
      )}

      <div className="space-y-1 rounded-xl bg-groww-bg p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Est. notional</span>
          <span>₹{notional.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">SPAN Margin</span>
          <span className="font-medium text-gray-700">₹{spanMargin.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-gray-500">Exposure Margin</span>
          <span className="font-medium text-gray-700">₹{exposureMargin.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-1">
          <span className="text-gray-500">{productType === 'MIS' ? 'Total Margin (~15%)' : 'Required'}</span>
          <span>₹{requiredFunds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        {hedgeInfo?.hasHedge && (
          <div className="flex justify-between text-green-700 bg-green-50 -mx-3 px-3 py-1.5 rounded">
            <span className="font-medium">Hedge benefit ({(hedgeInfo.benefitPct || 0)}% saved)</span>
            <span className="font-semibold">₹{(requiredFunds * (1 - (hedgeInfo.hedgeRate || 0.07) / (hedgeInfo.normalRate || 0.15))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        )}
        {spreadInfo?.hasSpread && (
          <div className="flex justify-between text-blue-700 bg-blue-50 -mx-3 px-3 py-1.5 rounded">
            <span className="font-medium">Spread margin benefit ({spreadInfo.spreadBenefitPct}%)</span>
            <span className="font-semibold">Rate {(spreadInfo.spreadMarginRate * 100).toFixed(0)}% vs {(spreadInfo.normalMarginRate * 100).toFixed(0)}%</span>
          </div>
        )}
        {lotWarnings.length > 0 && (
          <div className="text-amber-800 bg-amber-50 -mx-3 px-3 py-2 rounded text-xs space-y-1">
            {lotWarnings.map((w, i) => (
              <p key={i}>⚠ {w}</p>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-500 pt-1 mt-1 border-t border-gray-200 space-y-0.5">
          <div className="flex justify-between"><span>Brokerage</span><span>₹{charges.brokerage}</span></div>
          <div className="flex justify-between"><span>STT</span><span>₹{charges.stt}</span></div>
          <div className="flex justify-between"><span>Exchange</span><span>₹{charges.exchangeCharges}</span></div>
          <div className="flex justify-between"><span>SEBI</span><span>₹{charges.sebi}</span></div>
          <div className="flex justify-between"><span>Stamp duty</span><span>₹{charges.stampDuty}</span></div>
          <div className="flex justify-between"><span>GST</span><span>₹{charges.gst}</span></div>
          <div className="flex justify-between font-medium text-gray-700"><span>Total charges</span><span>₹{charges.total}</span></div>
        </div>
        {orderType === 'BUY' && (
          <div className="flex justify-between font-medium text-gray-700">
            <span>Total est. debit</span>
            <span>₹{totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {pendingSubmit && (
        <div className="p-4 border border-indigo-200 rounded-xl bg-indigo-50 space-y-2">
          <p className="text-sm font-medium text-indigo-900">Enter 4-digit order PIN</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={orderPinInput}
            onChange={(e) => setOrderPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setPendingSubmit(false); setOrderPinInput(''); }} className="flex-1 py-2 border rounded-lg">Cancel</button>
            <button type="button" disabled={orderPinInput.length !== 4 || submitting} onClick={() => handleSubmit(orderPinInput)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Confirm PIN</button>
          </div>
        </div>
      )}

      {!showConfirm ? (
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const err = validate();
            if (err) setError(err);
            else {
              setError('');
              setShowConfirm(true);
            }
          }}
          className={`w-full py-3 rounded-lg font-semibold text-white disabled:opacity-50 ${
            orderType === 'BUY' ? 'bg-groww-primary hover:bg-groww-primary-dark' : 'bg-groww-loss'
          }`}
        >
          Review order
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-center text-gray-600">
            Confirm {orderType}{' '}
            {effectiveShares / effectiveLotSize} lot(s) = {effectiveShares} shares · {symbol}
            <br />
            <span className="text-xs">
              {productType} · {orderMode} · {validity}
              {isAmo ? ' · AMO' : ''} · ₹{notional.toLocaleString('en-IN')}
            </span>
            {estOrderPnl != null && (
              <span className="text-xs block mt-1">Est. P&amp;L @ limit: ₹{estOrderPnl.toLocaleString('en-IN')}</span>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 py-2 border rounded-lg">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 py-2 rounded-lg text-white font-semibold flex items-center justify-center gap-2 ${
                orderType === 'BUY' ? 'bg-groww-primary hover:bg-groww-primary-dark' : 'bg-groww-loss'
              }`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Summary block below action buttons */}
      {summary && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portfolio Info</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${marketStatus?.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {marketStatus?.isOpen ? 'Market Open' : 'Closed'}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Current Value</span>
              <span className="font-semibold text-gray-800">₹{(summary.totalValue ?? summary.portfolioValue ?? summary.cashBalance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Cash Balance</span>
              <span className="font-medium text-gray-700">₹{(summary.cashBalance ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Today&apos;s P&L</span>
              <span className={`font-medium ${(summary.dayPnL ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summary.dayPnL ?? 0) >= 0 ? '+' : ''}₹{Math.abs(summary.dayPnL ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
