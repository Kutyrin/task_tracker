import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { clearStoredTokens, saveTokens } from '@/lib/auth-storage';
import { store } from '@/store';
import { clearAuth, setTokens } from '@/store/auth-slice';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const accessToken = store.getState().auth.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    const refreshToken = store.getState().auth.refreshToken;

    if (!refreshToken) {
      clearStoredTokens();
      store.dispatch(clearAuth());
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ accessToken: string; refreshToken: string }>(
            `${API_URL}/auth/refresh`,
            {
              refreshToken,
            },
            {
              withCredentials: true,
            },
          )
          .then(({ data }) => {
            saveTokens(data);
            store.dispatch(setTokens(data));

            return data.accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const accessToken = await refreshPromise;

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearStoredTokens();
      store.dispatch(clearAuth());

      return Promise.reject(refreshError);
    }
  },
);

export default api;
