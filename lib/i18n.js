const dict = {
  en: {
    dashboard: 'Dashboard',
    trade: 'Trade',
    watchlist: 'Watchlist',
    orders: 'Orders',
    settings: 'Settings',
    buy: 'BUY',
    sell: 'SELL',
    market: 'Market',
    limit: 'Limit',
    cash: 'Cash',
    save: 'Save',
    logout: 'Logout',
    sectors: 'Sectors',
    login: 'Login',
    register: 'Register',
    phone: 'Mobile',
    sendOtp: 'Send OTP',
    verifyOtp: 'Verify & continue',
    stocks: 'Stocks',
    holdings: 'Holdings',
    wallet: 'Wallet',
    charts: 'Charts',
    screener: 'Screener',
    alerts: 'Alerts',
    portfolios: 'Portfolios',
    performance: 'Performance',
    leaderboard: 'Leaderboard',
    achievements: 'Achievements',
    positions: 'Positions',
    tradeBook: 'Trade Book',
    queued: 'Queued',
    baskets: 'Baskets',
    home: 'Home',
    wealth: 'Wealth',
    fno: 'F&O',
    futures: 'Futures'
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    trade: 'ट्रेड',
    watchlist: 'वॉचलिस्ट',
    orders: 'ऑर्डर',
    settings: 'सेटिंग्स',
    buy: 'खरीदें',
    sell: 'बेचें',
    market: 'मार्केट',
    limit: 'लिमिट',
    cash: 'नकद',
    save: 'सेव करें',
    logout: 'लॉग आउट',
    sectors: 'सेक्टर',
    login: 'लॉगिन',
    register: 'रजिस्टर',
    phone: 'मोबाइल',
    sendOtp: 'OTP भेजें',
    verifyOtp: 'सत्यापित करें',
    stocks: 'शेयर',
    holdings: 'होल्डिंग',
    wallet: 'वॉलेट',
    charts: 'चार्ट',
    screener: 'स्क्रीनर',
    alerts: 'अलर्ट',
    portfolios: 'पोर्टफोलियो',
    performance: 'प्रदर्शन',
    leaderboard: 'लीडरबोर्ड',
    achievements: 'उपलब्धियाँ',
    positions: 'पोज़िशन',
    tradeBook: 'ट्रेड बुक',
    queued: 'क्यू',
    baskets: 'बास्केट',
    home: 'होम',
    wealth: 'संपत्ति',
    fno: 'F&O',
    futures: 'फ्यूचर्स'
  }
};

const NAV_I18N_KEYS = {
  Dashboard: 'dashboard',
  Market: 'market',
  Sectors: 'sectors',
  Stocks: 'stocks',
  'F&O': 'fno',
  Futures: 'futures',
  Baskets: 'baskets',
  Screener: 'screener',
  Orders: 'orders',
  'Trade Book': 'tradeBook',
  Positions: 'positions',
  Charts: 'charts',
  Watchlist: 'watchlist',
  Alerts: 'alerts',
  Queued: 'queued',
  Portfolios: 'portfolios',
  Holdings: 'holdings',
  Performance: 'performance',
  'Time Loss': 'performance',
  Wallet: 'wallet',
  Leaderboard: 'leaderboard',
  Achievements: 'achievements',
  Home: 'home',
  Wealth: 'wealth'
};

export function navLabel(label, locale = 'en') {
  const key = NAV_I18N_KEYS[label];
  return key ? t(key, locale) : label;
}

export function t(key, locale = 'en') {
  const lang = locale === 'hi' ? 'hi' : 'en';
  return dict[lang][key] || dict.en[key] || key;
}

export function getLocaleFromUser(user) {
  return user?.locale === 'hi' ? 'hi' : 'en';
}
