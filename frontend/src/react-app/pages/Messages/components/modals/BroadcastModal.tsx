import { memo, useState } from 'react';
import { Radio, X, Loader } from 'lucide-react';

interface BroadcastModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onBroadcast: (text: string, optedInOnly: boolean) => Promise<void>;
}

export const BroadcastModal = memo(function BroadcastModal({
  isOpen,
  isPending,
  onClose,
  onBroadcast,
}: BroadcastModalProps) {
  const [broadcastText, setBroadcastText] = useState('');
  const [optedInOnly, setOptedInOnly] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText) return;

    try {
      await onBroadcast(broadcastText.trim(), optedInOnly);
      setBroadcastText('');
      setOptedInOnly(true);
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Radio className="h-5 w-5 text-brand-primary" />
            Broadcast para contatos
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem</label>
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Digite a mensagem para broadcast..."
              required
              rows={4}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="optedInOnly"
              checked={optedInOnly}
              onChange={(e) => setOptedInOnly(e.target.checked)}
              className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
            />
            <label htmlFor="optedInOnly" className="text-sm text-brand-muted">
              Enviar apenas para contatos com opt-in ativo
            </label>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <strong>Atenção:</strong> Mensagens em broadcast serão enviadas para todos os contatos{' '}
            {optedInOnly ? 'com opt-in ativo' : 'cadastrados'}. Use com responsabilidade para evitar bloqueio.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  Enviar broadcast
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default BroadcastModal;
