import { memo, useMemo } from 'react';
import { MessageSquare, Trash2, Clock, Check, CheckCheck, XCircle, FileText, Sparkles, GitBranch } from 'lucide-react';
import SectionCard from '../../../components/SectionCard';
import EmptyState from '../../../components/EmptyState';
import SkeletonBlock from '../../../components/SkeletonBlock';
import type { Message, MessageStatus, Template, Trigger } from '../../../types';

interface MessageListProps {
  messages: Message[];
  allMessagesCount: number;
  templates: Template[];
  triggers: Trigger[];
  selectedIds: Set<string>;
  hiddenCount: number;
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSelectMessage: (id: string) => void;
  onViewDetails: (message: Message) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClearHidden: () => void;
  onClearDisplayed: () => void;
  onFetchNextPage: () => void;
}

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const getStatusBadge = (status: MessageStatus) => {
  const configs = {
    queued: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Na fila' },
    sent: { icon: Check, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Enviada' },
    delivered: { icon: CheckCheck, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Entregue' },
    read: { icon: CheckCheck, color: 'bg-green-500/10 text-green-300 border-green-500/20', label: 'Lida' },
    failed: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Falhou' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export const MessageList = memo(function MessageList({
  messages,
  allMessagesCount,
  templates,
  triggers,
  selectedIds,
  hiddenCount,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onSelectMessage,
  onViewDetails,
  onSelectAll,
  onDeselectAll,
  onClearHidden,
  onClearDisplayed,
  onFetchNextPage,
}: MessageListProps) {
  const templateById = useMemo(() => {
    const map: Record<string, Template> = {};
    for (const t of templates) {
      map[t.id] = t;
    }
    return map;
  }, [templates]);

  const triggerById = useMemo(() => {
    const map: Record<string, Trigger> = {};
    for (const t of triggers) {
      map[t.id] = t;
    }
    return map;
  }, [triggers]);

  return (
    <SectionCard
      title="Mensagens"
      description="Acompanhe o fluxo de atendimento com atualização contínua."
      icon={<MessageSquare className="h-5 w-5" />}
      action={
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={onClearHidden}
              className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Mostrar ocultas
            </button>
          )}
          {allMessagesCount > 0 && (
            <button
              onClick={onClearDisplayed}
              className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
              title={
                selectedIds.size > 0
                  ? 'Ocultar mensagens selecionadas'
                  : 'Ocultar todas as mensagens listadas'
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              {selectedIds.size > 0 ? 'Ocultar selecionadas' : 'Ocultar todas'}
            </button>
          )}
        </div>
      }
      footer={
        hasNextPage && (
          <div className="flex justify-center">
            <button
              onClick={onFetchNextPage}
              disabled={isFetchingNextPage}
              className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais mensagens'}
            </button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 rounded-2xl border border-brand-border/60" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<XCircle className="h-10 w-10" />}
          title="Erro ao carregar mensagens"
          description="Recarregue a página ou ajuste os filtros para tentar novamente."
          className="bg-brand-surface/60"
        />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-10 w-10" />}
          title="Nenhuma mensagem encontrada"
          description="Quando as conversas começarem a chegar, elas aparecerão aqui automaticamente."
          className="bg-brand-surface/60"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <button
              onClick={selectedIds.size === messages.length ? onDeselectAll : onSelectAll}
              className="text-xs text-brand-muted hover:text-white"
            >
              {selectedIds.size === messages.length ? 'Desmarcar todas' : 'Selecionar todas'}
            </button>
          </div>

          {messages.map((message) => {
            const isSelected = selectedIds.has(message.id);
            return (
              <div key={message.id} className="flex w-full justify-center">
                <div className="w-full max-w-3xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelectMessage(message.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-4 h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                  />
                  <button
                    onClick={() => onViewDetails(message)}
                    className="flex-1 text-left"
                  >
                    <div
                      className={`w-full rounded-2xl border p-4 transition ${
                        isSelected
                          ? 'border-brand-primary/60 bg-brand-primary/20'
                          : message.direction === 'inbound'
                            ? 'border-brand-border/60 bg-brand-surface/70 hover:border-brand-primary/30'
                            : 'border-brand-primary/50 bg-brand-primary/15 hover:border-brand-primary/70'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {message.contact?.name || message.contact?.phone || 'Desconhecido'}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              message.direction === 'inbound'
                                ? 'bg-blue-500/10 text-blue-200'
                                : 'bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {message.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                          </span>
                        </div>
                        {getStatusBadge(message.status)}
                      </div>

                      <p className="mb-2 text-sm text-brand-text whitespace-pre-wrap break-words">
                        {message.content}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{formatTimestamp(message.createdAt)}</span>
                          {message.templateId && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5"
                              title={templateById[message.templateId]?.content?.slice(0, 120) ?? 'Template'}
                            >
                              <FileText className="h-3 w-3 text-brand-primary" />
                              <span>
                                Template {templateById[message.templateId]?.key ?? message.templateId.slice(0, 6)}
                              </span>
                            </span>
                          )}
                          {message.triggerId && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5"
                              title={triggerById[message.triggerId]?.pattern ?? 'Trigger'}
                            >
                              <Sparkles className="h-3 w-3 text-brand-primary" />
                              <span>
                                Trigger {triggerById[message.triggerId]?.pattern ?? message.triggerId.slice(0, 6)}
                              </span>
                            </span>
                          )}
                          {message.flowInstanceId && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5">
                              <GitBranch className="h-3 w-3 text-purple-300" />
                              <span>Fluxo automatizado</span>
                            </span>
                          )}
                        </div>
                        {message.contact?.phone && (
                          <span className="font-mono">{message.contact.phone}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
});

export default MessageList;
