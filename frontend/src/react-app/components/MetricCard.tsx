import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  description?: string;
  onClick?: () => void;
  href?: string;
  tooltip?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  description,
  onClick,
  href,
  tooltip
}: MetricCardProps) {
  const navigate = useNavigate();
  
  const getChangeStyles = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const isClickable = onClick || href;
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  const CardContent = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted/80">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        {change && (
          <p className={`mt-2 text-sm ${getChangeStyles()}`}>
            {change}
          </p>
        )}
        {description && (
          <p className="mt-3 text-xs text-brand-muted">{description}</p>
        )}
      </div>
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border/60 bg-brand-surface/80 text-brand-primary">
          {icon}
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <button
        onClick={handleClick}
        className={`group w-full rounded-2xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 text-left shadow-brand-soft transition hover:border-brand-primary/50 hover:shadow-brand-soft/80 ${isClickable ? 'cursor-pointer' : ''}`}
        title={tooltip || (href ? `Ver detalhes de ${title.toLowerCase()}` : undefined)}
      >
        {CardContent}
      </button>
    );
  }

  return (
    <div className="group rounded-2xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft transition hover:border-brand-primary/50 hover:shadow-brand-soft/80" title={tooltip}>
      {CardContent}
    </div>
  );
}
