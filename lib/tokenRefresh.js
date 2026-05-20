import axios from 'axios';
import { useAuthStore } from './store';

let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  refreshPromise = axios
    .post(`${apiUrl}/auth/refresh-token`, { refreshToken })
    .then(({ data }) => {
      localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      if (data.user) {
        useAuthStore.getState().setAuth(data.user, data.accessToken);
      }
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}
