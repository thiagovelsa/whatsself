import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useTemplates } from '../../hooks/useApi';
import type { Flow, FlowStep, StepType } from '../../types';

interface FlowStepFormProps {
    flow: Flow;
    step?: FlowStep | null;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    isSaving?: boolean;
}

export default function FlowStepForm({ flow, step, onSave, onCancel, isSaving }: FlowStepFormProps) {
    const { data: templates = [] } = useTemplates();
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<{
        key: string;
        type: StepType;
        templateId: string;
        waitInput: boolean;
        nextStep: string;
    }>({
        key: '',
        type: 'send_template',
        templateId: '',
        waitInput: false,
        nextStep: '',
    });

    useEffect(() => {
        if (step) {
            // Extract default transition if exists
            let nextStep = '';
            if (step.transitionsJson && typeof step.transitionsJson === 'object') {
                const values = Object.values(step.transitionsJson);
                if (values.length > 0) {
                    nextStep = String(values[0]);
                }
            }

            setFormData({
                key: step.key,
                type: step.type,
                templateId: step.templateId || '',
                waitInput: step.waitInput,
                nextStep,
            });
        } else {
            setFormData({
                key: `step_${(flow.steps?.length || 0) + 1}`,
                type: 'send_template',
                templateId: '',
                waitInput: false,
                nextStep: '',
            });
        }
    }, [step, flow.steps]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const transitions = formData.nextStep ? { default: formData.nextStep } : {};

        try {
            await onSave({
                key: formData.key,
                type: formData.type,
                templateId: formData.templateId || undefined,
                waitInput: formData.waitInput,
                transitions,
            });
        } catch (err) {
            console.error('Failed to save step:', err);
            setError('Erro ao salvar passo. Verifique se a chave é única.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">
                    Chave do Passo (ID único)
                </label>
                <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="w-full rounded-lg border border-brand-border/60 bg-brand-surface/50 px-3 py-2 text-xs text-white focus:border-brand-primary/40 focus:outline-none"
                    required
                />
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">
                    Tipo de Ação
                </label>
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as StepType })}
                    className="w-full rounded-lg border border-brand-border/60 bg-brand-surface/50 px-3 py-2 text-xs text-white focus:border-brand-primary/40 focus:outline-none"
                >
                    <option value="send_template">Enviar Template</option>
                    <option value="collect_input">Coletar Resposta</option>
                    <option value="end">Finalizar Fluxo</option>
                </select>
            </div>

            {formData.type === 'send_template' && (
                <div>
                    <label className="mb-1 block text-xs font-medium text-brand-muted">
                        Template
                    </label>
                    <select
                        value={formData.templateId}
                        onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                        className="w-full rounded-lg border border-brand-border/60 bg-brand-surface/50 px-3 py-2 text-xs text-white focus:border-brand-primary/40 focus:outline-none"
                        required={formData.type === 'send_template'}
                    >
                        <option value="">Selecione um template...</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.key}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="waitInput"
                    checked={formData.waitInput}
                    onChange={(e) => setFormData({ ...formData, waitInput: e.target.checked })}
                    className="rounded border-brand-border/60 bg-brand-surface/50 text-brand-primary focus:ring-brand-primary/30"
                />
                <label htmlFor="waitInput" className="text-xs text-brand-muted">
                    Aguardar resposta do usuário após este passo?
                </label>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">
                    Próximo Passo (Chave)
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={formData.nextStep}
                        onChange={(e) => setFormData({ ...formData, nextStep: e.target.value })}
                        placeholder="Ex: step_2"
                        className="w-full rounded-lg border border-brand-border/60 bg-brand-surface/50 px-3 py-2 text-xs text-white focus:border-brand-primary/40 focus:outline-none"
                    />
                    {formData.nextStep && (
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, nextStep: '' })}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    {flow.steps?.filter(s => s.key !== formData.key).map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, nextStep: s.key })}
                            className="rounded border border-brand-border/40 bg-brand-surface/30 px-2 py-0.5 text-[10px] text-brand-muted hover:border-brand-primary/30 hover:text-white"
                        >
                            {s.key}
                        </button>
                    ))}
                </div>
                <p className="mt-1 text-[10px] text-brand-muted">
                    Deixe em branco se for o último passo ou se usar lógica complexa.
                </p>
            </div>

            {error && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {error}
                </div>
            )}

            <div className="mt-auto flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary/90 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:opacity-60"
                >
                    <Save className="h-3 w-3" />
                    Salvar
                </button>
            </div>
        </form>
    );
}
