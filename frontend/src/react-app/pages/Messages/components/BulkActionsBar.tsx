import { memo } from 'react';
import { Sparkles } from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  conversationCount: number;
  isPending: boolean;
  onDeselectAll: () => void;
  onOpenBulkReply: () => void;
  onHideSelected: () => void;
}

export const BulkActionsBar = memo(function BulkActionsBar({
  selectedCount,
  conversationCount,
  isPending,
  onDeselectAll,
  onOpenBulkReply,
  onHideSelected,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">
            {selectedCount} {selectedCount > 1 ? 'mensagens' : 'mensagem'} selecionada{selectedCount > 1 ? 's' : ''}
          </span>
          {conversationCount > 0 && (
            <span className="rounded-full border border-brand-border/50 px-2 py-0.5 text-xs text-brand-muted">
              {conversationCount} conversa{conversationCount > 1 ? 's' : ''} única{conversationCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onDeselectAll}
            className="text-xs text-brand-muted hover:text-white"
          >
            Desmarcar todas
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenBulkReply}
            className="flex items-center gap-2 rounded-lg border border-brand-primary/50 bg-brand-primary/20 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/30"
            disabled={isPending}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Responder selecionadas
          </button>
          <button
            onClick={onHideSelected}
            className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-white transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
          >
            Ocultar selecionadas
          </button>
        </div>
      </div>
    </div>
  );
});

export default BulkActionsBar;
