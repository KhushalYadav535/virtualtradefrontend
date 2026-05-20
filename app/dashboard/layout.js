'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, usePortfolioStore } from '../../lib/store';
import { getDefaultDashboardPath, isStaffOnlyPath, isStaffRole } from '../../lib/roles';
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, Trophy, Settings,
  LogOut, Menu, X, Wallet, Activity, Clock, Briefcase,
  LineChart, ListOrdered, TrendingDown
} from 'lucide-react';
import { initSocket } from '../../lib/socket';
import { market, auth, portfolio } from '../../lib/api';

const navSections = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/market', label: 'Market', icon: Clock },
    ],
  },
  {
    title: 'Trading',
    items: [
      { href: '/dashboard/trade', label: 'Trade', icon: TrendingUp },
      { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered },
      { href: '/dashboard/charts', label: 'Charts', icon: BarChart3 },
      { href: '/dashboard/watchlist', label: 'Watchlist', icon: Star },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { href: '/dashboard/portfolio', label: 'Holdings', icon: Briefcase },
      { href: '/dashboard/performance', label: 'Performance', icon: LineChart },
      { href: '/dashboard/time-loss', label: 'Time Loss', icon: TrendingDown },
      { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
      { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
];

const staffNavSections = [
  {
    title: 'Management',
    items: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/sessions', label: 'Sessions', icon: Activity },
    ],
  },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, init, setUser, authReady } = useAuthStore();
  const { summary, setSummary } = usePortfolioStore();
  const [authChecked, setAuthChecked] = useState(false);

  const refreshPortfolioSummary = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await portfolio.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    init();
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
      return;
    }

    const syncProfile = async () => {
      try {
        const { data } = await auth.getProfile();
        if (data?.user) setUser(data.user);
      } catch {
        // keep cached user from localStorage
      } finally {
        setAuthChecked(true);
      }
    };
    syncProfile();
  }, [init, router, setUser]);

  useEffect(() => {
    if (!authReady || !authChecked || !user?.role) return;

    if (isStaffRole(user.role)) {
      if (pathname === '/dashboard') {
        router.replace(getDefaultDashboardPath(user.role));
      }
    } else if (isStaffOnlyPath(pathname)) {
      router.replace('/dashboard');
    }
  }, [authReady, authChecked, user?.role, pathname, router]);

  useEffect(() => {
    if (!authReady || !authChecked) return;
    if (!isStaffRole(user?.role)) {
      refreshPortfolioSummary();
    }
  }, [pathname, authReady, authChecked, user?.role]);

  useEffect(() => {
    initSocket();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW registration failed:', err));
    }

    const checkMarketStatus = async () => {
      try {
        const { data } = await market.getStatus();
        setMarketOpen(data.isOpen);
      } catch (err) {
        console.error(err);
      }
    };
    checkMarketStatus();
    const marketInterval = setInterval(checkMarketStatus, 60000);

    let activityPingTimer;
    let logoutTimer;

    const handleInactivityLogout = () => {
      localStorage.clear();
      logout();
      router.push('/?session=expired');
    };

    const resetTimers = () => {
      clearTimeout(activityPingTimer);
      clearTimeout(logoutTimer);

      activityPingTimer = setTimeout(() => {
        const token = localStorage.getItem('token');
        if (token) auth.updateActivity().catch(() => {});
      }, 5 * 60 * 1000);

      logoutTimer = setTimeout(handleInactivityLogout, 30 * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetTimers));
    resetTimers();

    return () => {
      clearInterval(marketInterval);
      clearTimeout(activityPingTimer);
      clearTimeout(logoutTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimers));
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    logout();
    router.push('/');
  };

  const isStaff = isStaffRole(user?.role);
  const homePath = getDefaultDashboardPath(user?.role);
  const visibleNavSections = isStaff ? staffNavSections : navSections;

  const navigateTo = (href) => (e) => {
    e.preventDefault();
    setSidebarOpen(false);
    if (pathname !== href) router.push(href);
  };

  const navLinkClass = (isActive) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
    }`;

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <a
        key={item.href}
        href={item.href}
        onClick={navigateTo(item.href)}
        className={navLinkClass(isActive)}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        <span className="truncate">{item.label}</span>
      </a>
    );
  };

  const cashBalance = summary?.cashBalance ?? 0;
  const portfolioValue = summary?.totalValue ?? summary?.portfolioValue ?? cashBalance;

  if (!authChecked || !authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-700/50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-xl transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-4 py-3.5">
          <a
            href={homePath}
            onClick={navigateTo(homePath)}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-900/40">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-white">VirtualTrade</span>
          </a>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User card */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <div className="rounded-xl border border-slate-600/40 bg-slate-800/80 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-300 ring-1 ring-blue-500/30">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.name || 'User'}</p>
                  <p className="truncate text-xs capitalize text-slate-400">{user?.role || '—'}</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  marketOpen ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {marketOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            {!isStaff && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-600/40 pt-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Cash</p>
                <p className="text-xs font-semibold text-white">
                  ₹{cashBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Portfolio</p>
                <p className="text-xs font-semibold text-white">
                  ₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Nav — scrollable */}
        <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
          {visibleNavSections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-2">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5">{section.items.map(renderNavLink)}</div>
            </div>
          ))}

        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-0.5 border-t border-slate-700/60 bg-slate-900/50 p-3">
          <a
            href="/dashboard/settings"
            onClick={navigateTo('/dashboard/settings')}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700/80 hover:text-white"
          >
            <Settings className="h-[18px] w-[18px] text-slate-400" />
            Settings
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col md:ml-[260px]">
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold capitalize text-slate-800">
              {pathname.replace('/dashboard', '').replace('/', '').replace(/-/g, ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
          <p className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            This is a paper trading simulation for educational purposes only. No real money is involved.
          </p>
        </div>
      </main>
    </div>
  );
}
