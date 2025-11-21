import { useState } from 'react';
import { X, ArrowRight, Check, MessageSquare, Zap, Sparkles } from 'lucide-react';
import { useCreateFlow, useCreateTemplate, useCreateFlowStep, useCreateTrigger } from '../hooks/useApi';
import { notificationActions } from '../stores/useNotificationStore';

interface FlowWizardProps {
    onClose: () => void;
    onSuccess: () => void;
}

const PREMADE_TEMPLATES = [
    {
        id: 'custom',
        title: 'Criar do Zero',
        description: 'Defina seu próprio gatilho e mensagem.',
        icon: <Sparkles className="w-6 h-6 text-brand-primary" />,
        data: { name: '', keyword: '', message: '' }
    },
    {
        id: 'welcome',
        title: 'Boas-vindas',
        description: 'Responde a "oi" com uma saudação amigável.',
        icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
        data: { name: 'Boas-vindas', keyword: 'oi, ola, tudo bem', message: 'Olá! 👋 Bem-vindo ao nosso atendimento. Como posso ajudar você hoje?' }
    },
    {
        id: 'support',
        title: 'Suporte',
        description: 'Responde a "ajuda" com instruções de suporte.',
        icon: <Zap className="w-6 h-6 text-amber-400" />,
        data: { name: 'Suporte', keyword: 'ajuda, suporte, socorro', message: 'Para falar com o suporte, por favor descreva seu problema brevemente. Um atendente irá responder em instantes.' }
    }
];

export default function FlowWizard({ onClose, onSuccess }: FlowWizardProps) {
    const [step, setStep] = useState(0); // 0 = Selection, 1 = Info, 2 = Message, 3 = Review
    const [data, setData] = useState({
        name: '',
        keyword: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createFlow = useCreateFlow();
    const createTemplate = useCreateTemplate();
    const createStep = useCreateFlowStep();
    const createTrigger = useCreateTrigger();

    const handleSelectTemplate = (template: typeof PREMADE_TEMPLATES[0]) => {
        setData(template.data);
        if (template.id === 'custom') {
            setStep(1);
        } else {
            // Pre-fill and go to review
            setStep(3);
        }
    };

    const handleNext = () => {
        if (step === 1 && (!data.name || !data.keyword)) {
            notificationActions.notify({ message: 'Preencha todos os campos.', type: 'error' });
            return;
        }
        if (step === 2 && !data.message) {
            notificationActions.notify({ message: 'Digite a mensagem de boas-vindas.', type: 'error' });
            return;
        }
        setStep(step + 1);
    };

    const handleFinish = async () => {
        setIsSubmitting(true);
        try {
            // Generate a unique key to avoid conflicts (409 errors)
            const uniqueId = Date.now().toString(36);
            const safeName = data.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const templateKey = `${safeName}_welcome_${uniqueId}`;

            // 1. Create Template
            const template = await createTemplate.mutateAsync({
                key: templateKey,
                content: data.message,
            });

            // 2. Create Flow
            const flow = await createFlow.mutateAsync({
                name: data.name,
                status: 'published',
                version: 1,
            });

            // 3. Create Trigger
            await createTrigger.mutateAsync({
                type: 'equals',
                pattern: data.keyword,
                flowId: flow.id,
                active: true,
                priority: 1,
                cooldownSec: 0,
            });

            // 4. Create Step
            await createStep.mutateAsync({
                flowId: flow.id,
                data: {
                    key: 'welcome_step',
                    type: 'send_template',
                    templateId: template.id,
                    order: 1,
                    transitions: { default: '' },
                },
            });

            notificationActions.notify({ message: 'Fluxo criado com sucesso!', type: 'success' });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Wizard failed:', error);
            const msg = error?.response?.data?.error || error?.message || 'Erro desconhecido';
            notificationActions.notify({ 
                message: `Erro ao criar fluxo: ${msg}. Verifique se o backend está rodando.`, 
                type: 'error' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-brand-border/60 bg-brand-surface p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Criar Novo Fluxo</h2>
                        <p className="text-sm text-brand-muted">
                            {step === 0 ? 'Escolha um modelo' : `Passo ${step} de 3`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-brand-muted hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Bar (Only for wizard steps) */}
                {step > 0 && (
                    <div className="mb-8 flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-brand-primary' : 'bg-brand-surfaceElevated'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Step 0: Template Selection */}
                {step === 0 && (
                    <div className="space-y-3">
                        {PREMADE_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleSelectTemplate(template)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-brand-border/40 bg-brand-surfaceElevated/50 hover:bg-brand-surfaceElevated hover:border-brand-primary/40 transition-all text-left group"
                            >
                                <div className="p-2 bg-brand-surface rounded-lg group-hover:scale-110 transition-transform">
                                    {template.icon}
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{template.title}</h3>
                                    <p className="text-sm text-brand-muted">{template.description}</p>
                                </div>
                                <ArrowRight className="ml-auto w-5 h-5 text-brand-muted group-hover:text-brand-primary opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-brand-muted">Nome do Fluxo</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                                placeholder="Ex: Atendimento Inicial"
                                className="w-full rounded-xl border border-brand-border/60 bg-brand-surfaceElevated px-4 py-3 text-white focus:border-brand-primary/50 focus:outline-none"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-brand-muted">Palavra-chave (Gatilho)</label>
                            <div className="relative">
                                <Zap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                                <input
                                    type="text"
                                    value={data.keyword}
                                    onChange={(e) => setData({ ...data, keyword: e.target.value })}
                                    placeholder="Ex: oi, ola, suporte"
                                    className="w-full rounded-xl border border-brand-border/60 bg-brand-surfaceElevated pl-10 pr-4 py-3 text-white focus:border-brand-primary/50 focus:outline-none"
                                />
                            </div>
                            <p className="mt-1 text-xs text-brand-muted">
                                O fluxo iniciará quando o cliente enviar esta palavra.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 2: Message */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-brand-muted">Mensagem de Boas-vindas</label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-brand-muted" />
                                <textarea
                                    value={data.message}
                                    onChange={(e) => setData({ ...data, message: e.target.value })}
                                    placeholder="Digite a mensagem que o cliente receberá..."
                                    className="w-full h-32 rounded-xl border border-brand-border/60 bg-brand-surfaceElevated pl-10 pr-4 py-3 text-white focus:border-brand-primary/50 focus:outline-none resize-none"
                                    autoFocus
                                />
                            </div>
                            <p className="mt-1 text-xs text-brand-muted">
                                Um template será criado automaticamente com este conteúdo.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/50 p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-brand-muted">Nome:</span>
                                <span className="text-sm font-medium text-white">{data.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-brand-muted">Gatilho:</span>
                                <span className="text-sm font-medium text-white">{data.keyword}</span>
                            </div>
                            <div className="pt-2 border-t border-brand-border/40">
                                <span className="text-sm text-brand-muted block mb-1">Mensagem:</span>
                                <p className="text-sm text-white italic">"{data.message}"</p>
                            </div>
                        </div>
                        <p className="text-center text-sm text-brand-muted">
                            Tudo pronto! Clique em finalizar para criar seu fluxo.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex justify-between">
                    {step > 0 ? (
                        <button
                            onClick={() => setStep(step === 1 ? 0 : step - 1)}
                            className="px-4 py-2 text-sm font-medium text-brand-muted hover:text-white transition-colors"
                        >
                            Voltar
                        </button>
                    ) : (
                        <div />
                    )}

                    {step > 0 && step < 3 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-2 text-sm font-bold text-slate-950 hover:bg-brand-primary/90 transition-colors"
                        >
                            Próximo
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : step === 3 ? (
                        <button
                            onClick={handleFinish}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-2 text-sm font-bold text-slate-950 hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Criando...' : 'Finalizar'}
                            <Check className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
