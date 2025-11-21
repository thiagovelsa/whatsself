import { memo } from 'react';

export type ConfigCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
};

export const ConfigCard = memo(function ConfigCard({
  icon,
  title,
  description,
  children
}: ConfigCardProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-6 shadow-brand-soft">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-brand-border/50 bg-brand-surface/70 p-3">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-brand-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
});

export default ConfigCard;
