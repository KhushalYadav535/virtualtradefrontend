'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { market, leaderboard as leaderboardApi, trading, activity } from '../../lib/api';
import { useAuthStore, usePortfolioStore, useMarketStore } from '../../lib/store';
import { loadCachedPortfolioSummary } from '../../lib/portfolioCache';
import { isStaffRole } from '../../lib/roles';
import MarketCountdown from '../../components/MarketCountdown';
import {
  TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUp, ArrowDown, Clock,
  ListOrdered, Star, Activity, Layers, ChevronRight, Briefcase, Trophy
} from 'lucide-react';

const quickActions = [
  { href: '/dashboard/trade?side=BUY', label: 'Buy', icon: TrendingUp, tint: 'bg-emerald-50 text-emerald-600' },
  { href: '/dashboard/trade?side=SELL', label: 'Sell', icon: TrendingDown, tint: 'bg-red-50 text-red-600' },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: Star, tint: 'bg-sky-50 text-sky-600' },
  { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered, tint: 'bg-amber-50 text-amber-600' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const indices = useMarketStore((s) => s.indices);
  const [topLeaderboard, setTopLeaderboard] = useState([]);
  const [marketStatus, setMarketStatus] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const { summary, setSummary } = usePortfolioStore();
  const { user, authReady } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authReady) return;
    if (isStaffRole(user?.role)) {
      router.replace('/dashboard/admin');
    }
  }, [authReady, user?.role, router]);

  const setStoreIndices = useMarketStore((s) => s.setIndices);

  const refreshIndices = useCallback(async () => {
    try {
      const { data } = await market.getIndices();
      setStoreIndices(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [setStoreIndices]);

  useEffect(() => {
    if (!authReady || isStaffRole(user?.role)) return;
    loadData();
    const marketInterval = setInterval(loadMarketStatus, 60000);
    const indicesInterval = setInterval(refreshIndices, 60000);

    return () => {
      clearInterval(marketInterval);
      clearInterval(indicesInterval);
    };
  }, [authReady, user?.role, refreshIndices, setStoreIndices]);

  const loadMarketStatus = async () => {
    try {
      const { data } = await market.getStatus();
      setMarketStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    const cached = loadCachedPortfolioSummary();
    if (cached) setSummary(cached);
    setLoading(false);

    Promise.all([
      market.getIndices(),
      leaderboardApi.get({ limit: 5 }),
      trading.getOrders(5).catch(() => ({ data: [] })),
      activity.getFeed(12).catch(() => ({ data: [] }))
    ])
      .then(([indicesRes, leaderboardRes, ordersRes, activityRes]) => {
        setStoreIndices(indicesRes.data || []);
        setTopLeaderboard((leaderboardRes.data || []).slice(0, 5));
        setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        setActivityFeed(Array.isArray(activityRes?.data) ? activityRes.data : []);
      })
      .catch(() => {});

    loadMarketStatus();
  };

  if (!authReady || isStaffRole(user?.role) || (loading && !summary)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="groww-spinner" />
      </div>
    );
  }

  const totalValue = summary?.totalValue ?? 0;
  const returns = summary?.totalReturns ?? 0;
  const returnsPct = summary?.totalReturnsPercent ?? 0;
  const dayPnL = summary?.dayReturns ?? summary?.dayPnL ?? 0;
  const dayPnLPct = summary?.dayReturnsPercent ?? 0;

  const investedValue = summary?.investedValue ?? Math.max(0, (summary?.holdingsValue || 0) - (summary?.totalReturns || 0));

  const marketLabel = marketStatus?.preOpen
    ? 'Pre-open'
    : marketStatus?.isOpen
      ? 'Market open'
      : 'Market closed';

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      {/* Hero portfolio */}
      <section className="groww-hero p-6 sm:p-8">
        <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Portfolio value</p>
              <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-[44px] sm:leading-[1.05]">
                ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 backdrop-blur-sm font-semibold tabular-nums ${
                  returns >= 0 ? 'bg-white/15 text-white' : 'bg-red-500/20 text-red-50'
                }`}>
                  {returns >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  ₹{Math.abs(returns).toLocaleString('en-IN')}
                  <span className="opacity-90">({returnsPct >= 0 ? '+' : ''}{Number(returnsPct).toFixed(2)}%)</span>
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-white/60">all time</span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 backdrop-blur-md ring-1 ring-white/20 self-start">
              <span className={`h-2 w-2 rounded-full ${marketStatus?.isOpen ? 'bg-emerald-300 animate-pulse-slow' : marketStatus?.preOpen ? 'bg-amber-300' : 'bg-red-300'}`} />
              <span className="text-xs font-semibold">{marketLabel}</span>
              {marketStatus && (
                <MarketCountdown
                  isOpen={marketStatus.isOpen}
                  nextOpen={marketStatus.nextOpen}
                  nextClose={marketStatus.nextClose}
                />
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Today&apos;s P&L</p>
              <p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${dayPnL >= 0 ? 'text-white' : 'text-red-100'}`}>
                {dayPnL >= 0 ? '+' : ''}₹{Math.abs(dayPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white/80 tabular-nums">
                {dayPnLPct >= 0 ? '+' : ''}{Number(dayPnLPct).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Invested</p>
              <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">
                ₹{Number(investedValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-0.5 text-xs text-white/70">across holdings</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Available cash</p>
              <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">
                ₹{Number(summary?.cashBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-0.5 text-xs text-white/70">ready to trade</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Holdings value</p>
              <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">
                ₹{Number(summary?.holdingsValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-0.5 text-xs text-white/70">current value</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="groww-card group flex items-center gap-3 p-4 hover:-translate-y-0.5 hover:border-groww-primary-muted hover:shadow-groww-md"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${action.tint}`}>
              <action.icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-groww-ink">{action.label}</span>
              <span className="text-[11px] text-groww-muted">Tap to open</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Indices strip */}
      {indices.length > 0 && (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-none">
          {indices.map((idx, i) => {
            const up = (idx.changePercent ?? 0) >= 0;
            return (
              <div key={i} className="groww-index-pill">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${up ? 'bg-groww-profit-soft text-groww-profit' : 'bg-groww-loss-soft text-groww-loss'}`}>
                  {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-groww-muted truncate">{idx.symbol}</p>
                  <p className="text-base font-bold text-groww-ink tabular-nums">
                    {Number(idx.ltp || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs font-semibold tabular-nums ${up ? 'text-profit' : 'text-loss'}`}>
                    {up ? '+' : ''}{Number(idx.change ?? 0).toFixed(2)}
                    <span className="opacity-80"> ({up ? '+' : ''}{Number(idx.changePercent ?? 0).toFixed(2)}%)</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Cash balance', value: summary?.cashBalance, icon: Wallet, tint: 'bg-groww-primary-light text-groww-primary' },
          { label: 'Current Value', value: summary?.holdingsValue, icon: BarChart3, tint: 'bg-emerald-50 text-emerald-600' },
          { label: 'Invested', value: investedValue, icon: TrendingUp, tint: 'bg-violet-50 text-violet-600' },
          { label: 'MIS P&L', value: summary?.positionsPnl, icon: Layers, tint: 'bg-amber-50 text-amber-600', signed: true },
        ].map((stat) => (
          <div key={stat.label} className="groww-stat-card">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tint}`}>
                <stat.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="text-sm font-medium text-groww-muted">{stat.label}</span>
            </div>
            <p
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                stat.signed && stat.value < 0 ? 'text-loss' : stat.signed && stat.value > 0 ? 'text-profit' : 'text-groww-ink'
              }`}
            >
              {stat.signed && stat.value > 0 ? '+' : ''}₹{Number(stat.value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="groww-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="groww-section-title">MIS positions</h2>
            <Link href="/dashboard/positions" className="groww-link flex items-center gap-0.5">
              All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {(summary?.intradayPositions?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {summary.intradayPositions.slice(0, 4).map((p) => (
                <div
                  key={p.symbol}
                  className="flex items-center justify-between rounded-xl bg-groww-bg-soft px-3.5 py-3 text-sm transition hover:bg-groww-primary-soft"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-groww-surface text-xs font-bold text-groww-primary border border-groww-border">
                      {p.symbol?.charAt(0)}
                    </span>
                    <span className="font-semibold text-groww-ink">{p.symbol}</span>
                  </div>
                  <span className={`tabular-nums font-semibold ${p.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {(p.pnl >= 0 ? '+' : '')}₹{Number(p.pnl || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-groww-bg">
                <Activity className="h-5 w-5 text-groww-muted" />
              </div>
              <p className="text-sm text-groww-muted">No open intraday positions</p>
            </div>
          )}
        </div>

        <div className="groww-card p-5 lg:col-span-1">
          <h2 className="groww-section-title mb-4">Portfolio Analytics</h2>
          {(summary?.holdings?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {summary.holdings
                .slice()
                .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
                .slice(0, 3)
                .map((h, i) => {
                  const total = summary.holdingsValue || 1;
                  const pct = ((h.currentValue || 0) / total) * 100;
                  const colors = ['bg-groww-primary', 'bg-emerald-500', 'bg-amber-500'];
                  return (
                    <div key={i}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-bold text-groww-ink">{h.symbol}</span>
                        <span className="text-groww-muted tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-groww-border/60">
                        <div
                          className={`h-full rounded-full ${colors[i]} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              <Link href="/dashboard/portfolio" className="groww-link mt-2 block text-center">
                View Full Breakdown →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-groww-bg">
                <BarChart3 className="h-5 w-5 text-groww-muted" />
              </div>
              <p className="text-sm text-groww-muted">No analytics available</p>
            </div>
          )}
        </div>

        <div className="groww-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="groww-section-title">Top holdings</h2>
            <Link href="/dashboard/portfolio" className="groww-link">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {summary?.holdings?.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-groww-bg-soft px-3.5 py-3 transition hover:bg-groww-primary-soft">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-groww-surface text-xs font-bold text-groww-primary border border-groww-border">
                    {h.symbol?.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-groww-ink truncate">{h.symbol}</p>
                    <p className="text-[11px] text-groww-muted tabular-nums">
                      {h.qty} @ ₹{h.avgBuyPrice?.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-groww-ink tabular-nums">
                    ₹{h.currentValue?.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-[11px] font-semibold tabular-nums ${h.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {(!summary?.holdings || summary.holdings.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-groww-bg">
                  <Briefcase className="h-5 w-5 text-groww-muted" />
                </div>
                <p className="text-sm text-groww-muted">No holdings yet</p>
                <Link href="/dashboard/trade" className="groww-link mt-2">Start trading →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="groww-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="groww-section-title">Leaderboard</h2>
            </div>
            <button type="button" onClick={() => router.push('/dashboard/leaderboard')} className="groww-link">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {topLeaderboard.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-groww-bg-soft px-3.5 py-3 transition hover:bg-groww-primary-soft">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm'
                        : i === 1
                          ? 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-700'
                          : i === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                            : 'bg-groww-bg text-groww-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-groww-ink truncate">{u.name}</span>
                </div>
                <p className={`text-sm font-bold tabular-nums ${u.totalReturns >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {u.totalReturns >= 0 ? '+' : ''}₹{u.totalReturns?.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activityFeed.length > 0 && (
          <div className="groww-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-groww-primary" />
                <h2 className="groww-section-title">Recent activity</h2>
              </div>
              <Link href="/dashboard/notifications" className="groww-link">
                View all
              </Link>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {activityFeed.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl bg-groww-bg px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-groww-ink">{item.title}</p>
                    <p className="truncate text-groww-muted">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-groww-muted">
                    {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div className="groww-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="groww-section-title">Recent orders</h2>
              <Link href="/dashboard/orders" className="groww-link">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-groww-bg px-3 py-2.5 text-sm">
                  <div>
                    <span className={`font-bold ${o.order_type === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                      {o.order_type}
                    </span>
                    <span className="ml-2 font-medium text-groww-ink">{o.symbol}</span>
                    <span className="ml-2 text-groww-muted">× {o.qty}</span>
                  </div>
                  <span className="capitalize text-groww-muted">{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-groww-primary-muted bg-groww-primary-light/50 px-4 py-3 text-sm text-groww-ink">
        <strong className="font-semibold text-groww-primary">Note:</strong> Paper trading for education only.{' '}
        <Link href="/legal/disclaimer" className="groww-link">
          Read disclaimer
        </Link>
      </div>
    </div>
  );
}
