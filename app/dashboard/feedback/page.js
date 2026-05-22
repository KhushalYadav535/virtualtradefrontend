'use client';

import { useState } from 'react';
import { Loader2, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { feedback } from '../../../lib/api';

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'bug', label: 'Bug Report' },
  { id: 'feature', label: 'Feature Request' },
  { id: 'trading', label: 'Trading Issue' },
  { id: 'ui', label: 'UI/UX Feedback' }
];

export default function FeedbackPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    setError('');
    try {
      await feedback.submit({ subject, message, category });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Could not submit');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Thank you!</h2>
        <p className="text-gray-500 mt-2">Your feedback has been submitted. We review every response.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-groww-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Send Feedback</h1>
          <p className="text-sm text-gray-500">Help us improve the platform</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${category === c.id ? 'bg-groww-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Brief summary..." value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-32 resize-none" placeholder="Describe your feedback, suggestion, or issue..." value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={5000} />
        </div>

        <button type="submit" disabled={saving || !subject.trim() || !message.trim()} className="w-full flex items-center justify-center gap-2 bg-groww-primary text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {saving ? 'Submitting...' : 'Send Feedback'}
        </button>
      </form>
    </div>
  );
}
