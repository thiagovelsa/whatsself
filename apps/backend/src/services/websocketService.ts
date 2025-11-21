import { Server as HTTPServer, createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from './authService.js';
import { envValidator } from '../config/env.validator.js';
import type { SystemConfigValues } from './systemConfigService.js';
import { createLogger } from './logger.js';

const logger = createLogger('websocket');

type AccessLevel = 'public' | 'private';
type WebSocketEventType = WebSocketEvent['type'];

const PUBLIC_EVENT_TYPES: Set<WebSocketEventType> = new Set([
	'qr_code',
	'whatsapp_ready',
	'whatsapp_disconnected',
	'system_status'
]);

export type WebSocketEvent =
	| { type: 'qr_code'; data: { qr: string } }
	| { type: 'whatsapp_ready' }
	| { type: 'whatsapp_disconnected'; data: { reason: string } }
	| { type: 'message_received'; data: { contactId: string; phone: string; message: string } }
	| { type: 'message_sent'; data: { contactId: string; phone: string; message: string } }
	| { type: 'message_status_update'; data: { messageId: string; status: string; timestamp: string } }
	| { type: 'queue_update'; data: { length: number; processing: boolean } }
	| { type: 'circuit_breaker_state_change'; data: { state: string; failureRate: number } }
	| { type: 'system_status'; data: any }
	| { type: 'config_updated'; data: { updatedAt: string } };

type WebSocketServiceOptions = {
	httpServer: HTTPServer;
	authService: AuthService;
	apiPort: number;
	initialConfig: SystemConfigValues;
	subscribe: (listener: (config: SystemConfigValues) => void) => () => void;
	getCurrentQRCode?: () => string | null;
};

export class WebSocketService {
	private io: SocketIOServer | null = null;
	private authService: AuthService;
	private connectedClients = new Set<string>();
	private publicClients = new Set<string>();
	private privateClients = new Set<string>();
	private unsubscribeConfig?: () => void;
	private sharedHttpServer: HTTPServer;
	private dedicatedServer: HTTPServer | null = null;
	private apiPort: number;
	private wsPort: number;
	private wsPath: string;
	private readonly publicRoom = 'public_clients';
	private readonly privateRoom = 'private_clients';
	private getCurrentQRCode?: () => string | null;

	constructor(options: WebSocketServiceOptions) {
		this.authService = options.authService;
		this.sharedHttpServer = options.httpServer;
		this.apiPort = options.apiPort;
		this.wsPort = options.initialConfig.wsPort;
		this.wsPath = options.initialConfig.wsPath;
		this.getCurrentQRCode = options.getCurrentQRCode;

		this.initializeServer();

		this.unsubscribeConfig = options.subscribe((config) => {
			const pathChanged = config.wsPath !== this.wsPath;
			const portChanged = config.wsPort !== this.wsPort;
			if (pathChanged || portChanged) {
				logger.info(
					{
						wsPath: config.wsPath,
						wsPort: config.wsPort
					},
					'Reconfigurando servidor WebSocket após alteração no painel'
				);
				this.wsPath = config.wsPath;
				this.wsPort = config.wsPort;
				this.reinitializeServer();
			}

			this.emit({
				type: 'config_updated',
				data: { updatedAt: config.updatedAt.toISOString() }
			});
		});
	}

	private initializeServer(): void {
		const corsOrigin = process.env.API_CORS_ORIGIN || '*';
		const serverToUse =
			this.wsPort === this.apiPort ? this.sharedHttpServer : createServer();

		if (serverToUse !== this.sharedHttpServer) {
			this.dedicatedServer = serverToUse;
			this.dedicatedServer.listen(this.wsPort, '0.0.0.0', () => {
				logger.info({ port: this.wsPort }, 'Servidor WebSocket dedicado escutando');
			});
		} else {
			this.dedicatedServer = null;
		}

		this.io = new SocketIOServer(serverToUse, {
			cors: {
				origin: corsOrigin,
				credentials: true
			},
			path: this.wsPath || envValidator.get('WS_PATH'),
			transports: ['websocket', 'polling']
		});

		this.setupAuthentication();
		this.setupConnectionHandlers();

		logger.info(
			{
				port: this.wsPort,
				path: this.wsPath
			},
			'WebSocket service initialized'
		);
	}

	private reinitializeServer(): void {
		if (this.io) {
			this.io.removeAllListeners();
			this.io.close();
			this.io = null;
		}

		if (this.dedicatedServer) {
			this.dedicatedServer.close(() => {
				logger.info('Servidor WebSocket dedicado anterior encerrado');
			});
			this.dedicatedServer = null;
		}

		this.initializeServer();
	}

	/**
	 * Setup authentication middleware
	 */
	private setupAuthentication(): void {
		if (!this.io) {
			return;
		}

		this.io.use(async (socket, next) => {
			try {
				if (this.isPublicHandshake(socket)) {
					(socket as any).accessLevel = 'public';
					logger.debug({ socketId: socket.id }, 'Public WebSocket connection accepted');
					return next();
				}

				const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

				if (!token) {
					return next(new Error('Authentication token required'));
				}

				const payload = this.authService.verifyToken(token);

				if (!payload) {
					return next(new Error('Invalid or expired token'));
				}

				// Verify user exists and is active
				const user = await this.authService.getUserById(payload.userId);

				if (!user || !user.active) {
					return next(new Error('User not found or inactive'));
				}

				// Attach user to socket
				(socket as any).user = {
					userId: payload.userId,
					email: payload.email,
					role: payload.role
				};
				(socket as any).accessLevel = 'private';

				logger.info({ userId: payload.userId, socketId: socket.id }, 'Client authenticated');
				next();
			} catch (error) {
				logger.error({ error }, 'WebSocket authentication error');
				next(new Error('Authentication failed'));
			}
		});
	}

	private isPublicHandshake(socket: Socket): boolean {
		const authFlag = (socket.handshake.auth?.public ?? socket.handshake.auth?.mode) as unknown;
		const queryFlag = socket.handshake.query.public as unknown;
		const normalize = (value: unknown): boolean =>
			value === true || value === 'true' || value === '1' || value === 'public';
		return normalize(authFlag) || normalize(queryFlag);
	}

	/**
	 * Setup connection handlers
	 */
	private setupConnectionHandlers(): void {
		if (!this.io) {
			return;
		}

		this.io.on('connection', (socket: Socket) => {
			const user = (socket as any).user;
			const accessLevel: AccessLevel = (socket as any).accessLevel ?? 'private';

			if (accessLevel === 'public') {
				logger.info({
					socketId: socket.id,
					accessLevel
				}, 'Public client connected');
			} else {
				logger.info({
					userId: user.userId,
					socketId: socket.id,
					accessLevel
				}, 'Client connected');
			}

			this.connectedClients.add(socket.id);
			if (accessLevel === 'public') {
				this.publicClients.add(socket.id);
				socket.join(this.publicRoom);
			} else {
				this.privateClients.add(socket.id);
				socket.join(this.privateRoom);
			}

			// Send initial connection acknowledgment
			socket.emit('connected', {
				message: 'Connected to WhatsSelf WebSocket',
				socketId: socket.id
			});

			// Send current QR code to public clients if available
			if (accessLevel === 'public') {
				// Use setTimeout to ensure socket is fully ready
				setTimeout(() => {
					try {
						const currentQR = this.getCurrentQRCode?.();
						if (currentQR) {
							logger.info({ socketId: socket.id, qrLength: currentQR.length }, 'Sending current QR code to new public client');
							socket.emit('event', {
								type: 'qr_code',
								data: { qr: currentQR }
							});
						} else {
							logger.debug({ socketId: socket.id }, 'No QR code available to send to new public client');
						}
					} catch (error) {
						logger.warn({ socketId: socket.id, error }, 'Could not get current QR code for new client');
					}
				}, 100); // Small delay to ensure socket is ready
			}

			// Handle disconnection
			socket.on('disconnect', (reason) => {
				logger.info({
					userId: user?.userId,
					socketId: socket.id,
					reason,
					accessLevel
				}, 'Client disconnected');

				this.connectedClients.delete(socket.id);
				if (accessLevel === 'public') {
					this.publicClients.delete(socket.id);
				} else {
					this.privateClients.delete(socket.id);
				}
			});

			// Handle ping/pong
			socket.on('ping', () => {
				socket.emit('pong');
			});

			// Handle subscribe to specific events
			if (accessLevel === 'public') {
				socket.on('subscribe', () => {
					socket.emit('error', 'Public connections cannot subscribe to channels');
				});
				socket.on('unsubscribe', () => {
					socket.emit('error', 'Public connections cannot unsubscribe from channels');
				});
			} else {
				socket.on('subscribe', (channels: string[]) => {
					channels.forEach((channel) => {
						socket.join(channel);
						logger.debug({ socketId: socket.id, channel }, 'Client subscribed to channel');
					});

					socket.emit('subscribed', { channels });
				});

				// Handle unsubscribe from specific events
				socket.on('unsubscribe', (channels: string[]) => {
					channels.forEach((channel) => {
						socket.leave(channel);
						logger.debug({ socketId: socket.id, channel }, 'Client unsubscribed from channel');
					});

					socket.emit('unsubscribed', { channels });
				});
			}
		});
	}

	/**
	 * Emit event to all connected clients
	 */
	emit(event: WebSocketEvent): void {
		if (!this.io) {
			logger.warn({ event: event.type }, 'Tentativa de emitir evento sem servidor WebSocket inicializado');
			return;
		}

		const targets = this.getTargetsForEvent(event.type);

		if (targets.length === 0) {
			logger.warn({ event: event.type }, 'Nenhum destino configurado para evento');
			return;
		}

		targets.forEach((room) => {
			this.io?.to(room).emit('event', event);
		});

		logger.debug({
			type: event.type,
			clients: this.connectedClients.size,
			publicClients: this.publicClients.size,
			privateClients: this.privateClients.size
		}, 'Event emitted to target clients');
	}

	/**
	 * Emit event to specific channel
	 */
	emitToChannel(channel: string, event: WebSocketEvent): void {
		if (!this.io) {
			return;
		}

		this.io.to(channel).emit('event', event);

		logger.debug({
			type: event.type,
			channel
		}, 'Event emitted to channel');
	}

	/**
	 * Emit QR code for WhatsApp authentication
	 */
	emitQRCode(qr: string): void {
		logger.info(
			{
				qrLength: qr?.length || 0,
				connectedClients: this.connectedClients.size
			},
			'Emitting QR code to WebSocket clients'
		);
		this.emit({
			type: 'qr_code',
			data: { qr }
		});
		logger.info('QR code event emitted successfully');
	}

	/**
	 * Emit WhatsApp ready event
	 */
	emitWhatsAppReady(): void {
		this.emit({
			type: 'whatsapp_ready'
		});
	}

	/**
	 * Emit WhatsApp disconnected event
	 */
	emitWhatsAppDisconnected(reason: string): void {
		this.emit({
			type: 'whatsapp_disconnected',
			data: { reason }
		});
	}

	/**
	 * Emit message received event
	 */
	emitMessageReceived(contactId: string, phone: string, message: string): void {
		this.emit({
			type: 'message_received',
			data: { contactId, phone, message }
		});
	}

	/**
	 * Emit message sent event
	 */
	emitMessageSent(contactId: string, phone: string, message: string): void {
		this.emit({
			type: 'message_sent',
			data: { contactId, phone, message }
		});
	}

	/**
	 * Emit message status update event
	 */
	emitMessageStatusUpdate(messageId: string, status: string): void {
		this.emit({
			type: 'message_status_update',
			data: { 
				messageId, 
				status,
				timestamp: new Date().toISOString()
			}
		});
	}

	/**
	 * Emit queue update event
	 */
	emitQueueUpdate(length: number, processing: boolean): void {
		this.emit({
			type: 'queue_update',
			data: { length, processing }
		});
	}

	/**
	 * Emit circuit breaker state change event
	 */
	emitCircuitBreakerStateChange(state: string, failureRate: number): void {
		this.emit({
			type: 'circuit_breaker_state_change',
			data: { state, failureRate }
		});
	}

	/**
	 * Emit system status event
	 */
	emitSystemStatus(status: any): void {
		this.emit({
			type: 'system_status',
			data: status
		});
	}

	/**
	 * Get connected clients count
	 */
	getConnectedClientsCount(): number {
		return this.connectedClients.size;
	}

	/**
	 * Set function to get current QR code
	 */
	setQRCodeGetter(getter: () => string | null): void {
		this.getCurrentQRCode = getter;
	}

	private getTargetsForEvent(type: WebSocketEventType): string[] {
		if (PUBLIC_EVENT_TYPES.has(type)) {
			return [this.publicRoom, this.privateRoom];
		}
		return [this.privateRoom];
	}

	/**
	 * Get all connected client IDs
	 */
	getConnectedClients(): string[] {
		return Array.from(this.connectedClients);
	}

	/**
	 * Gracefully close WebSocket server (used on shutdown)
	 */
	close(): void {
		if (this.unsubscribeConfig) {
			this.unsubscribeConfig();
			this.unsubscribeConfig = undefined;
		}

		try {
			this.io?.close();
			this.io = null;
			if (this.dedicatedServer) {
				this.dedicatedServer.close();
				this.dedicatedServer = null;
			}
			this.connectedClients.clear();
			this.publicClients.clear();
			this.privateClients.clear();
			logger.info('WebSocket service closed');
		} catch (error) {
			logger.warn({ error }, 'Error closing WebSocket service');
		}
	}
}
