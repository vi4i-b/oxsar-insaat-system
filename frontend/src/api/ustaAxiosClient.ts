import axios from 'axios';
import type { AxiosInstance } from 'axios';

export const USTA_TOKEN_STORAGE_KEY = 'oxsar_usta_token';

function resolveUstaBaseUrl(rawUrl?: string): string {
  const base = (rawUrl || 'http://localhost:5000/api').replace(/\/+$/, '');
  if (base.endsWith('/usta')) return base;
  if (base.endsWith('/admin')) return `${base.slice(0, -6)}/usta`;
  return `${base}/usta`;
}

const ustaApi: AxiosInstance = axios.create({
  baseURL: resolveUstaBaseUrl(import.meta.env.VITE_API_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  // 60s timeout so field 4G camera photo/video uploads complete reliably
  timeout: 60000,
});

// Request Interceptor: Attach Usta JWT Bearer token & let browser set multipart boundary for FormData
ustaApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(USTA_TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap response.data and redirect to /usta/login on 401
ustaApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const isLoginEndpoint = error.config?.url?.includes('/login');

    if (status === 401 && !isLoginEndpoint) {
      localStorage.removeItem(USTA_TOKEN_STORAGE_KEY);
      if (window.location.pathname !== '/usta/login') {
        window.location.href = '/usta/login';
      }
    }

    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default ustaApi;
