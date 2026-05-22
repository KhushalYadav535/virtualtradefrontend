'use client';

import { HelpCircle } from 'lucide-react';

export default function InfoTooltip({ text, className = '' }) {
  return (
    <span className={`relative inline-flex group align-middle ${className}`}>
      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" aria-label="More info" />
      <span
        role="tooltip"
        className="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity"
      >
        {text}
      </span>
    </span>
  );
}
