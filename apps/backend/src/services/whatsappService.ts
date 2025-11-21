import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import type { Client as WhatsAppClient, Message as WAMessage } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import { PrismaClient, MessageDirection, MessageStatus } from '@prisma/client';
import { createLogger } from './logger.js';
import type { SystemConfigValues } from './systemConfigService.js';
import { systemConfigService } from './systemConfigService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = createLogger('whatsapp');

export type WhatsAppEventHandler = {
	onReady?: () => void;
	onQR?: (qr: string) => void;
	onMessage?: (message: WAMessage) => Promise<void>;
	onMessageStatus?: (msg: WAMessage) => Promise<void>;
	onDisconnected?: (reason: string) => void;
};

class SimpleLRUCache<K, V> {
	private max: number;
	private cache: Map<K, V>;

	constructor(max: number) {
		this.max = max;
		this.cache = new Map();
	}

	get(key: K): V | undefined {
		const item = this.cache.get(key);
		if (item) {
			this.cache.delete(key);
			this.cache.set(key, item);
		}
		return item;
	}

	set(key: K, value: V): void {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.max) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, value);
	}
}

export class WhatsAppService {
	private client: WhatsAppClient | null = null;
	private prisma: PrismaClient;
	private isReady = false;
	private configService = systemConfigService;
	private currentConfig: SystemConfigValues;
	private unsubscribeConfig?: () => void;
	private lastQRCode: string | null = null;
	private handlers: WhatsAppEventHandler | undefined;
	private isInitializing = false;
	private retryCount = 0;
	private maxRetries = 3;
	private retryTimeout: NodeJS.Timeout | null = null;
	private contactCache = new SimpleLRUCache<string, string>(1000); // Cache phone -> contactId

	constructor(prisma: PrismaClient, configService = systemConfigService) {
		this.prisma = prisma;
		this.configService = configService;
		this.currentConfig = this.configService.getConfig();
		this.unsubscribeConfig = this.configService.subscribe((cfg) => {
			const previousSkip = this.currentConfig.skipWhatsapp;
			this.currentConfig = cfg;
			if (!previousSkip && cfg.skipWhatsapp) {
				logger.warn('Config updated to skip WhatsApp. Disconnecting client...');
				void this.disconnect();
			} else if (previousSkip && !cfg.skipWhatsapp) {
				logger.info('Config updated to enable WhatsApp. Initializing client...');
				void this.initialize(this.handlers);
			}
		});
	}

	async initialize(handlers?: WhatsAppEventHandler): Promise<void> {
		if (handlers) {
			this.handlers = handlers;
		}

		// Se já está inicializando, aguardar
		if (this.isInitializing) {
			logger.debug('WhatsApp client is already initializing, skipping...');
			return;
		}

		// Se já tem client e está pronto, não precisa reinicializar
		if (this.client && this.isReady) {
			logger.debug('WhatsApp client already initialized and ready');
			return;
		}

		// Se tem client mas não está pronto, destruir antes de criar novo
		if (this.client) {
			logger.info('Destroying existing client before reinitializing...');
			try {
				// Limpar todos os event listeners antes de destruir para evitar memory leak
				this.client.removeAllListeners('qr');
				this.client.removeAllListeners('ready');
				this.client.removeAllListeners('message');
				this.client.removeAllListeners('message_ack');
				this.client.removeAllListeners('disconnected');
				this.client.removeAllListeners('auth_failure');

				await this.client.destroy();
			} catch (error) {
				logger.debug({ error }, 'Error destroying existing client');
			}
			this.client = null;
		}

		this.isInitializing = true;

		const config = this.currentConfig;

		if (config.skipWhatsapp) {
			logger.info('SKIP_WHATSAPP flag detected - skipping WhatsApp initialization');
			this.isInitializing = false;
			return;
		}

		// Use absolute path for session storage on Windows
		const sessionPath = process.env.WHATS_SESSION_PATH
			? resolve(process.env.WHATS_SESSION_PATH)
			: resolve(__dirname, '..', '..', 'data', 'whatsapp_session');

		logger.info('Initializing WhatsApp client...');
		const resolvedExecutablePath = await this.resolveBrowserExecutable();

		// Configure puppeteer for Windows compatibility
		const isWindows = platform() === 'win32';
		const puppeteerConfig: Record<string, unknown> = {
			headless: process.env.PUPPETEER_HEADLESS !== 'false',
			args: [
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--no-first-run',
				'--disable-gpu',
				'--disable-extensions',
				'--disable-background-networking',
				'--disable-sync',
				'--disable-translate',
				'--hide-scrollbars',
				'--metrics-recording-only',
				'--mute-audio',
				'--no-default-browser-check',
				'--disable-default-apps',
				'--disable-features=TranslateUI',
				'--disable-ipc-flooding-protection',
				'--disable-blink-features=AutomationControlled',
				'--disable-features=IsolateOrigins,site-per-process',
				// Add Windows-specific args
				...(isWindows ? [
					'--disable-background-timer-throttling',
					'--disable-renderer-backgrounding',
					'--disable-backgrounding-occluded-windows',
					'--disable-breakpad',
					'--disable-component-extensions-with-background-pages',
					'--disable-features=AudioServiceOutOfProcess',
					'--disable-software-rasterizer',
					'--disable-web-security',
					'--disable-features=VizDisplayCompositor'
				] : [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--no-zygote'
				])
			],
			// Increase timeout for slow systems
			timeout: 180000, // 3 minutes
			// Keep browser alive even if disconnected
			handleSIGINT: false,
			handleSIGTERM: false,
			handleSIGHUP: false,
			// Prevent browser from closing
			ignoreDefaultArgs: ['--disable-extensions'],
			// Use user data dir to persist session
			userDataDir: undefined // Let whatsapp-web.js handle this
		};

		if (resolvedExecutablePath) {
			puppeteerConfig.executablePath = resolvedExecutablePath;
			logger.info({ executablePath: resolvedExecutablePath }, 'Using custom Chromium executable');
		} else {
			logger.info('Using default Chromium executable from whatsapp-web.js/puppeteer-core');
		}

		this.client = new Client({
			authStrategy: new LocalAuth({
				dataPath: sessionPath
			}),
			puppeteer: puppeteerConfig
		});

		// QR Code event
		this.client.on('qr', (qr: string) => {
			logger.info({ qrLength: qr?.length || 0 }, 'QR Code received');
			this.lastQRCode = qr;
			this.isInitializing = false; // QR code recebido = inicialização em progresso
			this.retryCount = 0; // Reset retry count quando QR code é gerado

			// QR code será exibido principalmente no frontend via WebSocket
			// Exibição no terminal apenas se LOG_PRETTY estiver ativo (modo desenvolvimento)
			// ou se não houver frontend disponível
			const shouldShowInTerminal = process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV === 'development';
			if (shouldShowInTerminal) {
				logger.info('QR Code disponível no frontend. Acesse http://localhost:5173 para escanear.');
				// Opcional: exibir QR code no terminal apenas em modo debug
				if (process.env.DEBUG === 'true') {
					qrcode.generate(qr, { small: true });
				}
			}
			this.handlers?.onQR?.(qr);
		});

		// Ready event
		this.client.on('ready', () => {
			logger.info('WhatsApp client is ready!');
			this.isReady = true;
			this.lastQRCode = null;
			this.isInitializing = false;
			this.retryCount = 0; // Reset retry count on success
			this.handlers?.onReady?.();
		});

		// Message received event
		this.client.on('message', async (msg: WAMessage) => {
			try {
				await this.handleIncomingMessage(msg);
				await this.handlers?.onMessage?.(msg);
			} catch (error) {
				logger.error({ error, msgId: msg.id.id }, 'Error handling incoming message');
			}
		});

		// Message acknowledgment (status update) event
		this.client.on('message_ack', async (msg: WAMessage, ack: number) => {
			try {
				await this.handleMessageAck(msg, ack);
				await this.handlers?.onMessageStatus?.(msg);
			} catch (error) {
				logger.error({ error, msgId: msg.id.id }, 'Error handling message ack');
			}
		});

		// Disconnected event
		this.client.on('disconnected', (reason: string) => {
			logger.warn({ reason }, 'WhatsApp client disconnected');
			this.isReady = false;
			this.lastQRCode = null;
			this.handlers?.onDisconnected?.(reason);
		});

		// Authentication failure
		this.client.on('auth_failure', (msg: string) => {
			logger.error({ msg }, 'Authentication failure');
		});

		try {
			logger.info('Starting WhatsApp client initialization...');
			await this.client.initialize();
			logger.info('WhatsApp client initialized successfully');
			// Reset retry count em caso de sucesso
			this.retryCount = 0;
		} catch (error: any) {
			this.isInitializing = false;
			this.client = null; // Reset client on error

			const errorMessage = error?.message || String(error);
			const isProtocolError = errorMessage.includes('Protocol error') || errorMessage.includes('Target closed');
			const isBrowserNotFound = errorMessage.includes('Could not find expected browser');

			if (isProtocolError) {
				this.retryCount++;

				if (this.retryCount <= this.maxRetries) {
					logger.warn({
						retryCount: this.retryCount,
						maxRetries: this.maxRetries,
						error: errorMessage
					}, 'Protocol error - tentando reinicializar em 5 segundos...');

					// Limpar client completamente
					if (this.client && 'destroy' in this.client) {
						try {
							await (this.client as WhatsAppClient).destroy();
						} catch (e) {
							// Ignorar erros ao destruir
						}
						this.client = null;
					}

					// Tentar novamente após delay
					this.retryTimeout = setTimeout(() => {
						this.retryTimeout = null;
						this.isInitializing = false;
						logger.info('Tentando reinicializar WhatsApp após erro de protocolo...');
						void this.initialize(this.handlers);
					}, 5000);

					return;
				} else {
					logger.error({
						error: errorMessage,
						stack: error?.stack,
						retryCount: this.retryCount
					}, 'Protocol error - máximo de tentativas atingido');

					logger.warn('Possíveis causas:');
					logger.warn('1. Chrome foi fechado manualmente durante a inicialização');
					logger.warn('2. Chrome crashou durante a inicialização');
					logger.warn('3. Antivírus ou firewall bloqueando o Chrome');
					logger.warn('4. Permissões insuficientes para executar o Chrome');
					logger.warn('');
					logger.warn('Soluções:');
					logger.warn('- Feche todas as janelas do Chrome antes de iniciar');
					logger.warn('- Desative temporariamente o antivírus');
					logger.warn('- Execute como administrador');
					logger.warn('- Configure PUPPETEER_HEADLESS=false para ver o que está acontecendo');

					this.retryCount = 0; // Reset para próxima tentativa manual
					return;
				}
			}

			// Reset retry count em caso de outros erros
			this.retryCount = 0;

			if (isBrowserNotFound) {
				const isWin = platform() === 'win32';
				const enhancedMessage =
					`${errorMessage}.\n` +
					(isWin ?
						'Instale o Google Chrome ou Microsoft Edge no Windows.\n' +
						'Download Chrome: https://www.google.com/chrome/\n' +
						'Ou configure PUPPETEER_EXECUTABLE_PATH no arquivo .env apontando para o chrome.exe ou msedge.exe.\n' +
						'Exemplo: PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
						:
						'Instale o Chromium/Chrome (ex.: `sudo apt update && sudo apt install -y chromium-browser`) ' +
						'ou configure PUPPETEER_EXECUTABLE_PATH apontando para um binário válido.'
					) +
					'\nCaso queira rodar sem WhatsApp, defina SKIP_WHATSAPP=true.';

				logger.error({ error: enhancedMessage }, 'Browser not found');
				throw new Error(enhancedMessage);
			}

			logger.error({ error: errorMessage, stack: error?.stack }, 'Unexpected error during WhatsApp initialization');
			throw error;
		}
	}

	private async handleIncomingMessage(msg: WAMessage): Promise<void> {
		// Skip messages from groups, broadcast, and status
		if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
			return;
		}

		const contactPhone = msg.from.replace('@c.us', '');

		// Get or create contact
		let contactId = this.contactCache.get(contactPhone);

		if (!contactId) {
			let contact = await this.prisma.contact.findUnique({
				where: { phone: contactPhone }
			});

			if (!contact) {
				contact = await this.prisma.contact.create({
					data: {
						phone: contactPhone,
						name: await this.getContactName(msg.from)
					}
				});
				logger.info({ phone: contactPhone }, 'New contact created');
			}
			contactId = contact.id;
			this.contactCache.set(contactPhone, contactId);
		}

		// Save message to database
		// Check if message already exists (avoid duplicates)
		const existingMessage = await this.prisma.message.findUnique({
			where: {
				whatsappId: msg.id.id
			}
		});

		if (!existingMessage) {
			await this.prisma.message.create({
				data: {
					contactId: contactId,
					direction: MessageDirection.inbound,
					status: MessageStatus.delivered,
					content: msg.body,
					whatsappId: msg.id.id
				}
			});

			logger.info({
				contactId: contactId,
				phone: contactPhone,
				content: msg.body.substring(0, 50)
			}, 'Inbound message saved');
		}
	}

	private async handleMessageAck(msg: WAMessage, ack: number): Promise<void> {
		// Map WhatsApp ack status to our MessageStatus
		// 1 = sent, 2 = received (delivered), 3 = read
		let status: MessageStatus;

		switch (ack) {
			case 1:
				status = MessageStatus.sent;
				break;
			case 2:
				status = MessageStatus.delivered;
				break;
			case 3:
				status = MessageStatus.read;
				break;
			default:
				// Ignore other statuses (like pending = 0 or error = -1) for now
				// Error handling is usually done via message_create or other events
				if (ack < 0) {
					status = MessageStatus.failed;
				} else {
					return;
				}
		}

		// Find the message in our database
		// First try to match by whatsappId (precise match)
		let message = await this.prisma.message.findUnique({
			where: { whatsappId: msg.id.id }
		});

		// Fallback: match by content and contact (heuristic for old messages)
		if (!message) {
			const contactPhone = msg.to.replace('@c.us', '');
			const contact = await this.prisma.contact.findUnique({
				where: { phone: contactPhone }
			});

			if (!contact) return;

			message = await this.prisma.message.findFirst({
				where: {
					contactId: contact.id,
					direction: MessageDirection.outbound,
					content: msg.body,
					NOT: {
						status: status
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			});
		}

		if (message) {
			// Don't revert status (e.g. read -> delivered)
			if (message.status === MessageStatus.read && status !== MessageStatus.read) {
				return;
			}

			await this.prisma.message.update({
				where: { id: message.id },
				data: { status }
			});

			// Attach the internal ID to the msg object so we can use it upstream
			(msg as any)._internalId = message.id;

			logger.debug({
				messageId: message.id,
				oldStatus: message.status,
				newStatus: status
			}, 'Message status updated via ACK');
		}
	}

	private async getContactName(numberId: string): Promise<string | null> {
		try {
			if (!this.client) return null;
			const contact = await this.client.getContactById(numberId);
			return contact.pushname || contact.name || null;
		} catch (error) {
			logger.error({ error, numberId }, 'Error getting contact name');
			return null;
		}
	}

	async sendMessage(
		phone: string,
		text: string,
		metadata?: {
			contactId?: string;
			triggerId?: string;
			templateId?: string;
			flowInstanceId?: string;
			messageId?: string; // Optional: ID of existing message record
			[key: string]: unknown;
		}
	): Promise<void> {
		if (!this.client || !this.isReady) {
			throw new Error('WhatsApp client is not ready');
		}

		const numberId = phone.includes('@c.us') ? phone : `${phone}@c.us`;

		try {
			const sentMsg = await this.client.sendMessage(numberId, text);

			// If messageId is provided, update existing record
			if (metadata?.messageId) {
				await this.prisma.message.update({
					where: { id: metadata.messageId },
					data: {
						status: MessageStatus.sent,
						whatsappId: sentMsg.id.id
					}
				});
			} else {
				// Get contact
				const contact = await this.prisma.contact.findUnique({
					where: { phone: phone.replace('@c.us', '') }
				});

				if (contact) {
					// Save outbound message to database, including automation metadata when disponível
					await this.prisma.message.create({
						data: {
							contactId: contact.id,
							direction: MessageDirection.outbound,
							status: MessageStatus.sent,
							content: text,
							whatsappId: sentMsg.id.id,
							triggerId: (metadata?.triggerId as string | undefined) ?? null,
							templateId: (metadata?.templateId as string | undefined) ?? null,
							flowInstanceId: (metadata?.flowInstanceId as string | undefined) ?? null
						}
					});
				}
			}

			logger.info({ phone, contentLength: text.length }, 'Message sent successfully');
		} catch (error) {
			logger.error({ error, phone }, 'Error sending message');

			if (metadata?.messageId) {
				await this.prisma.message.update({
					where: { id: metadata.messageId },
					data: { status: MessageStatus.failed }
				});
			} else {
				// Save failed message
				const contact = await this.prisma.contact.findUnique({
					where: { phone: phone.replace('@c.us', '') }
				});

				if (contact) {
					await this.prisma.message.create({
						data: {
							contactId: contact.id,
							direction: MessageDirection.outbound,
							status: MessageStatus.failed,
							content: text,
							triggerId: (metadata?.triggerId as string | undefined) ?? null,
							templateId: (metadata?.templateId as string | undefined) ?? null,
							flowInstanceId: (metadata?.flowInstanceId as string | undefined) ?? null
						}
					});
				}
			}

			throw error;
		}
	}

	/**
	 * Resolve Chromium/Chrome executable path for puppeteer
	 * Properly handles Windows paths and common installation locations
	 */
	private async resolveBrowserExecutable(): Promise<string | undefined> {
		const config = this.currentConfig;
		const configuredPath = config.puppeteerExecutablePath;
		if (configuredPath) {
			const resolved = resolve(configuredPath);
			if (existsSync(resolved)) {
				return resolved;
			}
			logger.warn({ configuredPath: resolved }, 'Configured browser executable does not exist');
		}

		const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
		if (envPath) {
			const resolvedPath = resolve(envPath);
			if (existsSync(resolvedPath)) {
				return resolvedPath;
			}
			logger.warn({ envPath: resolvedPath }, 'PUPPETEER_EXECUTABLE_PATH specified does not exist');
		}

		const isWin = platform() === 'win32';
		const candidates: string[] = [];

		if (isWin) {
			// Windows paths using proper path.join
			const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
			const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
			const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');

			candidates.push(
				// Google Chrome
				join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
				join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
				join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),

				// Microsoft Edge
				join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
				join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),

				// Chromium
				join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
				join(programFilesX86, 'Chromium', 'Application', 'chrome.exe'),

				// Brave
				join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
				join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
			);
		} else {
			// Linux/Mac paths
			candidates.push(
				'/usr/bin/google-chrome-stable',
				'/usr/bin/google-chrome',
				'/usr/bin/chromium-browser',
				'/usr/bin/chromium',
				'/snap/bin/chromium',
				'/usr/bin/microsoft-edge',
				'/usr/bin/microsoft-edge-stable',
				// WSL accessing Windows Chrome
				'/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
				'/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
				'/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe',
				'/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
			);
		}

		// Check each candidate path
		for (const candidate of candidates) {
			if (existsSync(candidate)) {
				logger.info({ path: candidate }, 'Browser executable found');
				return candidate;
			}
		}

		// Try to use puppeteer's default executable
		try {
			const moduleName = 'puppeteer';
			const puppeteerModule = (await import(moduleName).catch(() => null)) as
				| { executablePath?: () => string }
				| null;
			if (puppeteerModule?.executablePath) {
				const puppeteerPath = puppeteerModule.executablePath();
				if (existsSync(puppeteerPath)) {
					return puppeteerPath;
				}
			}
		} catch (error) {
			logger.debug({ error }, 'Failed to load optional puppeteer module');
		}

		logger.warn('No browser executable found. Please install Chrome or Edge.');
		return undefined;
	}

	async getStatus(): Promise<{ ready: boolean; connected: boolean }> {
		// Considera conectado se está pronto OU se tem QR code (aguardando scan)
		const hasQRCode = this.lastQRCode !== null;
		const isConnected = this.isReady || (this.client !== null && hasQRCode);

		return {
			ready: this.isReady,
			connected: isConnected
		};
	}

	isClientReady(): boolean {
		return this.isReady;
	}

	isInitializingClient(): boolean {
		return this.isInitializing;
	}

	getQRCode(): string | null {
		return this.lastQRCode;
	}

	async disconnect(): Promise<void> {
		// Cancelar retry se estiver agendado
		if (this.retryTimeout) {
			clearTimeout(this.retryTimeout);
			this.retryTimeout = null;
		}

		if (this.client) {
			try {
				// Limpar todos os event listeners antes de destruir
				this.client.removeAllListeners();
				await this.client.destroy();
			} catch (error) {
				logger.debug({ error }, 'Error destroying client during disconnect');
			}
			this.client = null;
			this.isReady = false;
			this.lastQRCode = null;
			this.retryCount = 0;
			logger.info('WhatsApp client disconnected');
		}
	}

	getClient(): WhatsAppClient | null {
		return this.client;
	}
}
