import axios from 'axios';
import { clearAuthSession, isWithinLoginGrace } from './authSession';
import { refreshAccessToken } from './tokenRefresh';
import { getApiBaseUrl, PRODUCTION_API_URL } from './apiBase';

export { getApiBaseUrl, PRODUCTION_API_URL };

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
  getPreferences: () => api.get('/auth/preferences'),
  exportData: () => api.get('/auth/export-data'),
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

export const legal = {
  getHub: () => api.get('/legal'),
  getPages: () => api.get('/legal/pages'),
  getPage: (slug) => api.get(`/legal/${slug}`),
  getAppInfo: () => api.get('/legal/app-info')
};

export const market = {
  getQuote: (symbol, exchange = 'NSE') => api.get(`/market/quote/${symbol}?exchange=${exchange}`),
  getQuotes: (symbols) => api.post('/market/quotes', { symbols }),
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
  getMarketOverview: () => api.get('/market/overview'),
  getDataHub: () => api.get('/market/data-hub'),
  getCalendars: () => api.get('/market/calendars'),
  getCorporateActions: (symbols) =>
    api.get('/market/corporate-actions', {
      params: symbols?.length ? { symbols: symbols.join(',') } : {}
    }),
  getFiiDii: () => api.get('/market/fii-dii'),
  getPopularSearches: () => api.get('/market/popular-searches'),
  getRecentSearches: () => api.get('/market/recent-searches'),
  getList: () => api.get('/market/list'),
  getHistorical: (symbol, period) => api.get(`/market/historical/${symbol}?period=${period}`),
  getGainers: () => api.get('/market/gainers'),
  getLosers: () => api.get('/market/losers'),
  getIndices: () => api.get('/market/indices'),
  getIndexConstituents: (key) => api.get(`/market/index/${key}/constituents`),
  getWatchlistTemplates: () => api.get('/market/watchlist-templates'),
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
  getOrdersBook: (params = {}) => api.get('/trading/orders/book', { params }),
  getOrderById: (orderId) => api.get(`/trading/orders/${orderId}`),
  modifyOrder: (orderId, data) => api.put(`/trading/order/${orderId}`, data),
  cancelOrder: (orderId) => api.delete(`/trading/order/${orderId}`),
  getCharges: (params) => api.get('/trading/charges', { params }),
  getLotPreview: (params) => api.get('/trading/lot-preview', { params }),
  getHedgeBenefit: (params) => api.get('/trading/hedge-benefit', { params }),
  getSpreadMargin: (params) => api.get('/trading/spread-margin', { params })
};

export const leaderboard = {
  get: (params = {}) => api.get('/leaderboard', { params }),
  getBatches: () => api.get('/leaderboard/batches')
};

export const portfolio = {
  getHoldings: () => api.get('/portfolio/holdings'),
  getHoldingsDetail: (params = {}) => api.get('/portfolio/holdings/detail', { params }),
  getHoldingTrades: (symbol, limit = 50) =>
    api.get(`/portfolio/holdings/${encodeURIComponent(symbol)}/trades`, { params: { limit } }),
  exportHoldingsCsv: async () => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const res = await fetch(`${getApiBaseUrl()}/portfolio/holdings/export`, {
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
  exportHoldingsReport: async () => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const res = await fetch(`${getApiBaseUrl()}/portfolio/holdings/export/report`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'holdings-report.html';
    link.click();
    URL.revokeObjectURL(link.href);
  },
  exportHoldingsPdf: async () => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const res = await fetch(
      `${getApiBaseUrl()}/portfolio/holdings/export/report?print=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('Export failed');
    const html = await res.text();
    const win = window.open('', '_blank');
    if (!win) throw new Error('Allow pop-ups to print PDF');
    win.document.write(html);
    win.document.close();
  },
  getSummary: () => api.get('/portfolio/summary'),
  getTrades: (limit = 2000) => api.get(`/portfolio/trades?limit=${limit}`),
  getTradeBook: (params = {}) => api.get('/portfolio/trade-book', { params }),
  exportTradesCsv: async (params = {}) => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const qs = new URLSearchParams(params).toString();
    const url = `${getApiBaseUrl()}/portfolio/trades/export${qs ? `?${qs}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'trade_book.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },
  exportTradeBookTax: async (params = {}) => {
    const token = typeof globalThis !== 'undefined' ? globalThis.token : null;
    const qs = new URLSearchParams({ ...params, print: '1' }).toString();
    const res = await fetch(`${getApiBaseUrl()}/portfolio/trades/export/report?${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Tax report failed');
    const html = await res.text();
    const win = window.open('', '_blank');
    if (!win) throw new Error('Allow pop-ups to print PDF');
    win.document.write(html);
    win.document.close();
  },
  getPerformance: (days) => api.get(`/portfolio/performance?days=${days}`),
  getTimeLoss: (period = 'month') => api.get(`/portfolio/time-loss?period=${period}`),
  getPositions: () => api.get('/portfolio/positions'),
  getPositionsDetail: () => api.get('/portfolio/positions/detail'),
  getPositionHistory: (symbol) =>
    api.get(`/portfolio/positions/${encodeURIComponent(symbol)}/history`),
  squareOffPosition: (symbol, body) =>
    api.post(`/portfolio/positions/${encodeURIComponent(symbol)}/square-off`, body || {}),
  convertMisToCnc: (symbol, body) =>
    api.post(`/portfolio/positions/${encodeURIComponent(symbol)}/convert-cnc`, body || {}),
  squareOffAllPositions: () => api.post('/portfolio/positions/square-off-all')
};

export const achievements = {
  get: () => api.get('/achievements'),
  refresh: () => api.post('/achievements/refresh'),
  getReferral: () => api.get('/achievements/referral')
};

export const system = {
  getStatus: () => api.get('/system/status'),
  getCacheSnapshot: () => api.get('/system/cache-snapshot')
};

export const advanced = {
  getDepth: (symbol) => api.get(`/advanced/depth/${encodeURIComponent(symbol)}`),
  getFutures: () => api.get('/advanced/futures'),
  futuresRollover: (symbol) => api.post('/advanced/futures/rollover', { symbol }),
  getScreener: (params = {}) => api.get('/advanced/screener', { params }),
  getScreenerPresets: () => api.get('/advanced/screener/presets'),
  getOptionsStrategies: (params = {}) => api.get('/advanced/options-strategies', { params }),
  saveScan: (data) => api.post('/advanced/scans', data),
  listScans: () => api.get('/advanced/scans'),
  getScan: (id) => api.get(`/advanced/scans/${id}`),
  deleteScan: (id) => api.delete(`/advanced/scans/${id}`),
  subscribeScanAlert: (data) => api.post('/advanced/scan-alerts', data),
  listScanAlerts: () => api.get('/advanced/scan-alerts'),
  deleteScanAlert: (id) => api.delete(`/advanced/scan-alerts/${id}`),
  listBaskets: () => api.get('/advanced/baskets'),
  getBasket: (id) => api.get(`/advanced/baskets/${id}`),
  createBasket: (data) => api.post('/advanced/baskets', data),
  updateBasket: (id, data) => api.patch(`/advanced/baskets/${id}`, data),
  deleteBasket: (id) => api.delete(`/advanced/baskets/${id}`),
  executeBasket: (id) => api.post(`/advanced/baskets/${id}/execute`),
  getSharedBasket: (token) => api.get(`/advanced/baskets/share/${token}`),
  cloneBasket: (token) => api.post(`/advanced/baskets/share/${token}/clone`)
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

export const feedback = {
  submit: (data) => api.post('/feedback', data),
  list: () => api.get('/feedback')
};

export const offline = {
  queue: (orders) => api.post('/offline/queue', { orders }),
  sync: () => api.post('/offline/sync'),
  getQueued: () => api.get('/offline/queued')
};

export const notifications = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  clearAll: () => api.delete('/notifications')
};

export const wallet = {
  get: () => api.get('/wallet'),
  getFunds: () => api.get('/wallet/funds'),
  getHistory: (limit = 100) => api.get('/wallet/history', { params: { limit } }),
  addFunds: (amount) => api.post('/wallet/add-funds', { amount }),
  resetAccount: (amount) => api.post('/wallet/reset', amount != null ? { amount } : {}),
  getMaxLots: (symbol, productType = 'MIS') =>
    api.get('/wallet/max-lots', { params: { symbol, productType } })
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

export const portfoliosMgmt = {
  list: () => api.get('/portfolios'),
  create: (data) => api.post('/portfolios', data),
  get: (id) => api.get(`/portfolios/${id}`),
  update: (id, data) => api.put(`/portfolios/${id}`, data),
  delete: (id) => api.delete(`/portfolios/${id}`),
  activate: (id) => api.post(`/portfolios/${id}/activate`),
  compare: () => api.get('/portfolios/compare/all')
};

export const support = {
  listTickets: () => api.get('/support/tickets'),
  createTicket: (data) => api.post('/support/tickets', data)
};

export const authSecurity = {
  setOrderPin: (data) => api.post('/auth/order-pin', data),
  clearOrderPin: (data) => api.delete('/auth/order-pin', { data }),
  getOrderPinStatus: () => api.get('/auth/order-pin/status'),
  listDevices: () => api.get('/auth/devices')
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
    const url = `${getApiBaseUrl()}/admin/trades/export${query ? `?${query}` : ''}`;
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
  resetWallet: (userId, amount) => api.put(`/wallet/reset/${userId}`, { amount }),
  getAnalytics: () => api.get('/admin/analytics'),
  getOrders: (params = {}) => api.get('/admin/orders', { params }),
  getLotLogs: (params = {}) => api.get('/admin/lot-logs', { params }),
  getFeatureFlags: () => api.get('/admin/feature-flags'),
  updateFeatureFlags: (data) => api.patch('/admin/feature-flags', data),
  getLotSizes: () => api.get('/admin/lot-sizes'),
  updateLotSize: (symbol, lotSize) => api.put('/admin/lot-sizes', { symbol, lotSize }),
  syncLotSizes: () => api.post('/admin/lot-sizes/sync-bulk'),
  getRevenue: () => api.get('/admin/revenue'),
  getTickets: (params) => api.get('/admin/tickets', { params }),
  replyTicket: (ticketId, data) => api.post(`/admin/tickets/${ticketId}/reply`, data),
  getSegmentation: () => api.get('/admin/segmentation'),
  setSegment: (userId, segment) => api.put(`/admin/students/${userId}/segment`, { segment }),
  getAbTests: () => api.get('/admin/ab-tests'),
  updateAbTests: (data) => api.patch('/admin/ab-tests', data)
};

export default api;
