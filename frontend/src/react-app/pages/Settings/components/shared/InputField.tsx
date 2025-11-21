import { memo } from 'react';

export type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helpText?: string;
};

export const InputField = memo(function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helpText
}: InputFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-brand-muted">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {helpText && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </label>
  );
});

export default InputField;
