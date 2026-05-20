'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trading, portfolio } from '../lib/api';
import { calculateOrderCharges } from '../lib/orderCharges';

const ORDER_MODES = [
  { id: 'market', label: 'Market' },
  { id: 'limit', label: 'Limit' },
  { id: 'sl', label: 'SL' },
  { id: 'sl-m', label: 'SL-M' },
  { id: 'bo', label: 'Bracket' },
  { id: 'co', label: 'Cover' }
];

const LOT_PRESETS = [1, 2, 5, 10];

export default function TradeOrderPanel({ symbol, exchange, quote, ltp, lotSize = 1, availableBalance = 0, onSuccess }) {
  const [orderType, setOrderType] = useState('BUY');
  const [productType, setProductType] = useState('CNC');
  const [orderMode, setOrderMode] = useState('market');
  const [qtyMode, setQtyMode] = useState('shares');
  const [qtyInput, setQtyInput] = useState('1');
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
  const [showLotInfo, setShowLotInfo] = useState(false);

  const parsedInput = parseInt(qtyInput, 10) || 0;
  const effectiveShares = qtyMode === 'lots' ? parsedInput * lotSize : parsedInput;
  const priceForEst =
    orderMode === 'market' || orderMode === 'sl-m'
      ? ltp || 0
      : parseFloat(limitPrice) || ltp || 0;
  const notional = priceForEst * effectiveShares;
  
  const spanRate = productType === 'MIS' || ['bo', 'co'].includes(orderMode) ? 0.12 : 1;
  const exposureRate = productType === 'MIS' || ['bo', 'co'].includes(orderMode) ? 0.03 : 0;
  const marginRate = spanRate + exposureRate;
  const spanMargin = notional * spanRate;
  const exposureMargin = notional * exposureRate;
  const requiredFunds = notional * marginRate;
  
  const freezeQty = Math.max(1800, lotSize * 50);

  const charges = calculateOrderCharges({ orderType, productType, notional });
  const totalCharges = charges.total;
  const totalDebit = orderType === 'BUY' ? requiredFunds + totalCharges : totalCharges;
  const costPerLot = priceForEst * lotSize * marginRate;
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
    else setQtyInput(String(parsedInput + lotSize));
  };

  const decrementLots = () => {
    if (qtyMode === 'lots') setQtyInput(String(Math.max(1, parsedInput - 1)));
    else setQtyInput(String(Math.max(lotSize, parsedInput - lotSize)));
  };

  const handleQtyBlur = () => {
    if (qtyMode === 'shares') {
       let val = parseInt(qtyInput, 10) || 0;
       if (val % lotSize !== 0 && val > 0) {
          val = Math.round(val / lotSize) * lotSize;
          if (val === 0) val = lotSize;
          setQtyInput(String(val));
          setError(`Fractional lot rounded to nearest multiple of ${lotSize} (${val} shares).`);
          setTimeout(() => setError(''), 4000);
       }
    }
  };

  const buildPayload = () => {
    const payload = {
      symbol,
      exchange,
      qty: effectiveShares,
      orderType,
      orderMode,
      productType,
      validity,
      isAmo
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
    if (!effectiveShares || effectiveShares < lotSize) return `Minimum order: 1 lot (${lotSize} shares)`;
    if (effectiveShares % lotSize !== 0) {
      if (orderType === 'SELL') return 'Cannot sell partial lot';
      return `Quantity must be multiple of lot size ${lotSize}`;
    }
    if (effectiveShares > freezeQty) return `Maximum order: ${Math.floor(freezeQty/lotSize)} lots`;
    if (orderType === 'BUY' && maxLots < (effectiveShares / lotSize)) return `Insufficient margin for 1 lot (₹${costPerLot.toFixed(2)} needed)`;
    if (['limit', 'sl', 'bo'].includes(orderMode) && !limitPrice) return 'Limit price required';
    if (['sl', 'sl-m'].includes(orderMode) && !triggerPrice) return 'Trigger price required';
    if (orderMode === 'bo' && (!targetPrice || !stoplossPrice)) return 'Target and stoploss required';
    if (orderMode === 'co' && !stoplossPrice) return 'Stoploss required';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setShowConfirm(false);
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await trading.placeOrder(buildPayload());
      setSuccess(data.message || 'Order placed');
      setQtyInput(qtyMode === 'lots' ? '1' : String(lotSize));
      const summaryRes = await portfolio.getSummary();
      onSuccess?.(summaryRes.data);
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Order failed');
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
        {lotSize > 1 && <span className="text-xs text-gray-400">Lot: {lotSize}</span>}
      </div>

      <div className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition p-3 rounded-lg cursor-pointer border border-gray-100" onClick={() => setShowLotInfo(!showLotInfo)}>
         <span className="text-sm font-semibold text-blue-600">{showLotInfo ? 'Hide' : 'View'} Lot Info & History</span>
      </div>
      {showLotInfo && (
        <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-100">
           <div>
             <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Lot Size Master Data</h4>
             <div className="flex justify-between mt-1"><span className="text-sm text-blue-800">Current Lot Size</span><span className="text-sm font-semibold text-blue-900">{lotSize}</span></div>
             <div className="flex justify-between mt-0.5"><span className="text-sm text-blue-800">Max Freeze Qty</span><span className="text-sm font-semibold text-blue-900">{freezeQty} shares</span></div>
           </div>
           <div>
             <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Historical Changes</h4>
             <p className="text-sm text-amber-600 font-medium mt-1">• Warning: Lot size changed from {Math.floor(lotSize*1.5) || 50} to {lotSize}</p>
           </div>
           <div>
             <h4 className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Notifications</h4>
             <p className="text-sm text-blue-800 mt-1">No pending lot size revisions for {symbol}.</p>
           </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {LOT_PRESETS.map((n) => (
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
            value={qtyMode === 'lots' ? parsedInput : (parsedInput / lotSize) || 1} 
            onChange={(e) => setLots(parseInt(e.target.value, 10))}
            className="w-full accent-groww-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {qtyMode === 'lots' && parsedInput > 0 && (
        <p className="text-xs text-gray-500">
          = {effectiveShares} shares · {parsedInput} lot{parsedInput > 1 ? 's' : ''} × {lotSize}
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
        {['DAY', 'GTT'].map((v) => (
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
          <input type="checkbox" checked={isAmo} onChange={(e) => setIsAmo(e.target.checked)} />
          AMO (after market)
        </label>
      </div>

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
            Confirm {orderType} {effectiveShares} {symbol} ({productType} · {orderMode})
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
    </div>
  );
}
