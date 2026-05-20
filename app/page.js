'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { persistLoginSession } from '../lib/authSession';
import { TrendingUp, Shield, BarChart3, ArrowRight, DollarSign, Eye, EyeOff } from 'lucide-react';

function HomeContent() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('session') === 'expired';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const url = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}${url}`, form);
      if (data.requires2FA) {
        router.push(`/verify-2fa?userId=${data.userId}`);
        return;
      }
      if (data.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email || form.email)}`);
        return;
      }
      router.push(persistLoginSession(data));
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Something went wrong';
      setError(errorMessage);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">VirtualTrade</span>
          </div>
          <button
            onClick={() => setShowAuth(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
          >
            Get Started
          </button>
        </header>

        <section className="text-center mb-20">
          <h1 className="text-5xl font-bold text-white mb-6">
            Learn Trading Without Risk
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Practice buying and selling Indian stocks with ₹10 lakhs virtual money.
            Real market data, zero real money involved.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowAuth(true)}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-lg transition flex items-center gap-2"
            >
              Start Trading Free <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: DollarSign, title: '₹10 Lakh Virtual Cash', desc: 'Start with ample virtual money to practice various strategies' },
            { icon: BarChart3, title: 'Real Market Data', desc: 'Live NSE/BSE prices, charts, and market movements' },
            { icon: Shield, title: 'Zero Risk', desc: 'No real money involved. Learn from mistakes safely' }
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
              <item.icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-blue-200">{item.desc}</p>
            </div>
          ))}
        </section>

        {sessionExpired && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-100 text-sm text-center">
            Session expired due to inactivity. Please login again.
          </div>
        )}

        <footer className="text-center text-blue-300 text-sm py-8 border-t border-white/10">
          <p>This is a paper trading simulation for educational purposes only. No real money is involved.</p>
        </footer>
      </div>

      {showAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full p-3 border rounded-lg"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded-lg"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="w-full p-3 border rounded-lg pr-12"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium">
                {isLogin ? 'Login' : 'Register'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 font-medium">
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
            {isLogin && (
              <button onClick={() => router.push('/forgot-password')} className="w-full mt-2 text-blue-500 text-sm">
                Forgot Password?
              </button>
            )}
            <button onClick={() => setShowAuth(false)} className="mt-4 w-full text-gray-500 text-sm">
              Cancel
            </button>
            {!isLogin && (
              <button onClick={() => router.push('/forgot-password')} className="w-full text-blue-500 text-sm">
                Forgot Password?
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />}>
      <HomeContent />
    </Suspense>
  );
}