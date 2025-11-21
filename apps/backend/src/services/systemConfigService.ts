import { PrismaClient, SystemConfig } from '@prisma/client';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createLogger } from './logger.js';

const logger = createLogger('system-config');

export type SystemConfigValues = {
	jwtSecret: string;
	defaultAdminEmail: string;
	defaultAdminPassword: string;
	skipWhatsapp: boolean;
	puppeteerExecutablePath: string | null;
	rateMaxPerMin: number;
	ratePerContactPer5Min: number;
	businessHoursStart: string;
	businessHoursEnd: string;
	timezone: string;
	wsPort: number;
	wsPath: string;
	humanizerMinDelayMs: number;
	humanizerMaxDelayMs: number;
	humanizerMinTypingMs: number;
	humanizerMaxTypingMs: number;
	firstContactEnabled: boolean;
	firstContactMessage: string | null;
	cbWindowMode: string;
	cbMinAttempts: number;
	cbFailRateOpen: number;
	cbProbeIntervalSec: number;
	cbProbeSuccessClose: number;
	cbProbeSamples: number;
	cbCooldownInitialSec: number;
	cbCooldownMaxSec: number;
	windowsTempDir: string | null;
	windowsLongPathSupport: boolean;
	updatedAt: Date;
};

export type SystemConfigMasked = Omit<SystemConfigValues, 'jwtSecret' | 'defaultAdminPassword'> & {
	jwtSecretMasked: string | null;
	defaultAdminPasswordMasked: string | null;
};

export type SystemConfigUpdateInput = Partial<Omit<SystemConfigValues, 'updatedAt'>> & {
	jwtSecret?: string;
	defaultAdminPassword?: string;
	regenerateJwtSecret?: boolean;
	regenerateAdminPassword?: boolean;
	firstContactEnabled?: boolean;
	firstContactMessage?: string | null;
};

type Listener = (config: SystemConfigValues) => void;

const configUpdateSchema = z
	.object({
		jwtSecret: z.string().min(32).optional(),
		defaultAdminEmail: z.string().email().optional(),
		defaultAdminPassword: z.string().min(4).optional(),
		skipWhatsapp: z.boolean().optional(),
		puppeteerExecutablePath: z
			.string()
			.min(1)
			.transform((val) => val.trim())
			.optional()
			.nullable(),
		rateMaxPerMin: z.coerce.number().int().min(1).max(100).optional(),
		ratePerContactPer5Min: z.coerce.number().int().min(1).max(20).optional(),
		businessHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
		businessHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
		timezone: z.string().min(1).optional(),
		wsPort: z.coerce.number().int().min(1000).max(65535).optional(),
		wsPath: z.string().min(1).optional(),
		humanizerMinDelayMs: z.coerce.number().int().min(0).optional(),
		humanizerMaxDelayMs: z.coerce.number().int().min(0).optional(),
		humanizerMinTypingMs: z.coerce.number().int().min(0).optional(),
		humanizerMaxTypingMs: z.coerce.number().int().min(0).optional(),
		cbWindowMode: z.string().min(1).optional(),
		cbMinAttempts: z.coerce.number().int().min(1).optional(),
		cbFailRateOpen: z.coerce.number().min(0).max(1).optional(),
		cbProbeIntervalSec: z.coerce.number().int().min(1).optional(),
		cbProbeSuccessClose: z.coerce.number().min(0).max(1).optional(),
		cbProbeSamples: z.coerce.number().int().min(1).optional(),
		cbCooldownInitialSec: z.coerce.number().int().min(1).optional(),
		cbCooldownMaxSec: z.coerce.number().int().min(1).optional(),
		windowsTempDir: z
			.string()
			.min(1)
			.transform((val) => val.trim())
			.optional()
			.nullable(),
		windowsLongPathSupport: z.boolean().optional(),
		firstContactEnabled: z.boolean().optional(),
		firstContactMessage: z
			.string()
			.max(1_000)
			.transform((val) => val.trim())
			.optional()
			.nullable(),
		regenerateJwtSecret: z.boolean().optional(),
		regenerateAdminPassword: z.boolean().optional()
	})
	.superRefine((data, ctx) => {
		if ((data.businessHoursStart && !data.businessHoursEnd) || (!data.businessHoursStart && data.businessHoursEnd)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'É necessário informar início e fim do horário comercial',
				path: ['businessHours']
			});
		}

		if (
			typeof data.humanizerMinDelayMs === 'number' &&
			typeof data.humanizerMaxDelayMs === 'number' &&
			data.humanizerMinDelayMs > data.humanizerMaxDelayMs
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Delay mínimo não pode ser maior que o máximo',
				path: ['humanizerMinDelayMs']
			});
		}

		if (
			typeof data.humanizerMinTypingMs === 'number' &&
			typeof data.humanizerMaxTypingMs === 'number' &&
			data.humanizerMinTypingMs > data.humanizerMaxTypingMs
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Tempo mínimo de digitação não pode ser maior que o máximo',
				path: ['humanizerMinTypingMs']
			});
		}

		if (
			typeof data.cbCooldownInitialSec === 'number' &&
			typeof data.cbCooldownMaxSec === 'number' &&
			data.cbCooldownInitialSec > data.cbCooldownMaxSec
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Cooldown inicial não pode ser maior que o máximo',
				path: ['cbCooldownInitialSec']
			});
		}
	});

const SECRET_MASK = '••••••••';

function buildCryptoKey(rawKey: string): Buffer {
	if (!rawKey || rawKey.length < 16) {
		throw new Error('CONFIG_CRYPTO_KEY deve possuir pelo menos 16 caracteres');
	}
	return crypto.createHash('sha256').update(rawKey).digest();
}

function encryptSecret(plain: string | null | undefined, key: Buffer): string | null {
	if (!plain) {
		return null;
	}
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

function decryptSecret(payload: string | null | undefined, key: Buffer): string | null {
	if (!payload) {
		return null;
	}
	const [ivB64, tagB64, dataB64] = payload.split('.');
	if (!ivB64 || !tagB64 || !dataB64) {
		return null;
	}
	const iv = Buffer.from(ivB64, 'base64');
	const tag = Buffer.from(tagB64, 'base64');
	const data = Buffer.from(dataB64, 'base64');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
	return decrypted.toString('utf8');
}

function maskedSecret(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	return SECRET_MASK;
}

export class SystemConfigService {
	private prisma: PrismaClient | null = null;
	private cryptoKey: Buffer | null = null;
	private config: SystemConfigValues | null = null;
	private listeners = new Set<Listener>();

	async initialize(prisma: PrismaClient, options: { cryptoKey: string; defaults: SystemConfigValues }): Promise<void> {
		this.prisma = prisma;
		this.cryptoKey = buildCryptoKey(options.cryptoKey);

		const existing = await prisma.systemConfig.findUnique({ where: { id: 'global' } });

		if (!existing) {
			await prisma.systemConfig.create({
				data: this.mapValuesToRecord(options.defaults)
			});
			logger.info('SystemConfig inicial criado com valores padrão');
		}

		const configRecord = await prisma.systemConfig.findUnique({ where: { id: 'global' } });
		if (!configRecord) {
			throw new Error('Não foi possível inicializar SystemConfig');
		}

		this.config = this.mapRecordToValues(configRecord, options.defaults);

		if (this.config.skipWhatsapp !== options.defaults.skipWhatsapp && options.defaults.skipWhatsapp === false) {
			logger.warn(
				'WhatsApp estava desativado no banco de dados, porém o .env exige execução. Reativando automaticamente...'
			);
			await this.updateConfig({ skipWhatsapp: false });
		}

		const LEGACY_WS_PORT = 3002;
		if (existing && this.config.wsPort === LEGACY_WS_PORT && options.defaults.wsPort !== LEGACY_WS_PORT) {
			await this.updateConfig({ wsPort: options.defaults.wsPort });
		}
	}

	getConfig(): SystemConfigValues {
		if (!this.config) {
			throw new Error('SystemConfigService não inicializado');
		}
		return { ...this.config };
	}

	getMaskedConfig(): SystemConfigMasked {
		const config = this.getConfig();
		return {
			jwtSecretMasked: maskedSecret(config.jwtSecret),
			defaultAdminPasswordMasked: maskedSecret(config.defaultAdminPassword),
			defaultAdminEmail: config.defaultAdminEmail,
			skipWhatsapp: config.skipWhatsapp,
			puppeteerExecutablePath: config.puppeteerExecutablePath,
			rateMaxPerMin: config.rateMaxPerMin,
			ratePerContactPer5Min: config.ratePerContactPer5Min,
			businessHoursStart: config.businessHoursStart,
			businessHoursEnd: config.businessHoursEnd,
			timezone: config.timezone,
			wsPort: config.wsPort,
			wsPath: config.wsPath,
			humanizerMinDelayMs: config.humanizerMinDelayMs,
			humanizerMaxDelayMs: config.humanizerMaxDelayMs,
			humanizerMinTypingMs: config.humanizerMinTypingMs,
			humanizerMaxTypingMs: config.humanizerMaxTypingMs,
			cbWindowMode: config.cbWindowMode,
			cbMinAttempts: config.cbMinAttempts,
			cbFailRateOpen: config.cbFailRateOpen,
			cbProbeIntervalSec: config.cbProbeIntervalSec,
			cbProbeSuccessClose: config.cbProbeSuccessClose,
			cbProbeSamples: config.cbProbeSamples,
			cbCooldownInitialSec: config.cbCooldownInitialSec,
			cbCooldownMaxSec: config.cbCooldownMaxSec,
			windowsTempDir: config.windowsTempDir,
			windowsLongPathSupport: config.windowsLongPathSupport,
			firstContactEnabled: config.firstContactEnabled,
			firstContactMessage: config.firstContactMessage,
			updatedAt: config.updatedAt
		};
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	async updateConfig(update: SystemConfigUpdateInput, actorUserId?: string): Promise<SystemConfigValues> {
		if (!this.prisma || !this.cryptoKey) {
			throw new Error('SystemConfigService não inicializado');
		}

		const parsed = configUpdateSchema.parse(update);

		const current = this.getConfig();
		const nextValues: SystemConfigValues = {
			...current,
			...parsed,
			jwtSecret:
				parsed.regenerateJwtSecret || typeof parsed.jwtSecret === 'string'
					? parsed.jwtSecret || crypto.randomBytes(48).toString('hex')
					: current.jwtSecret,
			defaultAdminPassword:
				parsed.regenerateAdminPassword || typeof parsed.defaultAdminPassword === 'string'
					? parsed.defaultAdminPassword || crypto.randomBytes(16).toString('base64url')
					: current.defaultAdminPassword,
			puppeteerExecutablePath:
				parsed.puppeteerExecutablePath === undefined ? current.puppeteerExecutablePath : parsed.puppeteerExecutablePath,
			windowsTempDir: parsed.windowsTempDir === undefined ? current.windowsTempDir : parsed.windowsTempDir,
			firstContactEnabled:
				parsed.firstContactEnabled === undefined ? current.firstContactEnabled : parsed.firstContactEnabled,
			firstContactMessage:
				parsed.firstContactMessage === undefined
					? current.firstContactMessage
					: parsed.firstContactMessage?.trim() || null,
			humanizerMinDelayMs:
				parsed.humanizerMinDelayMs === undefined ? current.humanizerMinDelayMs : parsed.humanizerMinDelayMs,
			humanizerMaxDelayMs:
				parsed.humanizerMaxDelayMs === undefined ? current.humanizerMaxDelayMs : parsed.humanizerMaxDelayMs,
			humanizerMinTypingMs:
				parsed.humanizerMinTypingMs === undefined ? current.humanizerMinTypingMs : parsed.humanizerMinTypingMs,
			humanizerMaxTypingMs:
				parsed.humanizerMaxTypingMs === undefined ? current.humanizerMaxTypingMs : parsed.humanizerMaxTypingMs,
			cbCooldownInitialSec:
				parsed.cbCooldownInitialSec === undefined ? current.cbCooldownInitialSec : parsed.cbCooldownInitialSec,
			cbCooldownMaxSec:
				parsed.cbCooldownMaxSec === undefined ? current.cbCooldownMaxSec : parsed.cbCooldownMaxSec,
			updatedAt: new Date()
		};

		await this.prisma.$transaction(async (tx) => {
			const oldRecord = await tx.systemConfig.findUnique({ where: { id: 'global' } });
			if (!oldRecord) {
				throw new Error('Registro de configuração global não encontrado');
			}

			await tx.systemConfig.update({
				where: { id: 'global' },
				data: this.mapValuesToRecord(nextValues)
			});

			const changes: Record<string, { old: unknown; new: unknown }> = {};

			for (const key of Object.keys(nextValues) as Array<keyof SystemConfigValues>) {
				if (key === 'updatedAt') continue;
				const beforeValue = (current as any)[key];
				const afterValue = (nextValues as any)[key];
				if (beforeValue !== afterValue) {
					const isSecret = key === 'jwtSecret' || key === 'defaultAdminPassword';
					changes[key] = {
						old: isSecret ? SECRET_MASK : beforeValue,
						new: isSecret ? SECRET_MASK : afterValue
					};
				}
			}

			if (Object.keys(changes).length > 0) {
				await tx.configAudit.create({
					data: {
						configId: 'global',
						actorUserId: actorUserId ?? null,
						// Prisma espera um JSON serializável; nosso objeto simples atende,
						// mas fazemos o cast explícito para satisfazer o tipo.
						changes: changes as any
					}
				});
			}
		});

		this.config = nextValues;
		for (const listener of this.listeners) {
			try {
				listener({ ...nextValues });
			} catch (error) {
				logger.warn({ error }, 'Listener de configuração falhou');
			}
		}

		logger.info('Configurações atualizadas com sucesso');
		return this.getConfig();
	}

	private mapValuesToRecord(values: SystemConfigValues): SystemConfig {
		if (!this.cryptoKey) {
			throw new Error('SystemConfigService não inicializado');
		}

		return {
			id: 'global',
			jwtSecretEncrypted: encryptSecret(values.jwtSecret, this.cryptoKey),
			defaultAdminEmail: values.defaultAdminEmail,
			defaultAdminPasswordEncrypted: encryptSecret(values.defaultAdminPassword, this.cryptoKey),
			skipWhatsapp: values.skipWhatsapp,
			puppeteerExecutablePath: values.puppeteerExecutablePath,
			rateMaxPerMin: values.rateMaxPerMin,
			ratePerContactPer5Min: values.ratePerContactPer5Min,
			businessHoursStart: values.businessHoursStart,
			businessHoursEnd: values.businessHoursEnd,
			timezone: values.timezone,
			wsPort: values.wsPort,
			wsPath: values.wsPath,
			humanizerMinDelayMs: values.humanizerMinDelayMs,
			humanizerMaxDelayMs: values.humanizerMaxDelayMs,
			humanizerMinTypingMs: values.humanizerMinTypingMs,
			humanizerMaxTypingMs: values.humanizerMaxTypingMs,
			cbWindowMode: values.cbWindowMode,
			cbMinAttempts: values.cbMinAttempts,
			cbFailRateOpen: values.cbFailRateOpen,
			cbProbeIntervalSec: values.cbProbeIntervalSec,
			cbProbeSuccessClose: values.cbProbeSuccessClose,
			cbProbeSamples: values.cbProbeSamples,
			cbCooldownInitialSec: values.cbCooldownInitialSec,
			cbCooldownMaxSec: values.cbCooldownMaxSec,
			windowsTempDir: values.windowsTempDir,
			windowsLongPathSupport: values.windowsLongPathSupport,
			firstContactEnabled: values.firstContactEnabled,
			firstContactMessage: values.firstContactMessage,
			updatedAt: values.updatedAt
		};
	}

	private mapRecordToValues(record: SystemConfig, defaults: SystemConfigValues): SystemConfigValues {
		if (!this.cryptoKey) {
			throw new Error('SystemConfigService não inicializado');
		}

		return {
			jwtSecret: decryptSecret(record.jwtSecretEncrypted, this.cryptoKey) || defaults.jwtSecret,
			defaultAdminEmail: record.defaultAdminEmail || defaults.defaultAdminEmail,
			defaultAdminPassword:
				decryptSecret(record.defaultAdminPasswordEncrypted, this.cryptoKey) || defaults.defaultAdminPassword,
			skipWhatsapp: record.skipWhatsapp,
			puppeteerExecutablePath: record.puppeteerExecutablePath,
			rateMaxPerMin: record.rateMaxPerMin,
			ratePerContactPer5Min: record.ratePerContactPer5Min,
			businessHoursStart: record.businessHoursStart,
			businessHoursEnd: record.businessHoursEnd,
			timezone: record.timezone,
			wsPort: record.wsPort,
			wsPath: record.wsPath,
			humanizerMinDelayMs: record.humanizerMinDelayMs,
			humanizerMaxDelayMs: record.humanizerMaxDelayMs,
			humanizerMinTypingMs: record.humanizerMinTypingMs,
			humanizerMaxTypingMs: record.humanizerMaxTypingMs,
			cbWindowMode: record.cbWindowMode,
			cbMinAttempts: record.cbMinAttempts,
			cbFailRateOpen: record.cbFailRateOpen,
			cbProbeIntervalSec: record.cbProbeIntervalSec,
			cbProbeSuccessClose: record.cbProbeSuccessClose,
			cbProbeSamples: record.cbProbeSamples,
			cbCooldownInitialSec: record.cbCooldownInitialSec,
			cbCooldownMaxSec: record.cbCooldownMaxSec,
			windowsTempDir: record.windowsTempDir,
			windowsLongPathSupport: record.windowsLongPathSupport,
			firstContactEnabled: record.firstContactEnabled ?? defaults.firstContactEnabled,
			firstContactMessage: record.firstContactMessage ?? defaults.firstContactMessage,
			updatedAt: record.updatedAt
		};
	}
}

export const systemConfigService = new SystemConfigService();

