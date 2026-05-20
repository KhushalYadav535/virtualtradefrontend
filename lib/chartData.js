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
