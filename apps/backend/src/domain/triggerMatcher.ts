import { PrismaClient, Trigger, TriggerType } from '@prisma/client';

export type MatchTriggerInput = {
	text: string;
	contactId: string;
	now?: Date;
};

export type MatchTriggerResult = {
	trigger: Trigger;
	reason: 'pattern_matched';
};

function normalizeText(s: string): string {
	return (s ?? '').trim();
}

function onlyDigits(s: string): string {
	return (s ?? '').replace(/\D+/g, '');
}

function matchesPattern(t: Trigger, text: string): boolean {
	const normalized = normalizeText(text);
	switch (t.type) {
		case 'equals':
			return normalized.toLocaleLowerCase() === t.pattern.trim().toLocaleLowerCase();
		case 'contains':
			return normalized.toLocaleLowerCase().includes(t.pattern.trim().toLocaleLowerCase());
		case 'regex':
			try {
				const re = new RegExp(t.pattern, 'i');
				return re.test(text);
			} catch {
				return false;
			}
		case 'number': {
			const digits = onlyDigits(normalized);
			const patternDigits = onlyDigits(t.pattern);
			return digits.length > 0 && digits === patternDigits;
		}
		default:
			return false;
	}
}

async function isOnCooldown(prisma: PrismaClient, t: Trigger, contactId: string, now: Date): Promise<boolean> {
	if (!t.cooldownSec || t.cooldownSec <= 0) return false;
	const since = new Date(now.getTime() - t.cooldownSec * 1000);
	// Considera cooldown se já respondemos a este contato com este gatilho recentemente
	const last = await prisma.message.findFirst({
		where: {
			contactId,
			triggerId: t.id,
			direction: 'outbound',
			createdAt: { gte: since }
		},
		orderBy: { createdAt: 'desc' },
		select: { id: true }
	});
	return !!last;
}

/**
 * Retorna o primeiro gatilho ativo que casar com o texto e não esteja em cooldown para o contato.
 * Ordem: prioridade desc, mais recente primeiro.
 */
export async function matchTrigger(prisma: PrismaClient, input: MatchTriggerInput): Promise<MatchTriggerResult | null> {
	const now = input.now ?? new Date();
	const text = input.text ?? '';
	const active = await prisma.trigger.findMany({
		where: { active: true },
		orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
	});
	for (const t of active) {
		if (!matchesPattern(t, text)) continue;
		const cooldown = await isOnCooldown(prisma, t, input.contactId, now);
		if (cooldown) continue;
		return { trigger: t, reason: 'pattern_matched' };
	}
	return null;
}



