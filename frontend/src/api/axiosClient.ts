import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const TOKEN_STORAGE_KEY = 'oxsar_admin_token';

function resolveAdminBaseUrl(rawUrl?: string): string {
  const base = (rawUrl || 'http://localhost:5000/api').replace(/\/+$/, '');
  return base.endsWith('/admin') ? base : `${base}/admin`;
}

const api: AxiosInstance = axios.create({
  baseURL: resolveAdminBaseUrl(import.meta.env.VITE_API_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Token əlavə olunması (API_CONTRACT.md §9.1)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 və xəta idarəetməsi (API_CONTRACT.md §9.1)
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/login');

    if (status === 401 && !isLoginEndpoint) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default api;
