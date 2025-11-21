import { memo } from 'react';
import { Eye, EyeOff, Wand2 } from 'lucide-react';

export type SecretFieldState = {
  value: string;
  revealed: boolean;
  regenerate: boolean;
};

export type SecretFieldProps = {
  label: string;
  masked: string | null;
  state: SecretFieldState;
  onChange: (value: string) => void;
  onReveal: () => void;
  onToggleRegenerate: () => void;
  helpText?: string;
};

export const SecretField = memo(function SecretField({
  label,
  masked,
  state,
  onChange,
  onReveal,
  onToggleRegenerate,
  helpText
}: SecretFieldProps) {
  return (
    <div className="space-y-3 rounded-xl border border-brand-border/60 bg-brand-surface/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-brand-muted">{label}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReveal}
            className="flex items-center gap-1 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-brand-muted transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            {state.revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {state.revealed ? 'Ocultar' : 'Revelar'}
          </button>
          <button
            type="button"
            onClick={onToggleRegenerate}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition ${
              state.regenerate
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-brand-border/60 bg-brand-surface/80 text-brand-muted hover:border-brand-primary/40 hover:text-brand-primary'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Regenerar
          </button>
        </div>
      </div>
      <input
        type="text"
        value={state.value}
        placeholder={masked ?? 'Sem valor definido'}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {state.regenerate && (
        <p className="text-xs text-emerald-200/80">
          Um novo valor será gerado automaticamente ao salvar.
        </p>
      )}
      {helpText && !state.regenerate && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </div>
  );
});

export default SecretField;
