import { create } from 'zustand';
import { normalizeRole } from './roles';

function parseStoredUser(userStr) {
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
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
    if (typeof window !== 'undefined' && normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    }
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem('token', token);
    }
    set({ user: normalized, token, isAuthenticated: true, authReady: true });
  },
  setUser: (user) => {
    const normalized = user?.role ? { ...user, role: normalizeRole(user.role) } : user;
    if (typeof window !== 'undefined' && normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    }
    set({ user: normalized });
  },
  logout: () => set({ user: null, token: null, isAuthenticated: false, authReady: false }),

  init: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const user = parseStoredUser(localStorage.getItem('user'));
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
    const priceMap = {};
    quotes.forEach(q => { priceMap[q.symbol] = q; });
    set(state => ({ prices: { ...state.prices, ...priceMap } }));
  },

  setIndices: (indices) => set({ indices }),

  updatePrice: (quote) => set(state => ({
    prices: { ...state.prices, [quote.symbol]: quote }
  })),

  setMarketStatus: (status) => set({ marketStatus: status })
}));

export const usePortfolioStore = create((set) => ({
  summary: null,
  holdings: [],

  setSummary: (summary) => set({ summary }),
  setHoldings: (holdings) => set({ holdings })
}));