import { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-primary/90 hover:bg-brand-primary text-slate-950 border border-brand-primary/40 shadow-brand-soft',
  secondary:
    'bg-brand-surface/80 hover:bg-brand-surfaceElevated/80 text-white border border-brand-border/60',
  ghost:
    'bg-transparent text-brand-muted hover:text-white border border-brand-border/50 hover:border-brand-primary/40',
  danger:
    'bg-brand-error/90 hover:bg-brand-error text-white border border-brand-error/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        block && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export default Button;
