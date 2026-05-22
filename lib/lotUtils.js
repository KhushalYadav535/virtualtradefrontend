export const getEffectiveLotSize = (quote, productType = 'CNC') => {
  const pt = String(productType || 'CNC').toUpperCase();
  if (pt === 'CNC') return 1;
  return quote?.lotSizeMis ?? quote?.lotSizeNrml ?? quote?.lotSize ?? 1;
};

export const getFreezeQtyLots = (quote) => quote?.freezeQtyLots ?? 100;

export const getFreezeQtyShares = (quote, productType = 'CNC') => {
  const lotSize = getEffectiveLotSize(quote, productType);
  return getFreezeQtyLots(quote) * lotSize;
};

export const snapQuantityToLot = (qty, lotSize, side = 'BUY', rounding = null) => {
  const n = parseInt(qty, 10) || 0;
  if (n <= 0 || lotSize <= 0) return { qty: lotSize, adjusted: true };
  if (n % lotSize === 0) return { qty: n, adjusted: false };

  let mode = rounding;
  if (!mode || !['up', 'down', 'nearest'].includes(mode)) {
    mode = String(side).toUpperCase() === 'SELL' ? 'down' : 'up';
  }

  const ratio = n / lotSize;
  let lots;
  if (mode === 'down') lots = Math.max(1, Math.floor(ratio));
  else if (mode === 'nearest') lots = Math.max(1, Math.round(ratio));
  else lots = Math.max(1, Math.ceil(ratio));

  const snapped = lots * lotSize;
  return {
    qty: snapped,
    adjusted: true,
    message: `Adjusted to ${snapped} shares (${lots} lot(s) × ${lotSize})`
  };
};

export const validateOrderQuantity = (qty, quote, productType, orderType = 'BUY') => {
  const lotSize = getEffectiveLotSize(quote, productType);
  const freezeLots = getFreezeQtyLots(quote);
  const n = parseInt(qty, 10) || 0;

  if (n < lotSize) {
    return {
      valid: false,
      message: lotSize === 1 ? 'Minimum quantity is 1 share' : `Minimum order: 1 lot (${lotSize} shares)`
    };
  }
  if (n % lotSize !== 0) {
    return {
      valid: false,
      message:
        String(orderType).toUpperCase() === 'SELL'
          ? 'Cannot sell partial lot'
          : `Quantity must be multiple of ${lotSize}`
    };
  }
  if (n / lotSize > freezeLots) {
    return { valid: false, message: `Maximum ${freezeLots} lots allowed` };
  }
  return { valid: true, message: null, lotSize, lots: n / lotSize };
};

export const orderLotSizeForDisplay = (order, quoteFromMarket) => {
  if (order?.product_type === 'CNC') return 1;
  return quoteFromMarket?.lotSize ?? 1;
};
