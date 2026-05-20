import { getDefaultDashboardPath } from './roles';
import { useAuthStore } from './store';

export function persistLoginSession(data) {
  const { accessToken, refreshToken, user } = data;
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  useAuthStore.getState().setAuth(user, accessToken);
  return getDefaultDashboardPath(user?.role);
}
