import { memo, useState } from 'react';
import { Sparkles, X, Loader } from 'lucide-react';
import Button from '@/react-app/components/Button';
import type { Template } from '../../../../types';

interface BulkReplyModalProps {
  isOpen: boolean;
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  selectedCount: number;
  conversationCount: number;
  templates: Template[];
  isLoadingTemplates: boolean;
  onClose: () => void;
  onSubmit: (templateId: string | undefined, text: string | undefined, respectOptOut: boolean) => Promise<void>;
}

export const BulkReplyModal = memo(function BulkReplyModal({
  isOpen,
  isPending,
  isError,
  errorMessage,
  selectedCount,
  conversationCount,
  templates,
  isLoadingTemplates,
  onClose,
  onSubmit,
}: BulkReplyModalProps) {
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkCustomText, setBulkCustomText] = useState('');
  const [respectOptOut, setRespectOptOut] = useState(true);

  if (!isOpen) return null;

  const canSubmit = selectedCount > 0 && (bulkTemplateId || bulkCustomText.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await onSubmit(
        bulkTemplateId || undefined,
        bulkCustomText.trim() || undefined,
        respectOptOut
      );
      setBulkTemplateId('');
      setBulkCustomText('');
      setRespectOptOut(true);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-brand-primary" />
            Responder conversas selecionadas
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="!rounded-full !px-2 !h-9"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-3 text-sm text-brand-muted">
            <p>
              {selectedCount} {selectedCount > 1 ? 'mensagens' : 'mensagem'} selecionada{selectedCount > 1 ? 's' : ''} •{' '}
              {conversationCount} conversa{conversationCount > 1 ? 's' : ''} única{conversationCount > 1 ? 's' : ''}
            </p>
            <p className="mt-1">
              As respostas serão enviadas uma a uma respeitando delays de digitação e limites do robô.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Template</label>
            <select
              value={bulkTemplateId}
              onChange={(e) => setBulkTemplateId(e.target.value)}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">
                {isLoadingTemplates ? 'Carregando templates...' : 'Selecione um template (opcional)'}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.key} — {template.content.slice(0, 40)}
                  {template.content.length > 40 ? '...' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-brand-muted">
              Deixe vazio para usar apenas a mensagem personalizada abaixo.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem personalizada</label>
            <textarea
              value={bulkCustomText}
              onChange={(e) => setBulkCustomText(e.target.value)}
              rows={4}
              placeholder="Escreva uma mensagem rápida (opcional). Use {{nome}}, {{primeiro_nome}} ou {{telefone}}."
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/60 p-3 text-xs text-brand-muted">
            Variáveis disponíveis: <code className="font-mono text-white">{'{{nome}}'}</code>,{' '}
            <code className="font-mono text-white">{'{{primeiro_nome}}'}</code> e{' '}
            <code className="font-mono text-white">{'{{telefone}}'}</code>.
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-muted">
            <input
              type="checkbox"
              checked={respectOptOut}
              onChange={(e) => setRespectOptOut(e.target.checked)}
              className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
            />
            Respeitar opt-out e contatos com opt-in desligado
          </label>

          {isError && (
            <p className="text-sm text-rose-400">
              {errorMessage || 'Falha ao agendar respostas. Tente novamente.'}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="md"
              block
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isPending}
              disabled={!canSubmit}
              variant="primary"
              size="md"
              block
            >
              {isPending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enviar respostas
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default BulkReplyModal;
