'use client';

import { useEffect, useState } from 'react';

function getRemaining(targetIso) {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, done: diff <= 0 };
}

export default function MarketCountdown({ isOpen, nextOpen, nextClose }) {
  const target = isOpen ? nextClose : nextOpen;
  const [remaining, setRemaining] = useState(() => (target ? getRemaining(target) : null));

  useEffect(() => {
    if (!target) return undefined;
    const tick = () => setRemaining(getRemaining(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, isOpen]);

  if (!target || !remaining) return null;

  const label = isOpen ? 'Closes in' : 'Opens in';
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className="text-xs font-mono text-gray-600 tabular-nums">
      {label}{' '}
      {remaining.done ? (
        'soon'
      ) : (
        <>
          {pad(remaining.hours)}:{pad(remaining.minutes)}:{pad(remaining.seconds)}
        </>
      )}
    </span>
  );
}
