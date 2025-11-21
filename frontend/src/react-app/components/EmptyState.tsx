import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-border/60 bg-brand-surface/40 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="text-brand-muted">{icon}</div>}
      <p className="text-base font-medium text-white">{title}</p>
      {description && <p className="max-w-sm text-sm text-brand-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

