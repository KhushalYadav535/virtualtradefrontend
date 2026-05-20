'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../lib/api';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.requestPasswordReset({ email });
      setSuccess('If this email is registered, an OTP has been sent');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword({ email, otp, newPassword });
      setSuccess('Password reset successfully');
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-500" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Reset Password</h1>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

        {step === 'email' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              className="w-full text-center text-2xl tracking-widest p-4 border rounded-xl"
              maxLength={6}
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset Password
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
