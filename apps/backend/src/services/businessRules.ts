import { PrismaClient, Contact } from '@prisma/client';
import { envValidator } from '../config/env.validator.js';
import { systemConfigService } from './systemConfigService.js';
import type { SystemConfigValues } from './systemConfigService.js';
import { createLogger } from './logger.js';

const logger = createLogger('business-rules');

export type BusinessHours = {
	start: string; // Format: "HH:MM"
	end: string; // Format: "HH:MM"
	timezone: string; // IANA timezone (e.g., "America/Sao_Paulo")
};

export type TimeInfo = {
	currentTime: string;
	isWeekend: boolean;
	dayOfWeek: string;
	date: string;
};

export class BusinessRules {
	private prisma: PrismaClient;
	private businessHours: BusinessHours | null = null;
	private optOutKeywords: string[] = [
		'PARAR', 'SAIR', 'CANCELAR', 'STOP', 'UNSUBSCRIBE',
		'DESCADASTRAR', 'REMOVER', 'EXCLUIR'
	];
	private firstContactEnabled = false;
	private firstContactMessage: string | null = null;
	private unsubscribeConfig?: () => void;

	constructor(prisma: PrismaClient) {
		this.prisma = prisma;
		envValidator.validate();

		this.applyConfig(systemConfigService.getConfig());
		this.unsubscribeConfig = systemConfigService.subscribe((cfg) => {
			this.applyConfig(cfg);
			logger.info('Business rules config updated');
		});

	}

	private applyConfig(config: SystemConfigValues): void {
		this.businessHours = {
			start: config.businessHoursStart,
			end: config.businessHoursEnd,
			timezone: config.timezone
		};
		this.firstContactEnabled = config.firstContactEnabled ?? false;
		this.firstContactMessage = (config.firstContactMessage || '').trim() || null;
	}

	/**
	 * Get current time in configured timezone
	 */
	private getCurrentTimeInTimezone(): TimeInfo {
		try {
			// Create date in specified timezone
			const now = new Date();
			const formatter = new Intl.DateTimeFormat('pt-BR', {
				timeZone: this.businessHours?.timezone || 'America/Sao_Paulo',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});

			const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
				timeZone: this.businessHours?.timezone || 'America/Sao_Paulo',
				weekday: 'long',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});

			const timeParts = formatter.formatToParts(now);
			const hour = timeParts.find(p => p.type === 'hour')?.value || '00';
			const minute = timeParts.find(p => p.type === 'minute')?.value || '00';
			const currentTime = `${hour}:${minute}`;

			const dateString = dateFormatter.format(now);
			const dayOfWeek = now.toLocaleDateString('pt-BR', {
				timeZone: this.businessHours?.timezone || 'America/Sao_Paulo',
				weekday: 'long'
			});

			// Check if weekend (Saturday = 6, Sunday = 0)
			const dayIndex = now.getDay();
			const isWeekend = dayIndex === 0 || dayIndex === 6;

			return {
				currentTime,
				isWeekend,
				dayOfWeek,
				date: dateString
			};
		} catch (error) {
			logger.error({ error }, 'Error getting time in timezone, falling back to local time');
			// Fallback to local time if timezone operations fail
			const now = new Date();
			const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
			const dayIndex = now.getDay();
			const isWeekend = dayIndex === 0 || dayIndex === 6;

			return {
				currentTime,
				isWeekend,
				dayOfWeek: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][dayIndex],
				date: now.toLocaleDateString('pt-BR')
			};
		}
	}

	/**
	 * Check if message is an opt-out request
	 */
	isOptOutMessage(text: string): boolean {
		const normalized = text.trim().toUpperCase();
		return this.optOutKeywords.some(keyword => normalized.includes(keyword));
	}

	/**
	 * Process opt-out request for a contact
	 */
	async processOptOut(contactId: string): Promise<void> {
		await this.prisma.contact.update({
			where: { id: contactId },
			data: { optIn: false, updatedAt: new Date() }
		});

		logger.info({ contactId }, 'Contact opted out');
	}

	/**
	 * Check if contact is opted in
	 */
	async isContactOptedIn(contactId: string): Promise<boolean> {
		const contact = await this.prisma.contact.findUnique({
			where: { id: contactId }
		});

		return contact?.optIn ?? false;
	}

	/**
	 * Check if current time is within business hours
	 * Supports weekends and holidays configuration
	 */
	isWithinBusinessHours(skipWeekends: boolean = true): boolean {
		if (!this.businessHours) {
			return true; // No business hours restriction
		}

		const timeInfo = this.getCurrentTimeInTimezone();

		// Skip weekends if configured
		if (skipWeekends && timeInfo.isWeekend) {
			logger.debug({ dayOfWeek: timeInfo.dayOfWeek }, 'Outside business hours: weekend');
			return false;
		}

		const { start, end } = this.businessHours;
		const { currentTime } = timeInfo;

		// Handle overnight business hours (e.g., 22:00-02:00)
		let isWithinHours: boolean;
		if (end < start) {
			// Overnight hours
			isWithinHours = currentTime >= start || currentTime <= end;
		} else {
			// Normal hours
			isWithinHours = currentTime >= start && currentTime <= end;
		}

		logger.debug({
			currentTime: timeInfo.currentTime,
			businessHours: this.businessHours,
			isWithinHours,
			timezone: this.businessHours.timezone,
			dayOfWeek: timeInfo.dayOfWeek
		}, 'Business hours check');

		return isWithinHours;
	}

	/**
	 * Get outside business hours message with timezone info
	 */
	getOutsideBusinessHoursMessage(): string {
		if (!this.businessHours) {
			return 'Desculpe, não estamos disponíveis no momento. Retornaremos em breve!';
		}

		const timeInfo = this.getCurrentTimeInTimezone();

		if (timeInfo.isWeekend) {
			return `Olá! Nosso atendimento funciona de segunda a sexta, das ${this.businessHours.start} às ${this.businessHours.end}. ` +
				`Retornaremos na segunda-feira. Obrigado pela compreensão!`;
		}

		return `Olá! Nosso horário de atendimento é das ${this.businessHours.start} às ${this.businessHours.end}` +
			` (${this.businessHours.timezone}). ` +
			`Agora são ${timeInfo.currentTime}. Retornaremos em breve. Obrigado!`;
	}

	/**
	 * Check if this is the first interaction with a contact
	 */
	async isFirstContact(contactId: string): Promise<boolean> {
		const messageCount = await this.prisma.message.count({
			where: { contactId }
		});

		return messageCount <= 1; // Only the current incoming message
	}

	/**
	 * Get welcome message for first contact
	 */
	getFirstContactMessage(): string {
		return this.firstContactMessage || '';
	}

	/**
	 * Set custom first contact message
	 */
	setFirstContactMessage(message: string): void {
		this.firstContactMessage = message;
	}

	setFirstContactEnabled(enabled: boolean): void {
		this.firstContactEnabled = enabled;
	}

	/**
	 * Check if message contains prohibited content
	 */
	hasProhibitedContent(text: string): boolean {
		// Add your prohibited content checks here
		// This is a placeholder for content moderation
		const prohibitedPatterns: string[] = [
			// Add patterns as needed
		];

		const normalized = text.toLowerCase();
		return prohibitedPatterns.some(pattern => normalized.includes(pattern));
	}

	/**
	 * Get business rules summary for logging
	 */
	getBusinessRulesSummary(): object {
		const timeInfo = this.getCurrentTimeInTimezone();
		return {
			businessHours: this.businessHours,
			currentTimeInfo: timeInfo,
			isWithinHours: this.isWithinBusinessHours(),
			optOutKeywords: this.optOutKeywords.length,
			hasFirstContactMessage: !!this.firstContactMessage
		};
	}

	/**
	 * Aliases and helpers expected by API/tests
	 */
	getBusinessHours(): BusinessHours | null {
		return this.businessHours;
	}

	setBusinessHours(start: string, end: string, timezone?: string): void {
		this.updateBusinessHours(start, end, timezone);
	}

	getFirstContactWelcome(): string {
		return this.getFirstContactMessage();
	}

	setFirstContactWelcome(message: string): void {
		this.setFirstContactMessage(message);
	}

	/**
	 * Update business hours dynamically
	 */
	updateBusinessHours(start: string, end: string, timezone?: string): void {
		this.businessHours = {
			start,
			end,
			timezone: timezone || this.businessHours?.timezone || 'America/Sao_Paulo'
		};

		logger.info({ businessHours: this.businessHours }, 'Business hours updated');
	}

	/**
	 * Decide if we should automate a contact based on rules
	 */
	async shouldAutomateContact(
		contactId: string,
		incomingText: string
	): Promise<{ shouldAutomate: boolean; action: string; responseMessage?: string }> {
		// Opt-out takes precedence
		if (this.isOptOutMessage(incomingText)) {
			await this.processOptOut(contactId);
			return {
				shouldAutomate: false,
				action: 'opt_out_processed',
				responseMessage:
					'Você foi removido da nossa lista de contatos. Para voltar, responda VOLTAR.'
			};
		}

		// Check contact opt-in
		const optedIn = await this.isContactOptedIn(contactId);
		if (!optedIn) {
			return { shouldAutomate: false, action: 'contact_opted_out' };
		}

		// Basic content moderation
		if (this.hasProhibitedContent(incomingText)) {
			return { shouldAutomate: false, action: 'prohibited_content' };
		}

		// Business hours: não bloqueie automação; opcionalmente poderia responder, mas seguimos o fluxo
		if (!this.isWithinBusinessHours(true)) {
			return {
				shouldAutomate: true,
				action: 'outside_business_hours_continue',
				// Para evitar spam/retentativa em horário indisponível, não forçamos resposta automática aqui.
				// Se quiser avisar fora do horário, configure um gatilho/fluxo específico.
				responseMessage: undefined
			};
		}

		// First contact welcome
		// First contact welcome (only if enabled and message provided)
		if (this.firstContactEnabled && this.getFirstContactMessage()) {
			if (await this.isFirstContact(contactId)) {
				return {
					shouldAutomate: true,
					action: 'first_contact_welcome',
					responseMessage: this.getFirstContactMessage()
				};
			}
		}

		return { shouldAutomate: true, action: 'normal_automation' };
	}

	/**
	 * Add custom opt-out keyword
	 */
	addOptOutKeyword(keyword: string): void {
		const normalized = keyword.trim().toUpperCase();
		if (!this.optOutKeywords.includes(normalized)) {
			this.optOutKeywords.push(normalized);
			logger.info({ keyword: normalized }, 'Added opt-out keyword');
		}
	}
}
