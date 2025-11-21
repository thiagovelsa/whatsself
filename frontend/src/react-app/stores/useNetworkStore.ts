import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  message: string | null;
  setOnline: () => void;
  setOffline: (message?: string) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  message: null,
  setOnline: () => set({ isOnline: true, message: null }),
  setOffline: (message = 'Sem conexão com a API') => set({ isOnline: false, message })
}));

export const networkActions = {
  setOnline: () => useNetworkStore.getState().setOnline(),
  setOffline: (message?: string) => useNetworkStore.getState().setOffline(message)
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    networkActions.setOnline();
  });
  window.addEventListener('offline', () => {
    networkActions.setOffline('Você está offline');
  });
}
