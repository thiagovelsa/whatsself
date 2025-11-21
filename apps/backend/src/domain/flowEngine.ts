import { PrismaClient, FlowInstance, FlowStep } from '@prisma/client';
import { renderTemplate } from '../services/templateRenderer.js';
import { createLogger } from '../services/logger.js';

const logger = createLogger('flowEngine');

export type EngineAction =
	| { type: 'send_text'; contactId: string; text: string; meta?: Record<string, unknown> }
	| { type: 'end_flow'; contactId: string; flowInstanceId: string };

function parseTransitions(step: FlowStep): Record<string, string> {
	try {
		const t = step.transitionsJson as unknown as Record<string, string>;
		return t || {};
	} catch {
		return {};
	}
}

async function getCurrentStep(prisma: PrismaClient, instance: FlowInstance): Promise<FlowStep | null> {
	return prisma.flowStep.findFirst({
		where: { flowId: instance.flowId, key: instance.currentStepKey }
	});
}

async function getFirstStep(prisma: PrismaClient, flowId: string): Promise<FlowStep | null> {
	return prisma.flowStep.findFirst({
		where: { flowId },
		orderBy: [{ order: 'asc' }, { key: 'asc' }]
	});
}

function moveToStep(instance: FlowInstance, nextKey: string): FlowInstance {
	return {
		...instance,
		currentStepKey: nextKey,
		lastInteractionAt: new Date()
	};
}

export async function ensureFlowInstance(prisma: PrismaClient, contactId: string, flowId: string): Promise<FlowInstance> {
	const existing = await prisma.flowInstance.findFirst({
		where: { contactId, flowId, paused: false }
	});
	if (existing) return existing;
	const first = await getFirstStep(prisma, flowId);
	if (!first) throw new Error('Fluxo sem passos');
	return prisma.flowInstance.create({
		data: {
			contactId,
			flowId,
			currentStepKey: first.key
		}
	});
}

export async function endFlow(prisma: PrismaClient, instanceId: string): Promise<void> {
	await prisma.flowInstance.update({
		where: { id: instanceId },
		data: { paused: true, lastInteractionAt: new Date() }
	});
}

/**
 * Executa passos automáticos (sem input) até encontrar um passo que aguarde input ou terminar.
 * Retorna ações a executar (ex.: enviar texto) e o estado atualizado.
 * NOTA: Não persiste o estado no banco de dados. O chamador deve persistir.
 */
export async function processAutoSteps(
	prisma: PrismaClient,
	instance: FlowInstance,
	opts?: { vars?: Record<string, unknown> }
): Promise<{ actions: EngineAction[]; instance: FlowInstance }> {
	const actions: EngineAction[] = [];

	// Otimização: Carregar todos os passos do fluxo de uma vez para evitar queries em loop
	const steps = await prisma.flowStep.findMany({
		where: { flowId: instance.flowId }
	});

	let current = steps.find(s => s.key === instance.currentStepKey);
	let guard = 0;
	let changed = false;
	const visitedSteps = new Set<string>(); // Detectar ciclos

	while (current && !current.waitInput && guard < 20) {
		guard++;

		// Detectar ciclos - se já visitamos este passo, parar para evitar loop infinito
		if (visitedSteps.has(current.key)) {
			logger.error({
				flowId: instance.flowId,
				stepKey: current.key,
				visitedSteps: Array.from(visitedSteps)
			}, 'Cycle detected in flow - stopping execution');
			break;
		}
		visitedSteps.add(current.key);

		if (current.type === 'send_template' && current.templateId) {
			const text = await renderTemplate(prisma, current.templateId, { vars: opts?.vars as any });
			actions.push({ type: 'send_text', contactId: instance.contactId, text, meta: { stepKey: current.key } });
		}
		if (current.type === 'end') {
			actions.push({ type: 'end_flow', contactId: instance.contactId, flowInstanceId: instance.id });
			// endFlow ainda persiste porque é um estado final crítico, mas idealmente deveria ser retornado
			// Para manter compatibilidade com transaction, vamos retornar o estado paused
			instance = { ...instance, paused: true, lastInteractionAt: new Date() };
			return { actions, instance };
		}
		const transitions = parseTransitions(current);
		const nextKey = transitions['next'] || transitions['default'];
		if (!nextKey) break;

		// Avança em memória
		const nextStep = steps.find(s => s.key === nextKey);
		if (nextStep) {
			current = nextStep;
			changed = true;
		} else {
			break; // Passo seguinte não encontrado
		}
	}

	// Atualiza estado em memória
	if (changed && current) {
		instance = {
			...instance,
			currentStepKey: current.key,
			lastInteractionAt: new Date()
		};
	}

	return { actions, instance };
}

export async function applyInputAndProgress(
	prisma: PrismaClient,
	instance: FlowInstance,
	inputText: string,
	opts?: { vars?: Record<string, unknown> }
): Promise<{ actions: EngineAction[]; instance: FlowInstance }> {
	const actions: EngineAction[] = [];
	let current = await getCurrentStep(prisma, instance);
	if (!current) return { actions, instance };
	const transitions = parseTransitions(current);
	const normalized = (inputText ?? '').trim();

	// Prioriza match exato; depois fallback "*" ou "default"
	const explicit = transitions[normalized];
	const fallback = transitions['*'] || transitions['default'];
	const nextKey = explicit ?? fallback;
	if (!nextKey) {
		// Sem transição: permanece aguardando input
		return { actions, instance };
	}
	instance = moveToStep(instance, nextKey);
	// Executa automáticos a partir do novo passo
	const auto = await processAutoSteps(prisma, instance, opts);
	actions.push(...auto.actions);
	return { actions, instance: auto.instance };
}



