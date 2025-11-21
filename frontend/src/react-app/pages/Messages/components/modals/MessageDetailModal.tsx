import { memo } from 'react';
import { X, Clock, Check, CheckCheck, XCircle } from 'lucide-react';
import type { Message, MessageStatus } from '../../../../types';

interface MessageDetailModalProps {
  message: Message | null;
  onClose: () => void;
}

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

export const MessageDetailModal = memo(function MessageDetailModal({
  message,
  onClose,
}: MessageDetailModalProps) {
  if (!message) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Detalhes da mensagem</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
              Contato
            </label>
            <p className="text-sm text-white">
              {message.contact?.name || message.contact?.phone || 'Desconhecido'}
            </p>
            {message.contact?.phone && (
              <p className="font-mono text-xs text-brand-muted">{message.contact.phone}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
              Direção
            </label>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                message.direction === 'inbound'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {message.direction === 'inbound' ? 'Recebida' : 'Enviada'}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
              Status
            </label>
            {getStatusBadge(message.status)}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
              Conteúdo
            </label>
            <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-3">
              <p className="text-sm text-white whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-brand-muted">
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide">Criada em</label>
              <p className="text-white">
                {new Date(message.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="mb-1 block font-medium uppercase tracking-wide">Atualizada em</label>
              <p className="text-white">
                {new Date(message.updatedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          {(message.triggerId || message.flowInstanceId || message.templateId) && (
            <div className="border-t border-brand-border/60 pt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                Informações técnicas
              </label>
              <div className="space-y-1 text-xs text-brand-muted">
                {message.triggerId && (
                  <p>
                    <span className="font-medium">Trigger ID:</span> {message.triggerId}
                  </p>
                )}
                {message.flowInstanceId && (
                  <p>
                    <span className="font-medium">Flow Instance ID:</span> {message.flowInstanceId}
                  </p>
                )}
                {message.templateId && (
                  <p>
                    <span className="font-medium">Template ID:</span> {message.templateId}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default MessageDetailModal;
