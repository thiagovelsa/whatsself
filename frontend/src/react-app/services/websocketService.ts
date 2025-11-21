import { io, Socket } from 'socket.io-client';
import type { WebSocketEvent } from '../types';

const defaultApiUrl =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
const defaultWsUrl = defaultApiUrl.replace(/^http/, 'ws');
const WS_URL = import.meta.env.VITE_WS_URL || defaultWsUrl;
const WS_PATH = import.meta.env.VITE_WS_PATH || '/socket.io';

type EventCallback = (event: WebSocketEvent) => void;
type ConnectionCallback = (connected: boolean) => void;
type SocketMode = 'public' | 'private';

class WebSocketService {
  private socket: Socket | null = null;
  private eventCallbacks: Map<string, Set<EventCallback>> = new Map();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private mode: SocketMode | null = null;
  private wasConnected = false;

  /**
   * Connect to WebSocket server
   */
  connect(token?: string, options?: { mode?: SocketMode }): void {
    const desiredMode: SocketMode = options?.mode ?? 'private';

    if (desiredMode === 'private' && !token) {
      console.error('❌ Token obrigatório para conexão privada com WebSocket');
      return;
    }

    if (this.socket?.connected) {
      if (this.mode === desiredMode) {
        console.log('WebSocket already connected with desired mode');
        return;
      }

      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const authPayload =
      desiredMode === 'public'
        ? { public: true }
        : { token };

    this.socket = io(WS_URL, {
      path: WS_PATH,
      auth: authPayload,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.mode = desiredMode;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Notify connection callbacks
      const isReconnect = this.wasConnected;
      this.wasConnected = true;
      this.connectionCallbacks.forEach((callback) => callback(true));
      
      // Emit reconnection event if this was a reconnect
      if (isReconnect) {
        this.notifyCallbacks('*', {
          type: 'websocket_reconnected',
          data: { socketId: this.socket?.id ?? null },
        });
      }
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server acknowledged connection:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.wasConnected = false;
      
      // Notify connection callbacks
      this.connectionCallbacks.forEach((callback) => callback(false));
      
      // Emit disconnection event
      this.notifyCallbacks('*', {
        type: 'websocket_disconnected',
        data: { reason },
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Main event handler
    this.socket.on('event', (event: WebSocketEvent) => {
      console.log('📨 WebSocket event received:', event.type);
      this.notifyCallbacks(event.type, event);
    });

    // Pong handler
    this.socket.on('pong', () => {
      console.log('🏓 Pong received');
    });

    // Subscription confirmation
    this.socket.on('subscribed', (data) => {
      console.log('✅ Subscribed to channels:', data.channels);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('✅ Unsubscribed from channels:', data.channels);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventCallbacks.clear();
      this.mode = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Subscribe to event type
   */
  on(eventType: string, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }

    this.eventCallbacks.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Unsubscribe from event type
   */
  off(eventType: string, callback: EventCallback): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(eventType);
      }
    }
  }

  /**
   * Notify all callbacks for an event
   */
  private notifyCallbacks(eventType: string, event: WebSocketEvent): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback(event));
    }

    // Also notify callbacks listening to all events
    const allCallbacks = this.eventCallbacks.get('*');
    if (allCallbacks) {
      allCallbacks.forEach((callback) => callback(event));
    }
  }

  /**
   * Subscribe to specific channels
   */
  subscribe(channels: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', channels);
    }
  }

  /**
   * Unsubscribe from specific channels
   */
  unsubscribe(channels: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', channels);
    }
  }

  /**
   * Send ping to server
   */
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current connection mode
   */
  getMode(): SocketMode | null {
    return this.mode;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
