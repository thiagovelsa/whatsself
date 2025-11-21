import { PrismaClient, Template } from '@prisma/client';

export type RenderOptions = {
	vars?: Record<string, string | number | boolean | null | undefined>;
};

function pickVariant(t: Template): string | null {
	try {
		const variants = (t.variants as unknown as string[]) || [];
		if (!Array.isArray(variants) || variants.length === 0) return null;
		const idx = Math.floor(Math.random() * variants.length);
		const v = variants[idx];
		return typeof v === 'string' ? v : null;
	} catch {
		return null;
	}
}

function interpolate(text: string, vars?: RenderOptions['vars']): string {
	if (!vars) return text;
	return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
		const v = vars[key];
		return v === undefined || v === null ? '' : String(v);
	});
}

export async function renderTemplate(prisma: PrismaClient, templateId: string, opts?: RenderOptions): Promise<string> {
	const t = await prisma.template.findUnique({ where: { id: templateId } });
	if (!t || !t.isActive) {
		throw new Error('Template não encontrado ou inativo');
	}
	const base = pickVariant(t) ?? t.content;
	return interpolate(base, opts?.vars);
}



