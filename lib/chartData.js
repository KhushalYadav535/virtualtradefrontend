const isValidNum = (v) => typeof v === 'number' && Number.isFinite(v);

const normalizeTime = (time) => {
  if (time == null) return null;
  if (typeof time === 'number' && Number.isFinite(time)) {
    return Math.floor(time);
  }
  if (typeof time === 'string') {
    const parsed = Date.parse(time);
    if (Number.isFinite(parsed)) return Math.floor(parsed / 1000);
  }
  if (typeof time === 'object' && time.year && time.month && time.day) {
    return null;
  }
  return null;
};

export const sanitizeCandles = (rows) => {
  if (!Array.isArray(rows)) return [];

  const byTime = new Map();

  for (const row of rows) {
    const time = normalizeTime(row?.time);
    if (time == null) continue;

    let open = Number(row?.open);
    let high = Number(row?.high);
    let low = Number(row?.low);
    let close = Number(row?.close);

    if (!isValidNum(close)) continue;
    if (!isValidNum(open)) open = close;
    if (!isValidNum(high)) high = Math.max(open, close);
    if (!isValidNum(low)) low = Math.min(open, close);

    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    if (!isValidNum(open) || !isValidNum(high) || !isValidNum(low) || !isValidNum(close)) {
      continue;
    }

    byTime.set(time, {
      time,
      open,
      high,
      low,
      close,
      volume: isValidNum(Number(row?.volume)) ? Number(row.volume) : 0
    });
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};

export const sanitizeVolume = (candles) =>
  candles.map((d) => ({
    time: d.time,
    value: isValidNum(d.volume) ? d.volume : 0,
    color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
  }));

export const sanitizeLinePoints = (rows) => {
  if (!Array.isArray(rows)) return [];

  const byTime = new Map();
  for (const row of rows) {
    const time = normalizeTime(row?.time);
    const value = Number(row?.value ?? row?.close);
    if (time == null || !isValidNum(value)) continue;
    byTime.set(time, { time, value });
  }

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};

export const sanitizeLine = (rows) => sanitizeLinePoints(rows);

export const sanitizeHeikinAshi = (rows) => {
  const candles = sanitizeCandles(rows);
  if (candles.length === 0) return [];

  const haCandles = [];
  
  // First candle
  const first = candles[0];
  let prevHaOpen = (first.open + first.close) / 2;
  let prevHaClose = (first.open + first.high + first.low + first.close) / 4;
  
  haCandles.push({
    time: first.time,
    open: prevHaOpen,
    high: Math.max(first.high, prevHaOpen, prevHaClose),
    low: Math.min(first.low, prevHaOpen, prevHaClose),
    close: prevHaClose,
    volume: first.volume
  });

  // Remaining candles
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    haCandles.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume
    });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  return haCandles;
};
