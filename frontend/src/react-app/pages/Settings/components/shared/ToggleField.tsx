import { memo } from 'react';

export type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export const ToggleField = memo(function ToggleField({
  label,
  checked,
  onChange
}: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-brand-muted">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-brand-primary/80' : 'bg-brand-border/70'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
});

export default ToggleField;
