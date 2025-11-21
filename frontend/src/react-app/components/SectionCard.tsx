import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  footer?: ReactNode;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  padded = true,
  footer,
}: SectionCardProps) {
  const hasHeader = title || description || icon || action;

  return (
    <section
      className={cn(
        'rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 shadow-brand-soft backdrop-blur',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-col gap-3 border-b border-brand-border/60 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-0.5 text-brand-primary">{icon}</div>}
            <div>
              {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
              {description && <p className="text-sm text-brand-muted">{description}</p>}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={cn(padded ? 'px-6 py-6' : '')}>{children}</div>

      {footer && <div className="border-t border-brand-border/60 px-6 py-4">{footer}</div>}
    </section>
  );
}

