import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
      if (!refreshToken) { logout(); return Promise.reject(error); }
      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const roomApi = {
  create: (data?: { maxParticipants?: number; answerTimeSecs?: number }) =>
    api.post('/rooms/create', data),
  get: (code: string) => api.get(`/rooms/${code}`),
  results: (code: string) => api.get(`/rooms/${code}/results`),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  analyze: (roomId: string) => api.post('/ai/analyze', { roomId }),
};
