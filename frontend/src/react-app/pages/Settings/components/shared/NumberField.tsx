import { memo } from 'react';

export type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
};

export const NumberField = memo(function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  helpText
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-brand-muted">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {helpText && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </label>
  );
});

export default NumberField;
