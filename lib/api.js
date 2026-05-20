import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`, { refreshToken });
          localStorage.setItem('token', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      } else if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/';
      }
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
  setup2FA: () => api.post('/auth/2fa/setup'),
  disable2FA: (token) => api.post('/auth/2fa/disable', { token }),
  changePassword: (data) => api.post('/auth/password/change', data),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.post('/auth/sessions/revoke-all'),
  updateActivity: () => api.post('/auth/activity'),
  requestPasswordReset: (data) => api.post('/auth/password/reset-request', data),
  verifyPasswordResetOTP: (data) => api.post('/auth/password/reset-verify', data),
  resetPassword: (data) => api.post('/auth/password/reset', data)
};

export const market = {
  getQuote: (symbol, exchange = 'NSE') => api.get(`/market/quote/${symbol}?exchange=${exchange}`),
  search: (q, exchange = 'ALL', limit = 50, offset = 0) =>
    api.get(
      `/market/search?q=${encodeURIComponent(q || '')}&exchange=${exchange}&limit=${limit}&offset=${offset}`
    ),
  getList: () => api.get('/market/list'),
  getHistorical: (symbol, period) => api.get(`/market/historical/${symbol}?period=${period}`),
  getGainers: () => api.get('/market/gainers'),
  getLosers: () => api.get('/market/losers'),
  getIndices: () => api.get('/market/indices'),
  getStatus: () => api.get('/market/status'),
  getIndicators: (symbol, period, indicators) => api.get(`/indicators/calculate?symbol=${symbol}&period=${period}&indicators=${indicators}`)
};

export const trading = {
  placeOrder: (data) => api.post('/trading/order', data),
  getOrders: (limit = 100) => api.get(`/trading/orders?limit=${limit}`),
  cancelOrder: (orderId) => api.delete(`/trading/order/${orderId}`)
};

export const leaderboard = {
  get: (params = {}) => api.get('/leaderboard', { params }),
  getBatches: () => api.get('/leaderboard/batches')
};

export const portfolio = {
  getHoldings: () => api.get('/portfolio/holdings'),
  getSummary: () => api.get('/portfolio/summary'),
  getTrades: () => api.get('/portfolio/trades'),
  getPerformance: (days) => api.get(`/portfolio/performance?days=${days}`),
  getTimeLoss: (period = 'month') => api.get(`/portfolio/time-loss?period=${period}`)
};

export const wallet = {
  get: () => api.get('/wallet'),
  getHistory: () => api.get('/wallet/history')
};

export const watchlist = {
  getAll: () => api.get('/watchlist'),
  create: (name) => api.post('/watchlist', { name }),
  delete: (id) => api.delete(`/watchlist/${id}`),
  add: (id, symbol) => api.post(`/watchlist/${id}/add`, { symbol }),
  remove: (id, symbol) => api.delete(`/watchlist/${id}/remove/${symbol}`)
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
    const token = localStorage.getItem('token');
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
