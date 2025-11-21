import { memo } from "react";
import { Link } from "react-router-dom";
import {
  PhoneCall,
  PauseCircle,
  PlayCircle,
  Activity,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Button from "@/react-app/components/Button";

interface HealthCard {
  id: string;
  status: string;
  title: string;
  message: string;
}

interface DailyPanelSectionProps {
  reassuranceMessage: string;
  todayMessagesHighlight: number;
  queueHighlight: number;
  automationRateHighlight: number;
  roboFrase: string | null;
  healthCards: HealthCard[];
  summaryLoading: boolean;
  dashboardSummary: any;
  isAdminUser: boolean;
  isSendingTest: boolean;
  isTogglingAutomation: boolean;
  onSendTestMessage: () => void;
  onToggleAutomation: () => void;
  onQuickRefresh: () => void;
}

const healthCardStyles = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
} as const;

export const DailyPanelSection = memo(function DailyPanelSection({
  reassuranceMessage,
  todayMessagesHighlight,
  queueHighlight,
  automationRateHighlight,
  roboFrase,
  healthCards,
  summaryLoading,
  dashboardSummary,
  isAdminUser,
  isSendingTest,
  isTogglingAutomation,
  onSendTestMessage,
  onToggleAutomation,
  onQuickRefresh,
}: DailyPanelSectionProps) {
  return (
    <section className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-8 shadow-brand-soft">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-muted">
            Painel diário
          </p>
          <h2 className="text-3xl font-semibold text-white">
            Como está o robô agora?
          </h2>
          <p className="text-sm text-brand-muted">{reassuranceMessage}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
              <p className="text-xs uppercase tracking-wide text-brand-muted">
                Mensagens hoje
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {todayMessagesHighlight}
              </p>
              <p className="text-xs text-brand-muted">
                Contatos atendidos desde meia-noite
              </p>
            </div>
            <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
              <p className="text-xs uppercase tracking-wide text-brand-muted">
                Fila global
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {queueHighlight}
              </p>
              <p className="text-xs text-brand-muted">
                Mensagens aguardando envio no momento
              </p>
            </div>
            <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
              <p className="text-xs uppercase tracking-wide text-brand-muted">
                Automação
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {Math.round(automationRateHighlight * 100)}%
              </p>
              <p className="text-xs text-brand-muted">
                Taxa de respostas automáticas do dia
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-3 lg:w-auto lg:justify-end">
          <Button
            onClick={onSendTestMessage}
            loading={isSendingTest}
            variant="secondary"
            size="md"
          >
            <PhoneCall className="h-4 w-4" />
            {isSendingTest ? "Enviando..." : "Enviar teste"}
          </Button>
          {isAdminUser && (
            <Button
              onClick={onToggleAutomation}
              loading={isTogglingAutomation}
              variant="ghost"
              size="md"
            >
              {dashboardSummary?.automationPaused ? (
                <PlayCircle className="h-4 w-4" />
              ) : (
                <PauseCircle className="h-4 w-4" />
              )}
              {dashboardSummary?.automationPaused
                ? "Retomar automação"
                : "Pausar automação"}
            </Button>
          )}
          <Link
            to="/qr"
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/20"
          >
            <Activity className="h-4 w-4" />
            QR Code
          </Link>
          <Button
            onClick={onQuickRefresh}
            variant="secondary"
            size="md"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar status
          </Button>
        </div>
      </div>

      {roboFrase && (
        <div className="mt-4 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4 text-sm text-brand-muted flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-primary" />
          <span>{roboFrase}</span>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {!dashboardSummary && summaryLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`health-skeleton-${index}`}
                className="h-28 animate-pulse rounded-2xl border border-brand-border/60 bg-brand-surface/60"
              />
            ))
          : healthCards.map((card) => {
              const tone =
                healthCardStyles[card.status as keyof typeof healthCardStyles] ||
                healthCardStyles.ok;
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border px-4 py-5 ${tone}`}
                >
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-2 text-sm text-white/80">{card.message}</p>
                </div>
              );
            })}
      </div>
    </section>
  );
});

export default DailyPanelSection;
