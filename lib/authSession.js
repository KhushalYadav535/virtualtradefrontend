import { getDefaultDashboardPath } from './roles';
import { useAuthStore } from './store';
import { setSecureItem, removeSecureItem } from './secureStorage';

const LOGIN_GRACE_MS = 20000;

export function isWithinLoginGrace() {
  if (typeof window === 'undefined') return false;
  const ts = sessionStorage.getItem('authLoginAt');
  return ts && Date.now() - Number(ts) < LOGIN_GRACE_MS;
}

function disconnectSocketSafe() {
  if (typeof window === 'undefined') return;
  import('./socket').then(({ disconnectSocket }) => disconnectSocket()).catch(() => {});
}

export function clearAuthSession() {
  disconnectSocketSafe();
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  removeSecureItem('token');
  removeSecureItem('refreshToken');
  removeSecureItem('user');
  sessionStorage.removeItem('authLoginAt');
  useAuthStore.getState().logout();
}

export function persistLoginSession(data) {
  const { accessToken, refreshToken, user } = data;

  if (!accessToken || !user) {
    throw new Error('Invalid login response');
  }

  clearAuthSession();

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
    setSecureItem('refreshToken', refreshToken);
  }
  localStorage.setItem('token', accessToken);
  localStorage.setItem('user', JSON.stringify(user));
  setSecureItem('token', accessToken);
  setSecureItem('user', JSON.stringify(user));
  useAuthStore.getState().setAuth(user, accessToken);
  sessionStorage.setItem('authLoginAt', String(Date.now()));

  return getDefaultDashboardPath(user?.role);
}
