'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDeviceFingerprint } from '../lib/secureStorage';
import { auth, warmBackend } from '../lib/api';
import { getApiBaseUrl } from '../lib/apiBase';
import { persistLoginSession } from '../lib/authSession';
import { TrendingUp, Shield, BarChart3, ArrowRight, DollarSign, Eye, EyeOff, Sparkles } from 'lucide-react';

function HomeContent() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [authMethod, setAuthMethod] = useState('email');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session') === 'expired';

  useEffect(() => {
    warmBackend();
  }, []);

  const finishAuth = (data) => {
    if (data.requires2FA) {
      router.push(`/verify-2fa?userId=${data.userId}`);
      return true;
    }
    if (data.requiresVerification) {
      router.push(`/verify-email?email=${encodeURIComponent(data.email || form.email)}`);
      return true;
    }
    if (!getApiBaseUrl()) {
      setError('API URL not configured. Set NEXT_PUBLIC_API_URL on Vercel.');
      return true;
    }
    if (!data.accessToken || !data.user) {
      setError('Login failed: server did not return a valid session');
      return true;
    }
    router.push(persistLoginSession(data));
    return true;
  };

  const handleSendOtp = async () => {
    setError('');
    try {
      const purpose = isLogin ? 'mobile_login' : 'mobile_register';
      const { data } = await auth.sendMobileOTP({ phone, purpose });
      setOtpSent(true);
      if (data.devOtp) setDevOtpHint(`Dev OTP: ${data.devOtp}`);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Could not send OTP');
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!otpSent) {
      await handleSendOtp();
      return;
    }
    try {
      let data;
      if (isLogin) {
        ({ data } = await auth.loginWithPhone({ phone, otp }));
      } else {
        ({ data } = await auth.registerWithPhone({
          name: form.name,
          phone,
          password: form.password,
          otp
        }));
      }
      finishAuth(data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Verification failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (authMethod === 'phone') {
      return handlePhoneSubmit(e);
    }
    try {
      const payload = isLogin
        ? { ...form, deviceFingerprint: getDeviceFingerprint(), deviceLabel: 'Web browser' }
        : form;
      const { data } = isLogin
        ? await auth.login(payload)
        : await auth.register(payload);
      if (finishAuth(data)) return;
    } catch (err) {
      const status = err.response?.status;
      const apiUrl = getApiBaseUrl();
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      let errorMessage = serverMsg || 'Something went wrong';

      if (status === 401) {
        errorMessage = serverMsg || 'Invalid email or password';
      } else if (status === 404) {
        errorMessage = `API not found (${apiUrl}). Set Vercel NEXT_PUBLIC_API_URL to https://virtualtradebackend.onrender.com/api and redeploy.`;
      } else if (status === 500) {
        errorMessage = serverMsg
          ? `${serverMsg} (API: ${apiUrl})`
          : `Server error. API: ${apiUrl}. Fix Vercel env NEXT_PUBLIC_API_URL → https://virtualtradebackend.onrender.com/api then redeploy.`;
      } else if (status === 502 || status === 503) {
        errorMessage = 'Backend waking up — wait 30s and try again';
      } else if (!err.response) {
        errorMessage = `Cannot reach API (${apiUrl}). Check network or backend URL on Vercel.`;
      }
      setError(errorMessage);
    }
  };

  return (
    <main className="min-h-screen bg-groww-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-groww-primary-light/80 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-groww-primary shadow-sm">
              <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-groww-ink">VirtualTrade</span>
          </div>
          <button type="button" onClick={() => setShowAuth(true)} className="groww-btn-primary">
            Get started
          </button>
        </header>

        <section className="mb-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-groww-primary-muted bg-groww-surface px-4 py-1.5 text-sm font-medium text-groww-primary shadow-groww">
            <Sparkles className="h-4 w-4" />
            Paper trading · Zero risk
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-groww-ink sm:text-5xl lg:text-6xl">
            Learn investing the smart way
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-groww-muted">
            Practice buying and selling Indian stocks with ₹10 lakh virtual money. Real NSE/BSE data — no real money
            involved.
          </p>
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="groww-btn-primary px-8 py-3.5 text-base"
            >
              Start trading free <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="mb-20 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: DollarSign,
              title: '₹10 Lakh virtual cash',
              desc: 'Enough balance to try CNC, MIS, and different strategies safely.'
            },
            {
              icon: BarChart3,
              title: 'Live market data',
              desc: 'NSE/BSE prices, charts, watchlists, and alerts like a real broker app.'
            },
            {
              icon: Shield,
              title: '100% risk-free',
              desc: 'No bank account needed. Learn from mistakes without losing real money.'
            }
          ].map((item) => (
            <div key={item.title} className="groww-card p-8 text-center transition hover:shadow-groww-lg">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-groww-primary-light">
                <item.icon className="h-7 w-7 text-groww-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-groww-ink">{item.title}</h3>
              <p className="text-sm leading-relaxed text-groww-muted">{item.desc}</p>
            </div>
          ))}
        </section>

        {sessionExpired && (
          <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Session expired due to inactivity. Please sign in again.
          </div>
        )}

        <footer className="space-y-3 border-t border-groww-border py-10 text-center text-sm text-groww-muted">
          <p>This is a paper trading simulation for educational purposes only. No real money is involved.</p>
          <p className="flex flex-wrap justify-center gap-4">
            <a href="/legal" className="groww-link">
              Legal
            </a>
            <a href="/legal/terms" className="groww-link">
              Terms
            </a>
            <a href="/legal/privacy" className="groww-link">
              Privacy
            </a>
            <a href="/legal/disclaimer" className="groww-link">
              Disclaimer
            </a>
          </p>
        </footer>
      </div>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-groww-ink/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-groww-surface p-8 shadow-groww-lg">
            <h2 className="text-2xl font-bold text-groww-ink">{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p className="mt-1 text-sm text-groww-muted">Sign in to continue paper trading</p>

            <div className="mt-5 flex gap-2 rounded-xl bg-groww-bg p-1">
              {['email', 'phone'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAuthMethod(m);
                    setOtpSent(false);
                    setDevOtpHint('');
                    setError('');
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                    authMethod === m ? 'bg-groww-surface text-groww-primary shadow-sm' : 'text-groww-muted'
                  }`}
                >
                  {m === 'email' ? 'Email' : 'Mobile OTP'}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-groww-loss">{error}</div>
            )}
            {devOtpHint && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{devOtpHint}</p>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full name"
                  className="groww-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoComplete="name"
                  required
                />
              )}
              {authMethod === 'email' ? (
                <>
                  <input
                    type="email"
                    placeholder="Email"
                    className="groww-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                    required
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className="groww-input pr-12"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-groww-muted"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    className="groww-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    autoComplete="tel"
                    required
                  />
                  {otpSent && (
                    <input
                      type="text"
                      placeholder="6-digit OTP"
                      className="groww-input text-center tracking-widest"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                    />
                  )}
                  {!isLogin && (
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className="groww-input"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      autoComplete="new-password"
                      required
                    />
                  )}
                </>
              )}
              <button type="submit" className="groww-btn-primary w-full py-3">
                {authMethod === 'phone' ? (otpSent ? 'Verify & continue' : 'Send OTP') : isLogin ? 'Sign in' : 'Register'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-groww-muted">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="groww-link font-semibold">
                {isLogin ? 'Register' : 'Sign in'}
              </button>
            </p>
            {isLogin && (
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="mt-2 w-full text-sm groww-link"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="mt-4 w-full text-sm text-groww-muted hover:text-groww-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-groww-bg">
          <div className="groww-spinner" />
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
