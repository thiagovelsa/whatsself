import { create } from 'zustand';
import type { SystemStatus, WebSocketEvent } from '../types';
import { websocketService } from '../services/websocketService';
import { authService } from '../services/authService';
import { notificationActions } from './useNotificationStore';

interface SystemState {
  status: SystemStatus | null;
  qrCode: string | null;
  isConnected: boolean;
  lastEvent: WebSocketEvent | null;
  notifications: WebSocketEvent[];
  configUpdatedAt: string | null;

  // Actions
  setStatus: (status: SystemStatus) => void;
  setQRCode: (qr: string | null) => void;
  setConnected: (connected: boolean) => void;
  addNotification: (event: WebSocketEvent) => void;
  clearNotifications: () => void;
  subscribeToWebSocket: (options?: { mode?: 'public' | 'private' }) => void;
  unsubscribeFromWebSocket: () => void;
}

const isQrCodePayload = (data: unknown): data is { qr: string } =>
  typeof data === 'object' && data !== null && typeof (data as { qr?: unknown }).qr === 'string';

const isSystemStatusPayload = (data: unknown): data is SystemStatus => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const candidate = data as Partial<SystemStatus>;
  const whatsapp = candidate.whatsapp;
  const queue = candidate.queue;
  const circuitBreaker = candidate.circuitBreaker;
  const rateLimit = candidate.rateLimit;

  return (
    typeof whatsapp === 'object' &&
    whatsapp !== null &&
    typeof (whatsapp as { ready?: unknown }).ready === 'boolean' &&
    typeof (whatsapp as { connected?: unknown }).connected === 'boolean' &&
    typeof queue === 'object' &&
    queue !== null &&
    typeof (queue as { length?: unknown }).length === 'number' &&
    typeof (queue as { processing?: unknown }).processing === 'boolean' &&
    typeof circuitBreaker === 'object' &&
    circuitBreaker !== null &&
    typeof (circuitBreaker as { state?: unknown }).state === 'string' &&
    typeof (circuitBreaker as { failureRate?: unknown }).failureRate === 'number' &&
    typeof rateLimit === 'object' &&
    rateLimit !== null &&
    typeof (rateLimit as { sentLastMinute?: unknown }).sentLastMinute === 'number' &&
    typeof (rateLimit as { globalLimit?: unknown }).globalLimit === 'number'
  );
};

let wsUnsubscribe: (() => void) | null = null;
let wsConnectionUnsubscribe: (() => void) | null = null;
let subscriberCount = 0;
let connectionMode: 'public' | 'private' | null = null;

export const useSystemStore = create<SystemState>((set) => ({
  status: null,
  qrCode: null,
  isConnected: false,
  lastEvent: null,
  notifications: [],
  configUpdatedAt: null,

  setStatus: (status) => set({ status }),

  setQRCode: (qr) => set({ qrCode: qr }),

  setConnected: (connected) => set({ isConnected: connected }),

  addNotification: (event) =>
    set((state) => ({
      lastEvent: event,
      notifications: [event, ...state.notifications].slice(0, 50),
    })),

  clearNotifications: () => set({ notifications: [] }),

  subscribeToWebSocket: (options) => {
    const mode: 'public' | 'private' = options?.mode ?? 'private';
    let token: string | undefined;

    if (mode === 'private') {
      const authToken = authService.getToken();
      if (!authToken) {
        console.warn('Sem token para conectar ao WebSocket privado');
        return;
      }
      token = authToken;
    }

    subscriberCount += 1;

    const shouldConnect =
      !websocketService.isConnected() ||
      connectionMode !== mode;

    if (shouldConnect) {
      websocketService.connect(token, { mode });
      connectionMode = mode;
    }

    if (!wsUnsubscribe) {
      wsUnsubscribe = websocketService.on('*', (event: WebSocketEvent) => {
        set((state) => ({
          lastEvent: event,
          notifications: [event, ...state.notifications].slice(0, 50),
        }));

        switch (event.type) {
          case 'qr_code':
            console.log('📱 WebSocket received qr_code event');
            console.log('Event data:', event.data);
            if (isQrCodePayload(event.data)) {
              const qrString = event.data.qr;
              console.log('✅ Valid QR code payload received, length:', qrString.length);
              console.log('QR code preview:', qrString.substring(0, 50) + '...');
              set({ qrCode: qrString });
              console.log('✅ QR code set in store');
            } else {
              console.error('❌ Invalid QR code payload structure:', event.data);
              console.error('Expected: { qr: string }, Got:', typeof event.data, event.data);
            }
            break;

          case 'whatsapp_ready':
            set((state) => ({
              isConnected: true,
              qrCode: null,
              status: state.status
                ? {
                  ...state.status,
                  whatsapp: {
                    ready: true,
                    connected: true,
                  },
                }
                : null,
            }));
            break;

          case 'whatsapp_disconnected':
            set((state) => ({
              isConnected: false,
              status: state.status
                ? {
                  ...state.status,
                  whatsapp: {
                    ready: false,
                    connected: false,
                  },
                }
                : null,
            }));
            break;

          case 'queue_update':
            if (
              typeof event.data === 'object' &&
              event.data !== null &&
              'length' in event.data &&
              'processing' in event.data
            ) {
              const { length, processing } = event.data as { length: number; processing: boolean };
              set((state) => ({
                status: state.status
                  ? {
                    ...state.status,
                    queue: {
                      ...state.status.queue,
                      length,
                      processing,
                    },
                  }
                  : state.status,
              }));
            }
            break;

          case 'circuit_breaker_state_change':
            if (
              typeof event.data === 'object' &&
              event.data !== null &&
              'state' in event.data &&
              'failureRate' in event.data
            ) {
              const { state: breakerState, failureRate } = event.data as {
                state: string;
                failureRate: number;
              };
              set((state) => ({
                status: state.status
                  ? {
                    ...state.status,
                    circuitBreaker: {
                      ...state.status.circuitBreaker,
                      state: breakerState as SystemStatus['circuitBreaker']['state'],
                      failureRate,
                    },
                  }
                  : state.status,
              }));
            }
            break;

          case 'message_status_update':
            if (
              typeof event.data === 'object' &&
              event.data !== null &&
              'messageId' in event.data &&
              'status' in event.data
            ) {
              // Dispatch custom event for components to listen
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('message:status:update', {
                  detail: event.data
                }));
              }
            }
            break;

          case 'system_status':
            if (isSystemStatusPayload(event.data)) {
              set({ status: event.data });
            }
            break;
          case 'config_updated':
            if (typeof event.data === 'object' && event.data && 'updatedAt' in event.data) {
              set({ configUpdatedAt: (event.data as { updatedAt: string }).updatedAt });
            }
            break;

          case 'websocket_disconnected':
            notificationActions.notify({
              message: 'Conexão em tempo real perdida. Reconectando...',
              type: 'error',
              duration: 5000,
            });
            break;

          case 'websocket_reconnected':
            notificationActions.notify({
              message: 'Conexão em tempo real restaurada',
              type: 'success',
              duration: 3000,
            });
            // Trigger refetch of critical data after reconnection
            if (typeof window !== 'undefined') {
              // Dispatch custom event for components to listen
              window.dispatchEvent(new CustomEvent('websocket:reconnected'));
            }
            break;
        }
      });

      // Subscribe to connection state changes
      if (!wsConnectionUnsubscribe) {
        wsConnectionUnsubscribe = websocketService.onConnectionChange((connected) => {
          // Connection state changes are handled via events above
          // This callback is for immediate state updates
          set({ isConnected: connected });
        });
      }
    }
  },

  unsubscribeFromWebSocket: () => {
    if (subscriberCount === 0) {
      return;
    }
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      if (wsUnsubscribe) {
        wsUnsubscribe();
        wsUnsubscribe = null;
      }
      if (wsConnectionUnsubscribe) {
        wsConnectionUnsubscribe();
        wsConnectionUnsubscribe = null;
      }
      websocketService.disconnect();
      connectionMode = null;
    }
  },
}));
