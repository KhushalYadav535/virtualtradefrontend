import { create } from 'zustand';
import { normalizeRole } from './roles';

function parseStoredUser(userStr) {
  if (!userStr) return null;
  try {
    const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
    if (user?.role) user.role = normalizeRole(user.role);
    return user;
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  authReady: false,

  setAuth: (user, token) => {
    const normalized = user?.role ? { ...user, role: normalizeRole(user.role) } : user;
    if (typeof globalThis !== 'undefined') {
      globalThis.userStr = JSON.stringify(normalized);
      globalThis.token = token;
    }
    set({ user: normalized, token, isAuthenticated: true, authReady: true });
  },
  setUser: (user) => {
    const normalized = user?.role ? { ...user, role: normalizeRole(user.role) } : user;
    if (typeof globalThis !== 'undefined') {
      globalThis.userStr = JSON.stringify(normalized);
    }
    if (typeof localStorage !== 'undefined' && normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    }
    set({ user: normalized });
  },
  logout: () => {
    if (typeof globalThis !== 'undefined') {
       globalThis.userStr = null;
       globalThis.token = null;
    }
    set({ user: null, token: null, isAuthenticated: false, authReady: false });
  },

  init: () => {
    if (typeof globalThis === 'undefined') return;
    let token = globalThis.token;
    let userStr = globalThis.userStr;
    if (!token || !userStr) {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        token = storedToken;
        userStr = storedUser;
        globalThis.token = storedToken;
        globalThis.userStr = storedUser;
      }
    }
    const user = parseStoredUser(userStr);
    if (token && user) {
      set({ user, token, isAuthenticated: true, authReady: true });
    } else {
      set({ authReady: true });
    }
  }
}));

export const useMarketStore = create((set) => ({
  prices: {},
  indices: [],
  marketStatus: null,

  updatePrices: (quotes) => {
    if (!quotes?.length) return;
    set(state => {
      const next = { ...state.prices };
      let changed = false;
      for (const q of quotes) {
        if (!q?.symbol) continue;
        const prev = next[q.symbol];
        if (!prev || prev.ltp !== q.ltp || prev.changePercent !== q.changePercent || prev.volume !== q.volume) {
          next[q.symbol] = q;
          changed = true;
        }
      }
      return changed ? { prices: next } : state;
    });
  },

  setIndices: (indices) => set({ indices }),

  updatePrice: (quote) => {
    if (!quote?.symbol) return;
    set(state => {
      const prev = state.prices[quote.symbol];
      if (prev && prev.ltp === quote.ltp && prev.changePercent === quote.changePercent && prev.volume === quote.volume) {
        return state;
      }
      return { prices: { ...state.prices, [quote.symbol]: quote } };
    });
  },

  setMarketStatus: (status) => set({ marketStatus: status })
}));

export const usePrice = (symbol) =>
  useMarketStore((s) => (symbol ? s.prices[symbol] : null));

export const usePortfolioStore = create((set) => ({
  summary: null,
  holdings: [],

  setSummary: (summary) => set({ summary }),
  setHoldings: (holdings) => set({ holdings })
}));

export const usePortfolioMgmtStore = create((set) => ({
  portfolios: [],
  activePortfolioId: null,
  loading: false,

  setPortfolios: (portfolios) => set({ portfolios }),
  setActivePortfolioId: (id) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activePortfolioId', id || '');
    }
    set({ activePortfolioId: id });
  },
  setLoading: (loading) => set({ loading })
}));