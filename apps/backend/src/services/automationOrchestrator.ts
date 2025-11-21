import { PrismaClient } from '@prisma/client';
import { Message as WAMessage } from 'whatsapp-web.js';
import { WhatsAppService } from './whatsappService.js';
import { MessageQueue, QueuedMessage } from './messageQueue.js';
import { Humanizer } from './humanizer.js';
import { CircuitBreaker, CircuitState } from './circuitBreaker.js';
import { BusinessRules } from './businessRules.js';
import { matchTrigger } from '../domain/triggerMatcher.js';
import { ensureFlowInstance, processAutoSteps, applyInputAndProgress } from '../domain/flowEngine.js';
import type { WebSocketService } from './websocketService.js';
import { systemConfigService, SystemConfigValues } from './systemConfigService.js';
import { createLogger } from './logger.js';
const logger = createLogger('orchestrator');

export class AutomationOrchestrator {
	private prisma: PrismaClient;
	private whatsappService: WhatsAppService;
	private messageQueue: MessageQueue;
	private humanizer: Humanizer;
	private circuitBreaker: CircuitBreaker;
	private businessRules: BusinessRules;
	private websocketService?: WebSocketService;
	private statusInterval: NodeJS.Timeout | null = null;
	private latestQRCode: string | null = null;
	private configService = systemConfigService;
	private whatsappWatchdogInterval: NodeJS.Timeout | null = null;

	constructor(prisma: PrismaClient, websocketService?: WebSocketService, configService = systemConfigService) {
		this.prisma = prisma;
		this.configService = configService;
		const config = this.configService.getConfig();
		const subscribe = this.configService.subscribe.bind(this.configService);
		this.whatsappService = new WhatsAppService(prisma, this.configService);
		this.humanizer = new Humanizer({
			initialConfig: config,
			subscribe
		});
		this.circuitBreaker = new CircuitBreaker({
			initialConfig: config,
			subscribe
		});
		this.businessRules = new BusinessRules(prisma);
		this.websocketService = websocketService;

		// Initialize message queue with send function
		this.messageQueue = new MessageQueue(
			prisma,
			async (message: QueuedMessage) => {
				await this.sendMessageWithHumanization(message);
			},
			{
				systemConfig: config,
				subscribe
			}
		);

		this.circuitBreaker.setStateChangeListener((state, failureRate) => {
			this.websocketService?.emitCircuitBreakerStateChange(state, failureRate);
		});
	}

	/**
	 * Initialize the orchestrator and start WhatsApp
	 */
	async initialize(): Promise<void> {
		logger.info('Initializing automation orchestrator...');

		await this.whatsappService.initialize({
			onReady: async () => {
				logger.info('WhatsApp ready - automation active');
				this.websocketService?.emitWhatsAppReady();
				this.latestQRCode = null;
				// Broadcast status immediately to update all clients
				await this.broadcastStatusOnce();
			},
			onQR: (qr) => {
				logger.info({ qrLength: qr?.length || 0, qrStart: qr?.substring(0, 30) }, 'QR Code generated - emitting to WebSocket');
				// QR code será exibido no frontend via WebSocket
				this.latestQRCode = qr;
				if (this.websocketService) {
					this.websocketService.emitQRCode(qr);
					logger.info('QR Code enviado para o frontend via WebSocket. Acesse http://localhost:5173 para escanear.');
				} else {
					logger.error('WebSocket service not available to emit QR code!');
					logger.warn('QR Code disponível apenas no terminal. Configure o WebSocket para exibir no frontend.');
				}
			},
			onMessage: async (msg) => {
				await this.handleIncomingMessage(msg);
			},
			onMessageStatus: async (msg) => {
				// If the message has an internal ID attached (from handleMessageAck), emit the update
				const internalId = (msg as any)._internalId;
				if (internalId && this.websocketService) {
					// Determine status string from ack
					// We can't easily get the mapped status here without duplicating logic or passing it
					// But we can infer it or just send a generic update signal
					// Better: let's just emit the update. The frontend will receive the new status.
					// Actually, we need the status string for the event.
					// Let's map it again or pass it.
					// For now, let's map it based on ack if available, or just fetch the message?
					// Fetching is safer but slower.
					// Let's use the ack number from the msg object if possible, but msg object here is WAMessage
					// which might not have the latest ack if it's just the object passed to handler.
					// However, handleMessageAck updated the DB.

					// Let's fetch the updated message to be sure and get the correct status string
					const updatedMessage = await this.prisma.message.findUnique({
						where: { id: internalId },
						select: { status: true }
					});

					if (updatedMessage) {
						this.websocketService.emitMessageStatusUpdate(internalId, updatedMessage.status);
					}
				}
			},
			onDisconnected: async (reason) => {
				logger.warn({ reason }, 'WhatsApp disconnected');
				this.websocketService?.emitWhatsAppDisconnected(reason);
				// Broadcast status immediately to update all clients
				await this.broadcastStatusOnce();
			}
		});

		// Set WhatsApp client in humanizer
		const client = this.whatsappService.getClient();
		if (client) {
			this.humanizer.setWhatsAppClient(client);
		}

		this.startStatusBroadcast();
		this.startWhatsAppWatchdog();

		logger.info('Automation orchestrator initialized');
	}

	/**
	 * Main message handler - coordinates all services
	 */
	private async handleIncomingMessage(msg: WAMessage): Promise<void> {
		try {
			// Skip messages from groups, broadcast, and status
			if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
				logger.debug({ from: msg.from }, 'Skipping message from group/broadcast/status');
				return;
			}

			// Get contact from message
			const phone = msg.from.replace('@c.us', '');
			let contact = await this.prisma.contact.findUnique({
				where: { phone }
			});

			if (!contact) {
				let inferredName: string | null = null;
				const client = this.whatsappService.getClient();
				if (client) {
					try {
						const waContact = await client.getContactById(`${phone}@c.us`);
						inferredName = waContact.pushname || waContact.name || null;
					} catch (error) {
						logger.debug({ phone, error }, 'Failed to infer WhatsApp contact name');
					}
				}

				contact = await this.prisma.contact.create({
					data: {
						phone,
						name: inferredName
					}
				});
				logger.info({ phone }, 'Contact auto-created from inbound message');
			}

			this.websocketService?.emitMessageReceived(contact.id, phone, msg.body);

			logger.info({
				contactId: contact.id,
				phone,
				message: msg.body.substring(0, 100)
			}, 'Processing incoming message');

			// Apply business rules
			const shouldAutomate = await this.businessRules.shouldAutomateContact(
				contact.id,
				msg.body
			);

			// Send response message if needed
			if (shouldAutomate.responseMessage) {
				await this.enqueueMessage(contact.id, phone, shouldAutomate.responseMessage, 10);
			}

			if (!shouldAutomate.shouldAutomate) {
				logger.info({
					contactId: contact.id,
					action: shouldAutomate.action
				}, 'Automation skipped');
				return;
			}

			// Check circuit breaker
			if (!this.circuitBreaker.isAllowed()) {
				logger.warn({
					contactId: contact.id,
					state: this.circuitBreaker.getState()
				}, 'Circuit breaker is open - skipping automation');
				return;
			}

			// Check for active flow instance
			const activeFlow = await this.prisma.flowInstance.findFirst({
				where: {
					contactId: contact.id,
					paused: false
				}
			});

			if (activeFlow) {
				// Contact is in a flow - process input
				await this.handleFlowInput(contact.id, phone, msg.body, activeFlow.id);
			} else {
				// No active flow - check triggers
				await this.handleTriggerMatching(contact.id, phone, msg.body);
			}

			// Record success in circuit breaker
			this.circuitBreaker.recordSuccess();

		} catch (error) {
			logger.error({ error, msgId: msg.id.id }, 'Error handling incoming message');
			this.circuitBreaker.recordFailure();
		}
	}

	/**
	 * Handle flow input from contact
	 */
	private async handleFlowInput(
		contactId: string,
		phone: string,
		inputText: string,
		flowInstanceId: string
	): Promise<void> {
		const messagesToEnqueue: Array<{ text: string; meta: any; messageId: string }> = [];

		await this.prisma.$transaction(async (tx) => {
			const instance = await tx.flowInstance.findUnique({
				where: { id: flowInstanceId }
			});

			if (!instance) return;

			// Apply input and progress flow
			const result = await applyInputAndProgress(tx as PrismaClient, instance, inputText, {
				vars: { contactId, phone }
			});

			// Persist instance state
			await tx.flowInstance.update({
				where: { id: instance.id },
				data: {
					currentStepKey: result.instance.currentStepKey,
					lastInteractionAt: result.instance.lastInteractionAt,
					paused: result.instance.paused
				}
			});

			// Process actions
			for (const action of result.actions) {
				if (action.type === 'send_text') {
					// Create message record inside transaction
					const message = await tx.message.create({
						data: {
							contactId,
							content: action.text,
							direction: 'outbound',
							status: 'queued',
							whatsappId: `queued_${Date.now()}_${Math.random().toString(36).substring(7)}`,
							flowInstanceId: flowInstanceId,
							triggerId: action.meta?.triggerId as string | undefined,
							templateId: action.meta?.templateId as string | undefined
						}
					});

					messagesToEnqueue.push({
						text: action.text,
						meta: {
							flowInstanceId,
							...(action.meta ?? {})
						},
						messageId: message.id
					});
				} else if (action.type === 'end_flow') {
					logger.info({ contactId, flowInstanceId }, 'Flow ended');
				}
			}
		});

		// Enqueue messages after successful transaction
		for (const msg of messagesToEnqueue) {
			await this.enqueueMessage(contactId, phone, msg.text, 5, msg.meta, msg.messageId);
		}
	}

	/**
	 * Handle trigger matching and response
	 */
	private async handleTriggerMatching(
		contactId: string,
		phone: string,
		messageText: string
	): Promise<void> {
		const messagesToEnqueue: Array<{ text: string; meta: any; messageId: string }> = [];

		await this.prisma.$transaction(async (tx) => {
			// Match trigger
			const matched = await matchTrigger(tx as PrismaClient, {
				text: messageText,
				contactId
			});

			if (!matched) {
				logger.debug({ contactId }, 'No trigger matched');
				return;
			}

			// Get trigger with relations
			const trigger = await tx.trigger.findUnique({
				where: { id: matched.trigger.id },
				include: {
					template: true,
					flow: true
				}
			});

			if (!trigger) return;

			logger.info({
				contactId,
				triggerId: trigger.id,
				triggerPattern: trigger.pattern
			}, 'Trigger matched');

			// Handle template response
			if (trigger.template) {
				const { renderTemplate } = await import('./templateRenderer.js');
				const text = await renderTemplate(tx as PrismaClient, trigger.template.id, {
					vars: { contactId, phone }
				});

				const message = await tx.message.create({
					data: {
						contactId,
						content: text,
						direction: 'outbound',
						status: 'queued',
						whatsappId: `queued_${Date.now()}_${Math.random().toString(36).substring(7)}`,
						triggerId: trigger.id,
						templateId: trigger.template.id
					}
				});

				messagesToEnqueue.push({
					text,
					meta: {
						triggerId: trigger.id,
						templateId: trigger.template.id
					},
					messageId: message.id
				});
			}

			// Handle flow start
			if (trigger.flow) {
				const instance = await ensureFlowInstance(tx as PrismaClient, contactId, trigger.flow.id);
				const result = await processAutoSteps(tx as PrismaClient, instance, {
					vars: { contactId, phone }
				});

				// Persist instance state
				await tx.flowInstance.update({
					where: { id: instance.id },
					data: {
						currentStepKey: result.instance.currentStepKey,
						lastInteractionAt: result.instance.lastInteractionAt,
						paused: result.instance.paused
					}
				});

				// Process actions
				for (const action of result.actions) {
					if (action.type === 'send_text') {
						const message = await tx.message.create({
							data: {
								contactId,
								content: action.text,
								direction: 'outbound',
								status: 'queued',
								whatsappId: `queued_${Date.now()}_${Math.random().toString(36).substring(7)}`,
								flowInstanceId: instance.id,
								triggerId: action.meta?.triggerId as string | undefined,
								templateId: action.meta?.templateId as string | undefined
							}
						});

						messagesToEnqueue.push({
							text: action.text,
							meta: {
								flowInstanceId: instance.id,
								...(action.meta ?? {})
							},
							messageId: message.id
						});
					}
				}
			}
		});

		// Enqueue messages after successful transaction
		for (const msg of messagesToEnqueue) {
			await this.enqueueMessage(contactId, phone, msg.text, 5, msg.meta, msg.messageId);
		}
	}

	/**
	 * Enqueue a message for sending
	 */
	async enqueueMessage(
		contactId: string,
		phone: string,
		text: string,
		priority: number = 0,
		metadata?: QueuedMessage['metadata'],
		messageId?: string
	): Promise<string> {
		const id = await this.messageQueue.enqueue({
			id: messageId,
			contactId,
			phone,
			text,
			priority,
			metadata
		});

		const queueStatus = this.messageQueue.getQueueStatus();
		this.websocketService?.emitQueueUpdate(queueStatus.length, queueStatus.processing);

		return id;
	}

	/**
	 * Send message with humanization
	 */
	private async sendMessageWithHumanization(message: QueuedMessage): Promise<void> {
		try {
			// Apply humanization before sending
			await this.humanizer.beforeSend(message.phone, message.text);

			// Send through WhatsApp service
			await this.whatsappService.sendMessage(message.phone, message.text, {
				contactId: message.contactId,
				...(message.metadata ?? {})
			});

			// Record success in circuit breaker for outbound messages
			this.circuitBreaker.recordSuccess();

			this.websocketService?.emitMessageSent(message.contactId, message.phone, message.text);
		} catch (error) {
			// Record failure in circuit breaker
			this.circuitBreaker.recordFailure();

			logger.error({
				error,
				messageId: message.id,
				phone: message.phone
			}, 'Failed to send message with humanization');

			// Re-throw to let MessageQueue handle retry logic
			throw error;
		}
	}

	/**
	 * Get orchestrator status
	 */
	async getStatus(): Promise<{
		whatsapp: { ready: boolean; connected: boolean };
		queue: { length: number; processing: boolean };
		circuitBreaker: { state: CircuitState; failureRate: number };
		rateLimit: { sentLastMinute: number; globalLimit: number };
	}> {
		const whatsappStatus = await this.whatsappService.getStatus();
		const queueStatus = this.messageQueue.getQueueStatus();
		const cbStatus = this.circuitBreaker.getStatus();
		const rlStatus = this.messageQueue.getRateLimitStatus();

		return {
			whatsapp: whatsappStatus,
			queue: {
				length: queueStatus.length,
				processing: queueStatus.processing
			},
			circuitBreaker: {
				state: cbStatus.state,
				failureRate: cbStatus.failureRate
			},
			rateLimit: {
				sentLastMinute: rlStatus.sentLastMinute,
				globalLimit: rlStatus.globalLimit
			}
		};
	}

	/**
	 * Broadcast system status immediately (used for critical events)
	 */
	private async broadcastStatusOnce(): Promise<void> {
		if (!this.websocketService) {
			return;
		}

		try {
			const status = await this.getStatus();
			this.websocketService.emitSystemStatus(status);
			this.websocketService.emitQueueUpdate(status.queue.length, status.queue.processing);
		} catch (error) {
			logger.warn({ error }, 'Failed to broadcast system status immediately');
		}
	}

	private startStatusBroadcast(): void {
		if (!this.websocketService) {
			return;
		}

		const broadcast = async () => {
			try {
				if (!this.websocketService) {
					return;
				}
				const clientCount = this.websocketService.getConnectedClientsCount();
				if (clientCount === 0) {
					return;
				}
				const status = await this.getStatus();
				this.websocketService?.emitSystemStatus(status);
				this.websocketService?.emitQueueUpdate(status.queue.length, status.queue.processing);
			} catch (error) {
				logger.warn({ error }, 'Failed to broadcast system status');
			}
		};

		// Broadcast every 2 seconds for more responsive UI (reduced from 5s)
		this.statusInterval = setInterval(broadcast, 2000);
		broadcast();
	}

	private startWhatsAppWatchdog(): void {
		if (this.whatsappWatchdogInterval) {
			clearInterval(this.whatsappWatchdogInterval);
		}
		this.whatsappWatchdogInterval = setInterval(async () => {
			const config = this.configService.getConfig();
			if (config.skipWhatsapp) {
				return;
			}
			if (this.whatsappService.isClientReady() || this.whatsappService.isInitializingClient()) {
				return;
			}
			logger.warn('WhatsApp watchdog detected offline client - attempting recovery');
			try {
				await this.whatsappService.initialize();
			} catch (error) {
				logger.error({ error }, 'Watchdog failed to reinitialize WhatsApp');
			}
		}, 60_000);
		this.whatsappWatchdogInterval.unref?.();
	}

	/**
	 * Get WhatsApp service (for endpoints)
	 */
	getWhatsAppService(): WhatsAppService {
		return this.whatsappService;
	}

	/**
	 * Get circuit breaker (for endpoints)
	 */
	getCircuitBreaker(): CircuitBreaker {
		return this.circuitBreaker;
	}

	/**
	 * Get message queue (for endpoints)
	 */
	getMessageQueue(): MessageQueue {
		return this.messageQueue;
	}

	/**
	 * Get business rules (for endpoints)
	 */
	getBusinessRules(): BusinessRules {
		return this.businessRules;
	}

	/**
	 * Get latest QR Code captured during WhatsApp pairing
	 */
	getLatestQRCode(): string | null {
		return this.latestQRCode;
	}

	/**
	 * Shutdown orchestrator gracefully
	 */
	async shutdown(): Promise<void> {
		logger.info('Shutting down automation orchestrator...');
		await this.whatsappService.disconnect();
		this.messageQueue.clear();
		if (this.statusInterval) {
			clearInterval(this.statusInterval);
			this.statusInterval = null;
		}
		logger.info('Orchestrator shutdown complete');
	}
}
