import { memo } from 'react';
import { Gauge } from 'lucide-react';
import type { BanRiskSummary } from '../hooks/useBanRiskSummary';

interface RiskSummarySectionProps {
  riskSummary: BanRiskSummary;
}

export const RiskSummarySection = memo(function RiskSummarySection({
  riskSummary,
}: RiskSummarySectionProps) {
  return (
    <section className="rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Resumo de risco
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-brand-muted">Risco de ban:</span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                riskSummary.level === 'low'
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                  : riskSummary.level === 'medium'
                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                    : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
              }`}
            >
              {riskSummary.label.toUpperCase()}
            </span>
          </div>
        </div>
        <p className="text-xs text-brand-muted/80 sm:max-w-md">
          {riskSummary.description}
        </p>
      </div>
      <p className="mt-3 text-[11px] text-brand-muted/70">
        {riskSummary.recommendation}
      </p>
    </section>
  );
});

export default RiskSummarySection;
