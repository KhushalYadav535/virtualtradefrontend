'use client';

import { useEffect, useState } from 'react';
import { support } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    support.listTickets().then(({ data }) => setTickets(data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!subject.trim() || body.length < 10) return;
    setSubmitting(true);
    try {
      await support.createTicket({ subject: subject.trim(), body: body.trim() });
      setSubject('');
      setBody('');
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="w-full border rounded-lg px-3 py-2 min-h-[100px]" placeholder="Describe your issue..." value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" disabled={submitting} onClick={submit} className="px-4 py-2 bg-groww-primary text-white rounded-lg font-medium disabled:opacity-50">
          {submitting ? 'Sending...' : 'Submit ticket'}
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id} className="bg-white border rounded-xl p-4">
              <p className="font-semibold">{t.subject}</p>
              <p className="text-sm text-gray-600 mt-1">{t.body}</p>
              <p className="text-xs text-gray-400 mt-2">{t.status} · {new Date(t.created_at).toLocaleString('en-IN')}</p>
              {t.admin_reply && <p className="text-sm text-green-800 mt-2 bg-green-50 p-2 rounded">Reply: {t.admin_reply}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
