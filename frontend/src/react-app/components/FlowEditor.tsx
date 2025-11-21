import { useState } from 'react';
import { Plus, Trash2, Save, X, ArrowRight, MessageSquare, Keyboard } from 'lucide-react';
import { useCreateFlowStep, useUpdateFlowStep, useDeleteFlowStep, useTemplates } from '../hooks/useApi';
import type { Flow, FlowStep, StepType } from '../types';

interface FlowEditorProps {
    flow: Flow;
}

export default function FlowEditor({ flow }: FlowEditorProps) {
    const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: templates = [] } = useTemplates();
    const createStep = useCreateFlowStep();
    const updateStep = useUpdateFlowStep();
    const deleteStep = useDeleteFlowStep();

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

    const handleEditClick = (step: FlowStep) => {
        setEditingStep(step);
        setIsCreating(false);
        setError(null);

        // Extract default transition if exists
        let nextStep = '';
        if (step.transitionsJson && typeof step.transitionsJson === 'object') {
            // Assuming simple linear flow for MVP: look for 'default' or any value
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
    };

    const handleCreateClick = () => {
        setEditingStep(null);
        setIsCreating(true);
        setError(null);
        setFormData({
            key: `step_${(flow.steps?.length || 0) + 1}`,
            type: 'send_template',
            templateId: '',
            waitInput: false,
            nextStep: '',
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const transitions = formData.nextStep ? { default: formData.nextStep } : {};

        try {
            if (isCreating) {
                await createStep.mutateAsync({
                    flowId: flow.id,
                    data: {
                        key: formData.key,
                        type: formData.type,
                        templateId: formData.templateId || undefined,
                        waitInput: formData.waitInput,
                        order: (flow.steps?.length || 0) + 1,
                        transitions,
                    },
                });
                setIsCreating(false);
            } else if (editingStep) {
                await updateStep.mutateAsync({
                    flowId: flow.id,
                    stepId: editingStep.id,
                    data: {
                        key: formData.key,
                        type: formData.type,
                        templateId: formData.templateId || undefined,
                        waitInput: formData.waitInput,
                        transitions,
                    },
                });
                setEditingStep(null);
            }
        } catch (err) {
            console.error('Failed to save step:', err);
            setError('Erro ao salvar passo. Verifique se a chave é única.');
        }
    };

    const handleDelete = async (stepId: string) => {
        if (!confirm('Tem certeza que deseja excluir este passo?')) return;
        try {
            await deleteStep.mutateAsync({ flowId: flow.id, stepId });
            if (editingStep?.id === stepId) {
                setEditingStep(null);
                setIsCreating(false);
            }
        } catch (err) {
            console.error('Failed to delete step:', err);
        }
    };

    return (
        <div className="flex h-[600px] flex-col md:flex-row gap-6">
            {/* Left: Step List */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-brand-border/60 pr-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-brand-muted">Passos do Fluxo</h3>
                    <button
                        onClick={handleCreateClick}
                        className="flex items-center gap-1 rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-medium text-brand-primary hover:bg-brand-primary/20"
                    >
                        <Plus className="h-3 w-3" />
                        Adicionar
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {(!flow.steps || flow.steps.length === 0) && (
                        <div className="text-center py-8 text-xs text-brand-muted">
                            Nenhum passo criado.
                        </div>
                    )}

                    {flow.steps?.map((step, index) => (
                        <div
                            key={step.id}
                            onClick={() => handleEditClick(step)}
                            className={`cursor-pointer rounded-xl border p-3 transition ${editingStep?.id === step.id
                                ? 'border-brand-primary/50 bg-brand-primary/5'
                                : 'border-brand-border/60 bg-brand-surface/70 hover:border-brand-primary/30'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-surface/50 text-xs font-medium text-brand-muted">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{step.key}</div>
                                        <div className="flex items-center gap-2 text-[10px] text-brand-muted">
                                            {step.type === 'send_template' && <MessageSquare className="h-3 w-3" />}
                                            {step.type === 'collect_input' && <Keyboard className="h-3 w-3" />}
                                            {step.type === 'end' && <X className="h-3 w-3" />}
                                            <span>{step.type}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(step.id);
                                    }}
                                    className="rounded p-1 text-brand-muted hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                            {step.transitionsJson && Object.keys(step.transitionsJson).length > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-brand-muted">
                                    <ArrowRight className="h-3 w-3" />
                                    <span>Próximo: {Object.values(step.transitionsJson)[0]}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Edit Form */}
            <div className="w-full md:w-80 flex flex-col">
                {(editingStep || isCreating) ? (
                    <div className="flex flex-col h-full">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white">
                                {isCreating ? 'Novo Passo' : `Editar: ${editingStep?.key}`}
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingStep(null);
                                    setIsCreating(false);
                                }}
                                className="text-brand-muted hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
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

                            <div className="mt-auto pt-4">
                                <button
                                    type="submit"
                                    disabled={createStep.isPending || updateStep.isPending}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary/90 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:opacity-60"
                                >
                                    <Save className="h-3 w-3" />
                                    {isCreating ? 'Criar Passo' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs text-brand-muted">
                        Selecione um passo para editar ou crie um novo.
                    </div>
                )}
            </div>
        </div>
    );
}
