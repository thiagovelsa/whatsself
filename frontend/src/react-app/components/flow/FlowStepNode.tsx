import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, CheckCircle, HelpCircle, ArrowRight } from 'lucide-react';
import { FlowStep } from '../../types';

const FlowStepNode = ({ data, selected }: NodeProps<{ label: string; step: FlowStep }>) => {
    const { step } = data;

    const getIcon = () => {
        switch (step.type) {
            case 'send_template':
                return <MessageSquare className="h-4 w-4 text-brand-primary" />;
            case 'collect_input':
                return <HelpCircle className="h-4 w-4 text-amber-400" />;
            case 'end':
                return <CheckCircle className="h-4 w-4 text-emerald-400" />;
            default:
                return <ArrowRight className="h-4 w-4 text-brand-muted" />;
        }
    };

    const getLabel = () => {
        switch (step.type) {
            case 'send_template':
                return 'Enviar Template';
            case 'collect_input':
                return 'Aguardar Resposta';
            case 'end':
                return 'Finalizar';
            default:
                return 'Passo';
        }
    };

    return (
        <div
            className={`min-w-[200px] rounded-xl border bg-brand-surfaceElevated px-4 py-3 shadow-lg transition-all ${selected ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-brand-border/60'
                }`}
        >
            <Handle type="target" position={Position.Top} className="!bg-brand-muted" />

            <div className="flex items-center gap-3 border-b border-brand-border/40 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-surface/50">
                    {getIcon()}
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">{step.key}</h3>
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted">{getLabel()}</p>
                </div>
            </div>

            <div className="mt-2 text-xs text-brand-muted">
                {step.type === 'send_template' && (
                    <p className="line-clamp-2">
                        Template: <span className="text-white">{step.templateId || 'N/A'}</span>
                    </p>
                )}
                {step.type === 'collect_input' && (
                    <p>
                        Aguardar input: <span className="text-amber-200">{step.waitInput ? 'Sim' : 'Não'}</span>
                    </p>
                )}
                {step.type === 'end' && <p>Encerra o fluxo atual.</p>}
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-brand-primary" />
        </div>
    );
};

export default memo(FlowStepNode);
