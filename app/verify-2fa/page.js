'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../lib/api';
import { persistLoginSession } from '../../lib/authSession';
import { Shield, Loader2 } from 'lucide-react';

function Verify2FAContent() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (!userId) {
      router.push('/');
    }
  }, [userId, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await auth.verify2FA({ userId, token: code });
      router.push(persistLoginSession(data));
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-groww-primary-light via-white to-groww-bg flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center w-16 h-16 bg-groww-primary-light rounded-full mx-auto mb-6">
          <Shield className="w-8 h-8 text-groww-primary" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Two-Factor Authentication</h1>
        <p className="text-center text-gray-500 mb-8">
          Enter the 6-digit code from your authenticator app
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-3xl tracking-widest p-4 border rounded-xl focus:ring-2 focus:ring-groww-primary"
              maxLength={6}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-groww-primary text-white rounded-xl font-medium hover:bg-groww-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Verify
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have access to your authenticator?
          <button onClick={() => router.push('/')} className="text-groww-primary font-medium ml-1">
            Go back
          </button>
        </p>
      </div>
    </main>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-groww-primary-light via-white to-groww-bg" />}>
      <Verify2FAContent />
    </Suspense>
  );
}