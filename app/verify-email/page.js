'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '../../lib/api';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

function VerifyEmailContent() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const router = useRouter();

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError('');
    try {
      await auth.resendOTP({ email, purpose: 'verification' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.verifyEmail({ email, otp });
      setVerified(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h1>
          <p className="text-gray-500 mb-6">Your email has been successfully verified.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-500" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Verify Email</h1>
        <p className="text-center text-gray-500 mb-6">
          Enter the OTP sent to your email
        </p>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-widest p-4 border rounded-xl"
              maxLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Verify Email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full py-2 text-blue-500 text-sm hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}