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
  ListOrdered, Star, Activity, Layers, ChevronRight
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
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero portfolio */}
      <div className="groww-hero">
        <p className="text-sm font-medium text-white/80">Current value</p>
        <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          ₹{totalValue.toLocaleString('en-IN')}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-white/70">Total returns</p>
            <p className={`font-semibold ${returns >= 0 ? 'text-white' : 'text-red-100'}`}>
              {returns >= 0 ? '+' : ''}₹{Math.abs(returns).toLocaleString('en-IN')} ({returnsPct?.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-white/70">Today&apos;s P&L</p>
            <p className={`font-semibold ${dayPnL >= 0 ? 'text-white' : 'text-red-100'}`}>
              {dayPnL >= 0 ? '+' : ''}₹{Math.abs(dayPnL).toLocaleString('en-IN')}
              {' '}
              <span className="text-white/90">({dayPnLPct >= 0 ? '+' : ''}{dayPnLPct.toFixed(2)}%)</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{marketLabel}</span>
            {marketStatus && (
              <MarketCountdown
                isOpen={marketStatus.isOpen}
                nextOpen={marketStatus.nextOpen}
                nextClose={marketStatus.nextClose}
              />
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="groww-card flex flex-col items-center gap-2 p-4 transition hover:border-groww-primary-muted hover:shadow-groww-lg"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${action.tint}`}>
              <action.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-groww-ink">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Indices strip */}
      {indices.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {indices.map((idx, i) => (
            <div key={i} className="groww-card min-w-[160px] shrink-0 p-4">
              <p className="text-xs font-medium text-groww-muted">{idx.symbol}</p>
              <p className="mt-1 text-lg font-bold text-groww-ink">
                ₹{idx.ltp?.toLocaleString('en-IN')}
              </p>
              <div
                className={`mt-1 flex flex-col items-end text-sm font-semibold ${
                  idx.changePercent >= 0 ? 'text-profit' : 'text-loss'
                }`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {idx.changePercent >= 0 ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}
                  {idx.change != null
                    ? `${idx.change >= 0 ? '+' : ''}₹${Math.abs(idx.change).toFixed(2)}`
                    : '—'}
                </span>
                <span className="text-xs opacity-90">
                  {idx.changePercent != null ? `${idx.changePercent >= 0 ? '+' : ''}${idx.changePercent.toFixed(2)}%` : ''}
                </span>
              </div>
            </div>
          ))}
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
          <div key={stat.label} className="groww-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tint}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-sm text-groww-muted">{stat.label}</span>
            </div>
            <p
              className={`text-xl font-bold ${
                stat.signed && stat.value < 0 ? 'text-loss' : stat.signed && stat.value > 0 ? 'text-profit' : 'text-groww-ink'
              }`}
            >
              {stat.signed && stat.value > 0 ? '+' : ''}₹{Number(stat.value || 0).toLocaleString('en-IN')}
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
                  className="flex justify-between rounded-xl bg-groww-bg px-3 py-2.5 text-sm"
                >
                  <span className="font-semibold text-groww-ink">{p.symbol}</span>
                  <span className={p.pnl >= 0 ? 'text-profit font-medium' : 'text-loss font-medium'}>
                    {(p.pnl >= 0 ? '+' : '')}₹{Number(p.pnl || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-groww-muted">No open intraday positions</p>
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
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-groww-ink">{h.symbol}</span>
                        <span className="text-groww-muted">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-groww-bg">
                        <div className={`h-full rounded-full ${colors[i]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              <Link href="/dashboard/portfolio" className="groww-link mt-2 block text-center">
                View Full Breakdown
              </Link>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-groww-muted">No analytics available</p>
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
              <div key={i} className="flex justify-between rounded-xl bg-groww-bg px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-groww-ink">{h.symbol}</p>
                  <p className="text-xs text-groww-muted">
                    {h.qty} @ ₹{h.avgBuyPrice?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-groww-ink">
                    ₹{h.currentValue?.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-xs font-medium ${h.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {h.pnl >= 0 ? '+' : ''}₹{h.pnl?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {(!summary?.holdings || summary.holdings.length === 0) && (
              <p className="py-8 text-center text-sm text-groww-muted">No holdings yet</p>
            )}
          </div>
        </div>

        <div className="groww-card p-5 lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="groww-section-title">Leaderboard</h2>
            <button type="button" onClick={() => router.push('/dashboard/leaderboard')} className="groww-link">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {topLeaderboard.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-groww-bg px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0
                        ? 'bg-amber-400 text-white'
                        : i === 1
                          ? 'bg-gray-300 text-groww-ink'
                          : i === 2
                            ? 'bg-amber-600/80 text-white'
                            : 'bg-groww-border text-groww-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-groww-ink">{u.name}</span>
                </div>
                <p className={`text-sm font-semibold ${u.totalReturns >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {u.totalReturns >= 0 ? '+' : ''}₹{u.totalReturns?.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activityFeed.length > 0 && (
        <div className="groww-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-groww-primary" />
            <h2 className="groww-section-title">Recent activity</h2>
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

      <div className="rounded-2xl border border-groww-primary-muted bg-groww-primary-light/50 px-4 py-3 text-sm text-groww-ink">
        <strong className="font-semibold text-groww-primary">Note:</strong> Paper trading for education only.{' '}
        <Link href="/legal/disclaimer" className="groww-link">
          Read disclaimer
        </Link>
      </div>
    </div>
  );
}
