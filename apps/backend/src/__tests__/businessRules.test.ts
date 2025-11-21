import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BusinessRules } from '../services/businessRules.js';
import { testPrisma } from './setup.js';
import { MessageDirection, MessageStatus } from '@prisma/client';

describe('BusinessRules', () => {
	let businessRules: BusinessRules;

	beforeEach(async () => {
		businessRules = new BusinessRules(testPrisma);
		businessRules.setBusinessHours('09:00', '18:00');

		await testPrisma.message.deleteMany();
		await testPrisma.contact.deleteMany();
	});

	afterEach(async () => {
		await testPrisma.message.deleteMany();
		await testPrisma.contact.deleteMany();
	});

	describe('Opt-out handling', () => {
		it('should detect PARAR keyword', () => {
			expect(businessRules.isOptOutMessage('PARAR')).toBe(true);
			expect(businessRules.isOptOutMessage('parar')).toBe(true);
		});

		it('should opt-out the contact when processOptOut is called', async () => {
			const contact = await testPrisma.contact.create({
				data: {
					phone: '5511999999999',
					name: 'Test Contact'
				}
			});

			await businessRules.processOptOut(contact.id);

			const updated = await testPrisma.contact.findUnique({
				where: { id: contact.id }
			});

			expect(updated?.optIn).toBe(false);
		});
	});

	describe('Business hours', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should allow automation during business hours', () => {
			vi.setSystemTime(new Date('2024-01-15T12:00:00'));
			expect(businessRules.isWithinBusinessHours()).toBe(true);
		});

		it('should block before business hours', () => {
			vi.setSystemTime(new Date('2024-01-15T08:00:00'));
			expect(businessRules.isWithinBusinessHours()).toBe(false);
		});

		it('should block after business hours', () => {
			vi.setSystemTime(new Date('2024-01-15T19:00:00'));
			expect(businessRules.isWithinBusinessHours()).toBe(false);
		});
	});

	describe('Automation decisions', () => {
		it('should skip contacts that opted out', async () => {
			const contact = await testPrisma.contact.create({
				data: {
					phone: '5511999999999',
					name: 'Test Contact',
					optIn: false
				}
			});

			const result = await businessRules.shouldAutomateContact(contact.id, 'Olá');
			expect(result.shouldAutomate).toBe(false);
		expect(result.action).toBe('contact_opted_out');
		});

		it('should respond with welcome message on first contact', async () => {
			vi.useFakeTimers();
			try {
				vi.setSystemTime(new Date('2024-01-15T12:00:00'));
				businessRules.setFirstContactEnabled(true);
				businessRules.setFirstContactWelcome('Olá! Como posso ajudar?');

				const contact = await testPrisma.contact.create({
					data: {
						phone: '5511999999999',
						name: 'Test Contact'
					}
				});

				await testPrisma.message.create({
					data: {
						contactId: contact.id,
						direction: MessageDirection.inbound,
						status: MessageStatus.delivered,
						content: 'Primeira mensagem'
					}
				});

				const result = await businessRules.shouldAutomateContact(contact.id, 'Oi');

				expect(result.shouldAutomate).toBe(true);
			expect(result.action).toBe('first_contact_welcome');
				expect(result.responseMessage).toBe(businessRules.getFirstContactWelcome());

				businessRules.setFirstContactWelcome('Oi! Como posso ajudar?');
				const custom = await businessRules.shouldAutomateContact(contact.id, 'Oi de novo');
				expect(custom.responseMessage).toBe('Oi! Como posso ajudar?');
			} finally {
				vi.useRealTimers();
			}
		});

		it('should continue automation outside business hours (no auto-reply)', async () => {
			vi.useFakeTimers();
			try {
				vi.setSystemTime(new Date('2024-01-15T02:00:00'));

				const contact = await testPrisma.contact.create({
					data: {
						phone: '5511999999999',
						name: 'Test Contact'
					}
				});

				const result = await businessRules.shouldAutomateContact(contact.id, 'Quero ajuda');

				expect(result.shouldAutomate).toBe(true);
				expect(result.action).toBe('outside_business_hours_continue');
				expect(result.responseMessage).toBeUndefined();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should opt-out when opt-out keyword is received', async () => {
			const contact = await testPrisma.contact.create({
				data: {
					phone: '5511999999999',
					name: 'Test Contact'
				}
			});

			const result = await businessRules.shouldAutomateContact(contact.id, 'PARAR');

			expect(result.shouldAutomate).toBe(false);
		expect(result.action).toBe('opt_out_processed');

			const updated = await testPrisma.contact.findUnique({
				where: { id: contact.id }
			});
			expect(updated?.optIn).toBe(false);
		});
	});
});
