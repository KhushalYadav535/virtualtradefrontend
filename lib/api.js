import axios from 'axios';
import { clearAuthSession, isWithinLoginGrace } from './authSession';
import { refreshAccessToken } from './tokenRefresh';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const isAuthRoute = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh-token');

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status !== 401 || isAuthRoute(requestUrl)) {
      return Promise.reject(error);
    }

    if (!error.config._retry) {
      error.config._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(error.config);
      } catch (refreshErr) {
        if (!isWithinLoginGrace()) {
          clearAuthSession();
        }
        return Promise.reject(refreshErr);
      }
    }

    if (!isWithinLoginGrace()) {
      clearAuthSession();
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  setup2FA: () => api.post('/auth/2fa/setup'),
  disable2FA: (token) => api.post('/auth/2fa/disable', { token }),
  changePassword: (data) => api.post('/auth/password/change', data),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.post('/auth/sessions/revoke-all'),
  updateActivity: () => api.post('/auth/activity'),
  deleteAccount: (password) => api.delete('/auth/account', { data: { password } }),
  sendMobileOTP: (data) => api.post('/auth/mobile/send-otp', data),
  registerWithPhone: (data) => api.post('/auth/mobile/register', data),
  loginWithPhone: (data) => api.post('/auth/mobile/login', data),
  requestPasswordReset: (data) => api.post('/auth/password/reset-request', data),
  verifyPasswordResetOTP: (data) => api.post('/auth/password/reset-verify', data),
  resetPassword: (data) => api.post('/auth/password/reset', data)
};

export const market = {
  getQuote: (symbol, exchange = 'NSE') => api.get(`/market/quote/${symbol}?exchange=${exchange}`),
  search: (q, exchange = 'ALL', limit = 50, offset = 0, opts = {}) => {
    const params = new URLSearchParams({
      q: q || '',
      exchange,
      limit: String(limit),
      offset: String(offset)
    });
    if (opts.sector) params.set('sector', opts.sector);
    if (opts.marketCap) params.set('marketCap', opts.marketCap);
    if (opts.isin) params.set('isin', opts.isin);
    if (opts.lotFilter) params.set('lotFilter', opts.lotFilter);
    return api.get(`/market/search?${params}`);
  },
  getSectors: () => api.get('/market/sectors'),
  getSectorAnalytics: () => api.get('/market/sector-analytics'),
  getPopularSearches: () => api.get('/market/popular-searches'),
  getRecentSearches: () => api.get('/market/recent-searches'),
  getList: () => api.get('/market/list'),
  getHistorical: (symbol, period) => api.get(`/market/historical/${symbol}?period=${period}`),
  getGainers: () => api.get('/market/gainers'),
  getLosers: () => api.get('/market/losers'),
  getIndices: () => api.get('/market/indices'),
  getStatus: () => api.get('/market/status'),
  getOptionChain: (symbol, expiry) => {
    const q = expiry ? `?expiry=${encodeURIComponent(expiry)}` : '';
    return api.get(`/market/option-chain/${encodeURIComponent(symbol)}${q}`);
  },
  getOptionExpiries: (symbol) =>
    api.get(`/market/option-chain/${encodeURIComponent(symbol)}/expiries`),
  getIndicators: (symbol, period, indicators) => api.get(`/indicators/calculate?symbol=${symbol}&period=${period}&indicators=${indicators}`)
};

export const trading = {
  placeOrder: (data) => api.post('/trading/order', data),
  getOrders: (limit = 100) => api.get(`/trading/orders?limit=${limit}`),
  modifyOrder: (orderId, data) => api.put(`/trading/order/${orderId}`, data),
  cancelOrder: (orderId) => api.delete(`/trading/order/${orderId}`),
  getCharges: (params) => api.get('/trading/charges', { params })
};

export const leaderboard = {
  get: (params = {}) => api.get('/leaderboard', { params }),
  getBatches: () => api.get('/leaderboard/batches')
};

export const portfolio = {
  getHoldings: () => api.get('/portfolio/holdings'),
  exportHoldingsCsv: async () => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portfolio/holdings/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'holdings.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },
  getSummary: () => api.get('/portfolio/summary'),
  getTrades: (limit = 2000) => api.get(`/portfolio/trades?limit=${limit}`),
  exportTradesCsv: async () => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/portfolio/trades/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'trade_book.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },
  getPerformance: (days) => api.get(`/portfolio/performance?days=${days}`),
  getTimeLoss: (period = 'month') => api.get(`/portfolio/time-loss?period=${period}`),
  getPositions: () => api.get('/portfolio/positions'),
  squareOffPosition: (symbol, body) =>
    api.post(`/portfolio/positions/${encodeURIComponent(symbol)}/square-off`, body || {}),
  convertMisToCnc: (symbol, body) =>
    api.post(`/portfolio/positions/${encodeURIComponent(symbol)}/convert-cnc`, body || {}),
  squareOffAllPositions: () => api.post('/portfolio/positions/square-off-all')
};

export const achievements = {
  get: () => api.get('/achievements')
};

export const alerts = {
  getAll: () => api.get('/alerts'),
  getHistory: () => api.get('/alerts/history'),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.patch(`/alerts/${id}`, data),
  delete: (id) => api.delete(`/alerts/${id}`)
};

export const activity = {
  getFeed: (limit = 30) => api.get(`/activity?limit=${limit}`)
};

export const notifications = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all')
};

export const wallet = {
  get: () => api.get('/wallet'),
  getHistory: () => api.get('/wallet/history')
};

export const watchlist = {
  getAll: () => api.get('/watchlist'),
  create: (name) => api.post('/watchlist', { name }),
  rename: (id, name) => api.put(`/watchlist/${id}`, { name }),
  delete: (id) => api.delete(`/watchlist/${id}`),
  add: (id, symbol) => api.post(`/watchlist/${id}/add`, { symbol }),
  remove: (id, symbol) => api.delete(`/watchlist/${id}/remove/${symbol}`),
  reorder: (id, symbols) => api.put(`/watchlist/${id}/reorder`, { symbols }),
  importTemplate: (id, templateKey) => api.post(`/watchlist/${id}/import`, { templateKey }),
  share: (id) => api.post(`/watchlist/${id}/share`),
  getTemplates: () => api.get('/watchlist/templates'),
  cloneShared: (token, name) => api.post(`/watchlist/shared/${token}/clone`, { name })
};

export const admin = {
  getStudents: () => api.get('/admin/students'),
  getStudent: (id) => api.get(`/admin/students/${id}`),
  getBatches: () => api.get('/admin/batch'),
  createBatch: (data) => api.post('/admin/batch', data),
  updateBatch: (batchId, data) => api.put(`/admin/batch/${batchId}`, data),
  assignBatch: (studentId, batchId) => api.post(`/admin/assign-batch/${studentId}`, { batchId }),
  banStudent: (studentId) => api.post(`/admin/ban/${studentId}`),
  activateStudent: (studentId) => api.post(`/admin/activate/${studentId}`),
  getLeaderboard: (params = {}) => api.get('/admin/leaderboard', { params }),
  exportTrades: async (params = {}) => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const query = new URLSearchParams(params).toString();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/trades/export${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'trades_export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },
  resetWallet: (userId, amount) => api.put(`/wallet/reset/${userId}`, { amount })
};

export default api;
