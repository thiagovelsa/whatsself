import { Client } from 'whatsapp-web.js';
import type { SystemConfigValues } from './systemConfigService.js';
import { createLogger } from './logger.js';

const logger = createLogger('humanizer');

export type HumanizerConfig = {
	typingDurationMin: number; // Minimum typing duration in seconds
	typingDurationMax: number; // Maximum typing duration in seconds
	randomDelayMin: number; // Minimum random delay in seconds
	randomDelayMax: number; // Maximum random delay in seconds
	enableTypingIndicator: boolean;
	enableRandomDelay: boolean;
};

export class Humanizer {
	private config: HumanizerConfig;
	private whatsappClient: Client | null = null;
	private unsubscribeConfig?: () => void;

	constructor(options?: {
		initialConfig?: SystemConfigValues;
		subscribe?: (listener: (config: SystemConfigValues) => void) => () => void;
	}) {
		const baseConfig = options?.initialConfig;
		this.config = {
			typingDurationMin: baseConfig ? baseConfig.humanizerMinTypingMs / 1000 : 1.5,
			typingDurationMax: baseConfig ? baseConfig.humanizerMaxTypingMs / 1000 : 3.5,
			randomDelayMin: baseConfig ? baseConfig.humanizerMinDelayMs / 1000 : 3,
			randomDelayMax: baseConfig ? baseConfig.humanizerMaxDelayMs / 1000 : 7,
			enableTypingIndicator: true,
			enableRandomDelay: true
		};

		if (options?.subscribe) {
			this.unsubscribeConfig = options.subscribe((cfg) => {
				this.config = {
					...this.config,
					typingDurationMin: cfg.humanizerMinTypingMs / 1000,
					typingDurationMax: cfg.humanizerMaxTypingMs / 1000,
					randomDelayMin: cfg.humanizerMinDelayMs / 1000,
					randomDelayMax: cfg.humanizerMaxDelayMs / 1000
				};
				logger.info({ config: this.config }, 'Humanizer config updated');
			});
		}

		logger.info({ config: this.config }, 'Humanizer initialized');
	}

	setWhatsAppClient(client: Client): void {
		this.whatsappClient = client;
	}

	/**
	 * Apply humanization before sending a message
	 * @param phone - Phone number to send to
	 * @param text - Message text (used to calculate typing duration)
	 */
	async beforeSend(phone: string, text: string): Promise<void> {
		const tasks: Promise<void>[] = [];

		// Random delay before starting
		if (this.config.enableRandomDelay) {
			tasks.push(this.randomDelay());
		}

		// Typing indicator
		if (this.config.enableTypingIndicator && this.whatsappClient) {
			tasks.push(this.showTypingIndicator(phone, text));
		}

		await Promise.all(tasks);
	}

	/**
	 * Show typing indicator for a humanized duration
	 */
	private async showTypingIndicator(phone: string, text: string): Promise<void> {
		if (!this.whatsappClient) return;

		try {
			const numberId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
			const chat = await this.whatsappClient.getChatById(numberId);

			// Calculate typing duration based on text length
			const baseTypingDuration = this.randomBetween(
				this.config.typingDurationMin,
				this.config.typingDurationMax
			);

			// Adjust for text length (longer text = longer typing)
			const textLengthFactor = Math.min(text.length / 100, 2); // Max 2x for long texts
			const typingDuration = baseTypingDuration * (1 + textLengthFactor * 0.5);

			logger.debug({
				phone,
				textLength: text.length,
				typingDuration: typingDuration.toFixed(2)
			}, 'Showing typing indicator');

			// Send typing state
			await chat.sendStateTyping();

			// Wait for typing duration
			await this.sleep(typingDuration * 1000);

			// Clear typing state (optional - it clears automatically on message send)
			await chat.clearState();
		} catch (error) {
			logger.warn({ error, phone }, 'Failed to show typing indicator');
			// Continue anyway - not critical
		}
	}

	/**
	 * Add a random delay to simulate human behavior
	 */
	private async randomDelay(): Promise<void> {
		const delay = this.randomBetween(
			this.config.randomDelayMin,
			this.config.randomDelayMax
		);

		logger.debug({ delay: delay.toFixed(2) }, 'Adding random delay');
		await this.sleep(delay * 1000);
	}

	/**
	 * Get a random number between min and max
	 */
	private randomBetween(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Calculate estimated time before message is sent
	 * Useful for UI feedback
	 */
	estimateDelay(text: string): number {
		let total = 0;

		if (this.config.enableRandomDelay) {
			total += (this.config.randomDelayMin + this.config.randomDelayMax) / 2;
		}

		if (this.config.enableTypingIndicator) {
			const baseTyping = (this.config.typingDurationMin + this.config.typingDurationMax) / 2;
			const textLengthFactor = Math.min(text.length / 100, 2);
			total += baseTyping * (1 + textLengthFactor * 0.5);
		}

		return total;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): HumanizerConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<HumanizerConfig>): void {
		this.config = { ...this.config, ...config };
		logger.info({ config: this.config }, 'Humanizer config updated');
	}
}
