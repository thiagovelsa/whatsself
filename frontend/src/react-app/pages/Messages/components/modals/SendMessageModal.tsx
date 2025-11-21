import { memo, useState } from 'react';
import { Send, X, Loader } from 'lucide-react';
import Button from '@/react-app/components/Button';

interface SendMessageModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onSend: (phone: string, text: string, priority: number) => Promise<void>;
}

export const SendMessageModal = memo(function SendMessageModal({
  isOpen,
  isPending,
  onClose,
  onSend,
}: SendMessageModalProps) {
  const [phone, setPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !messageText) return;

    try {
      await onSend(phone.trim(), messageText.trim(), priority);
      setPhone('');
      setMessageText('');
      setPriority(5);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Send className="h-5 w-5 text-brand-primary" />
            Enviar mensagem manualmente
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
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">
              Número do WhatsApp (com código do país)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999999999"
              required
              pattern="[0-9]+"
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <p className="mt-1 text-xs text-brand-muted">
              Digite o número completo incluindo código do país (DDI) e código de área (DDD), apenas números.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite sua mensagem..."
              required
              rows={4}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">
              Prioridade de envio: {priority} (1=baixa, 10=alta)
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full accent-brand-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-brand-muted">
              <span>Baixa (1)</span>
              <span>Alta (10)</span>
            </div>
          </div>

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
              variant="primary"
              size="md"
              block
            >
              {isPending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default SendMessageModal;
