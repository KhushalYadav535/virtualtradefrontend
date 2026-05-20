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
    verifyOtp: 'Verify & continue'
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
    verifyOtp: 'सत्यापित करें'
  }
};

export function t(key, locale = 'en') {
  const lang = locale === 'hi' ? 'hi' : 'en';
  return dict[lang][key] || dict.en[key] || key;
}

export function getLocaleFromUser(user) {
  return user?.locale === 'hi' ? 'hi' : 'en';
}
