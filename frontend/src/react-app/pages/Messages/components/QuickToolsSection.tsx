import { memo } from 'react';
import { Send, Radio, Sparkles } from 'lucide-react';

interface QuickToolsSectionProps {
  selectedCount: number;
  bulkTipDismissed: boolean;
  onOpenSend: () => void;
  onOpenBroadcast: () => void;
  onOpenBulkReply: () => void;
  onDismissTip: () => void;
}

export const QuickToolsSection = memo(function QuickToolsSection({
  selectedCount,
  bulkTipDismissed,
  onOpenSend,
  onOpenBroadcast,
  onOpenBulkReply,
  onDismissTip,
}: QuickToolsSectionProps) {
  return (
    <div className="rounded-3xl border border-brand-border/60 bg-brand-surface/70 p-6 shadow-brand-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Ferramentas de atendimento</h2>
          <p className="text-sm text-brand-muted">
            Tome ações imediatas sem sair desta página. Todas as mensagens respeitam fila, delays e humanização.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpenSend}
            className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Send className="h-4 w-4" />
            Nova mensagem
          </button>
          <button
            onClick={onOpenBroadcast}
            className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Radio className="h-4 w-4" />
            Broadcast
          </button>
          <button
            onClick={onOpenBulkReply}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Responder selecionadas
          </button>
        </div>
      </div>
      {!bulkTipDismissed && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-4 text-sm text-white md:flex-row md:items-center md:justify-between">
          <span>
            Selecione mensagens na lista e use <strong>Responder selecionadas</strong> para enviar templates humanizados em lote.
          </span>
          <button
            onClick={onDismissTip}
            className="text-xs font-semibold uppercase tracking-wide text-brand-primary hover:text-brand-primary/80"
          >
            Entendi
          </button>
        </div>
      )}
    </div>
  );
});

export default QuickToolsSection;
