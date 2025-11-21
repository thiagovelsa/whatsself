import { api } from '../lib/axios';
import type { User, AuthResponse } from '../types';

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'auth_token';
let inMemoryToken: string | null = null;

const hasWindow = typeof window !== 'undefined';
if (hasWindow) {
  const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (storedToken) {
    inMemoryToken = storedToken;
  }
}

export const authService = {
  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Store token in memory and user in localStorage
    inMemoryToken = data.token;
    if (hasWindow) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    }

    return data;
  },

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name: string,
    role?: 'admin' | 'operator'
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
      role,
    });

    // Store token in memory and user in localStorage
    inMemoryToken = data.token;
    if (hasWindow) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    }

    return data;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: User }> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    if (hasWindow) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },

  /**
   * Refresh session using HttpOnly cookie.
   */
  async refreshSession(): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/refresh');
    inMemoryToken = data.token;
    if (hasWindow) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    }
    return data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors on logout
    }
    inMemoryToken = null;
    if (hasWindow) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    window.location.href = '/login';
  },

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (inMemoryToken) {
      return inMemoryToken;
    }
    if (hasWindow) {
      const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        inMemoryToken = storedToken;
        return storedToken;
      }
    }
    return null;
  },

  /**
   * Get stored user
   */
  getStoredUser(): User | null {
    if (!hasWindow) return null;
    const userStr = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getStoredUser();
  },
};
