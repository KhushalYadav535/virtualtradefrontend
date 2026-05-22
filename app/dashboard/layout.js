'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, usePortfolioStore, useMarketStore, usePortfolioMgmtStore } from '../../lib/store';
import { getDefaultDashboardPath, isStaffOnlyPath, isStaffRole } from '../../lib/roles';
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, Trophy, Settings,
  LogOut, Menu, X, Wallet, Activity, Clock, Briefcase,
  LineChart, ListOrdered, TrendingDown, Bell, BellRing, ChevronRight, WifiOff, FolderKanban
} from 'lucide-react';
import { initSocket, disconnectSocket } from '../../lib/socket';
import { clearAuthSession } from '../../lib/authSession';
import { market, auth, portfolio, notifications as notificationsApi, system, offline as offlineApi, portfoliosMgmt } from '../../lib/api';
import ConnectionStatusBar from '../../components/ConnectionStatusBar';
import { useConnectionStore } from '../../lib/connectionStore';
import { hydrateMarketFromCache, saveOfflineSnapshot } from '../../lib/offlineCache';
import { mergeTradingPrefs } from '../../lib/tradingPrefs';
import { navLabel, getLocaleFromUser } from '../../lib/i18n';

const navSections = [
  {
    title: 'Home',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/market', label: 'Market', icon: Clock },
      { href: '/dashboard/sectors', label: 'Sectors', icon: BarChart3 },
    ],
  },
  {
    title: 'Trade',
    items: [
      { href: '/dashboard/trade', label: 'Stocks', icon: TrendingUp },
      { href: '/dashboard/options', label: 'F&O', icon: BarChart3 },
      { href: '/dashboard/futures', label: 'Futures', icon: TrendingUp },
      { href: '/dashboard/baskets', label: 'Baskets', icon: Briefcase },
      { href: '/dashboard/screener', label: 'Screener', icon: Activity },
      { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered },
      { href: '/dashboard/tradebook', label: 'Trade Book', icon: Briefcase },
      { href: '/dashboard/positions', label: 'Positions', icon: Activity },
      { href: '/dashboard/charts', label: 'Charts', icon: BarChart3 },
      { href: '/dashboard/watchlist', label: 'Watchlist', icon: Star },
      { href: '/dashboard/alerts', label: 'Alerts', icon: BellRing },
      { href: '/dashboard/queued', label: 'Queued', icon: WifiOff },
      { href: '/dashboard/portfolios', label: 'Portfolios', icon: FolderKanban },
    ],
  },
  {
    title: 'Wealth',
    items: [
      { href: '/dashboard/portfolio', label: 'Holdings', icon: Briefcase },
      { href: '/dashboard/performance', label: 'Performance', icon: LineChart },
      { href: '/dashboard/time-loss', label: 'Time Loss', icon: TrendingDown },
      { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
      { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
      { href: '/dashboard/achievements', label: 'Achievements', icon: Star },
    ],
  },
];

const staffNavSections = [
  {
    title: 'Admin',
    items: [
      { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/sessions', label: 'Sessions', icon: Activity },
    ],
  },
];

function pageTitle(pathname) {
  const slug = pathname.replace('/dashboard', '').replace(/^\//, '').replace(/-/g, ' ');
  if (!slug) return 'Dashboard';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { user, init, setUser, authReady } = useAuthStore();
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
      } catch (err) {
        const stillHasToken = localStorage.getItem('token');
        if (!stillHasToken) {
          router.replace('/?session=expired');
          return;
        }
        console.warn('Profile sync failed, using cached session:', err?.response?.data?.error || err.message);
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
    if (!authReady || !authChecked || !localStorage.getItem('token')) return;
    portfoliosMgmt.list().then(({ data }) => {
      const p = usePortfolioMgmtStore.getState();
      p.setPortfolios(data.portfolios || []);
      if (data.activeId) p.setActivePortfolioId(data.activeId);
    }).catch(() => {});
  }, [authReady, authChecked]);

  useEffect(() => {
    if (!authReady || !authChecked) return;
    if (!localStorage.getItem('token')) {
      router.replace('/?session=expired');
      return;
    }
    if (!isStaffRole(user?.role)) {
      refreshPortfolioSummary();
      notificationsApi.getUnreadCount()
        .then(({ data }) => setUnreadNotifications(data.count || 0))
        .catch(() => {});
    }
    hydrateMarketFromCache();
    initSocket();
    const prefs = mergeTradingPrefs(
      user?.tradingPrefs || JSON.parse(localStorage.getItem('tradingPrefs') || 'null')
    );
    localStorage.setItem('tradingPrefs', JSON.stringify(prefs));
    useConnectionStore.getState().setLowDataMode(prefs.lowDataMode);
  }, [pathname, authReady, authChecked, user?.role, router]);

  useEffect(() => {
    const onOnline = () => {
      useConnectionStore.getState().setOnline(true);
      initSocket();
      offlineApi.sync().catch(() => {});
    };
    const onOffline = () => {
      useConnectionStore.getState().setOnline(false);
      hydrateMarketFromCache();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    useConnectionStore.getState().setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!authReady || !localStorage.getItem('token')) return undefined;
    const syncSnapshot = () => {
      system
        .getCacheSnapshot()
        .then(({ data }) => {
          saveOfflineSnapshot(data);
          useConnectionStore.getState().setApiReachable(true);
          useConnectionStore.getState().setLastSync(data.cachedAt);
          if (!navigator.onLine) return;
          if (data.indices?.length) useMarketStore.getState().setIndices(data.indices);
          if (data.quotes?.length) useMarketStore.getState().updatePrices(data.quotes);
        })
        .catch(() => useConnectionStore.getState().setApiReachable(false));
    };
    syncSnapshot();
    const id = setInterval(syncSnapshot, 120000);
    return () => clearInterval(id);
  }, [authReady]);

  useEffect(() => {
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
      clearAuthSession();
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
    clearAuthSession();
    router.push('/');
  };

  const isStaff = isStaffRole(user?.role);
  const homePath = getDefaultDashboardPath(user?.role);
  const visibleNavSections = isStaff ? staffNavSections : navSections;
  const locale = getLocaleFromUser(user);

  const navigateTo = (href) => (e) => {
    e.preventDefault();
    setSidebarOpen(false);
    if (pathname !== href) router.push(href);
  };

  const navLinkClass = (isActive) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      isActive
        ? 'bg-groww-primary-light text-groww-primary'
        : 'text-groww-muted hover:bg-groww-bg hover:text-groww-ink'
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
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            isActive ? 'text-groww-primary' : 'text-groww-muted group-hover:text-groww-ink'
          }`}
        />
        <span className="truncate">{navLabel(item.label, locale)}</span>
        {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
      </a>
    );
  };

  const cashBalance = summary?.cashBalance ?? 0;
  const portfolioValue = summary?.totalValue ?? summary?.portfolioValue ?? cashBalance;
  const dayPnL = summary?.dayPnL ?? 0;
  const returnsPct = summary?.totalReturnsPercent ?? 0;

  if (!authChecked || !authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-groww-bg">
        <div className="groww-spinner" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-groww-bg">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[248px] flex-col border-r border-groww-border bg-groww-surface shadow-groww transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-4">
          <a
            href={homePath}
            onClick={navigateTo(homePath)}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-groww-primary shadow-sm">
              <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="truncate text-lg font-bold tracking-tight text-groww-ink">VirtualTrade</span>
          </a>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-groww-muted hover:bg-groww-bg md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isStaff && (
          <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-groww-border bg-groww-bg/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-groww-muted">Portfolio</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  marketOpen ? 'bg-groww-primary-light text-groww-primary' : 'bg-red-50 text-groww-loss'
                }`}
              >
                {marketOpen ? 'Market open' : 'Closed'}
              </span>
            </div>
            <p className="text-lg font-bold text-groww-ink">
              ₹{portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-groww-muted">
                Cash ₹{cashBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className={dayPnL >= 0 ? 'text-profit font-medium' : 'text-loss font-medium'}>
                {dayPnL >= 0 ? '+' : ''}₹{Math.abs(dayPnL).toLocaleString('en-IN', { maximumFractionDigits: 0 })} today
              </span>
            </div>
          </div>
        )}

        <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {visibleNavSections.map((section) => (
            <div key={section.title} className="mb-4 last:mb-2">
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-groww-muted/80">
                {section.title}
              </p>
              <div className="space-y-0.5">{section.items.map(renderNavLink)}</div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-groww-border p-3">
          <a
            href="/dashboard/settings"
            onClick={navigateTo('/dashboard/settings')}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-groww-muted transition hover:bg-groww-bg hover:text-groww-ink"
          >
            <Settings className="h-[18px] w-[18px]" />
            Settings
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-groww-loss transition hover:bg-red-50"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-groww-ink/20 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col md:ml-[248px]">
        <ConnectionStatusBar />
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-4 border-b border-groww-border bg-groww-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-groww-ink hover:bg-groww-bg md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-groww-ink">{pageTitle(pathname)}</h1>
            {!isStaff && summary && (
              <p className="hidden text-xs text-groww-muted sm:block">
                Total returns{' '}
                <span className={returnsPct >= 0 ? 'text-profit' : 'text-loss'}>
                  {returnsPct >= 0 ? '+' : ''}
                  {Number(returnsPct).toFixed(2)}%
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isStaff && (
              <a
                href="/dashboard/notifications"
                onClick={navigateTo('/dashboard/notifications')}
                className="relative rounded-xl p-2.5 text-groww-ink transition hover:bg-groww-bg"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-groww-loss px-1 text-[10px] font-bold text-white">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </a>
            )}
            <div className="hidden h-8 w-px bg-groww-border sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-groww-primary-light text-sm font-bold text-groww-primary">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden text-right sm:block">
                <p className="max-w-[120px] truncate text-sm font-medium text-groww-ink">{user?.name}</p>
                <p className="text-xs capitalize text-groww-muted">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {children}
          <footer className="mt-10 border-t border-groww-border pt-5 text-center text-[11px] leading-relaxed text-groww-muted">
            <p>Paper trading simulation for education only. No real money is involved.</p>
            <p className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
              <a href="/legal" className="text-groww-primary hover:underline">Legal</a>
              <a href="/legal/terms" className="hover:text-groww-ink">Terms</a>
              <a href="/legal/privacy" className="hover:text-groww-ink">Privacy</a>
              <a href="/legal/disclaimer" className="hover:text-groww-ink">Disclaimer</a>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
