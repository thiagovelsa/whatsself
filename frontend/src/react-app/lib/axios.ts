import axios from 'axios';
import { notificationActions } from '../stores/useNotificationStore';
import { networkActions } from '../stores/useNetworkStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: track network state
api.interceptors.request.use(
  (config) => {
    networkActions.setOnline();
    return config;
  },
  (error) => {
    networkActions.setOffline('Sem conexão com a API');
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    networkActions.setOnline();
    return response;
  },
  (error) => {
    if (!error.response) {
      networkActions.setOffline('Sem conexão com a API');
    } else {
      networkActions.setOnline();
      if (error.response.status === 401) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('user');
          window.localStorage.removeItem('auth_token');

          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Erro inesperado';

    notificationActions.notify({ message, type: 'error' });

    return Promise.reject(error);
  }
);
