import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  totalSessions: number;
  averageScore: number;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'peerprep-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
