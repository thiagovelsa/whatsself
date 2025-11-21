import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services/authService';
import { websocketService } from '../services/websocketService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'admin' | 'operator') => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as { response?: { data?: { error?: unknown } } };
    const message = maybeAxios.response?.data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getStoredUser(),
  token: null,
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const { user, token } = await authService.login(email, password);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect WebSocket after login
      websocketService.connect(token);
    } catch (err: unknown) {
      set({
        error: extractErrorMessage(err, 'Login failed'),
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (email, password, name, role) => {
    try {
      set({ isLoading: true, error: null });
      const { user, token } = await authService.register(email, password, name, role);

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect WebSocket after register
      websocketService.connect(token);
    } catch (err: unknown) {
      set({
        error: extractErrorMessage(err, 'Registration failed'),
        isLoading: false,
      });
      throw err;
    }
  },

  logout: () => {
    void authService.logout();
    websocketService.disconnect();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const storedUser = authService.getStoredUser();
    if (!storedUser) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      set({ isLoading: true });
      const { user, token } = await authService.refreshSession();
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect WebSocket if not connected
      if (token && !websocketService.isConnected()) {
        websocketService.connect(token);
      }
    } catch {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
