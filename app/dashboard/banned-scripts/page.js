'use client';
import { ShieldAlert } from 'lucide-react';

export default function BannedScriptsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-groww-ink">Banned / Blocked Scripts</h1>
        <p className="text-groww-muted">List of stocks currently under F&amp;O ban period</p>
      </div>
      
      <div className="bg-white rounded-xl border border-groww-border p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800">No Banned Scripts</h3>
        <p className="text-gray-500 mt-2">There are currently no scripts in the F&amp;O ban list. All regular scripts are available for trading.</p>
      </div>
    </div>
  );
}
