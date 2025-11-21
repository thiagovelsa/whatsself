import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  useKeyboardShortcuts,
  commonShortcuts,
} from "../../hooks/useKeyboardShortcuts";
import MetricCard from "@/react-app/components/MetricCard";
import StatusBadge from "@/react-app/components/StatusBadge";
import LastUpdated from "@/react-app/components/LastUpdated";
import SimpleChart from "@/react-app/components/SimpleChart";
import {
  MessageSquare,
  Users,
  AlertCircle,
  Activity,
  Send,
  RefreshCw,
  Gauge,
  ShieldAlert,
  Sparkles,
  MailCheck,
  Trash2,
  PauseCircle,
  Bell,
  Radio,
} from "lucide-react";

import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardActions } from "./hooks/useDashboardActions";
import { DailyPanelSection } from "./components/DailyPanelSection";

export default function Dashboard() {
  const navigate = useNavigate();

  // Get all dashboard data
  const {
    user,
    isAdminUser,
    loading,
    summaryLoading,
    systemStatus,
    whatsappConnection,
    isBackendHealthy,
    queueSize,
    circuitBreakerState,
    rateLimitUsage,
    rateLimitMax,
    failureRate,
    dashboardSummary,
    healthCards,
    quickRecommendations,
    todayMessages,
    sentMessages,
    contactsCount,
    failedMessages,
    automationRate,
    messagesCount,
    todayMessagesHighlight,
    queueHighlight,
    automationRateHighlight,
    recentMessages,
    messagesUpdatedAt,
    metricsUpdatedAt,
    timeseriesData,
    chartData,
    pieData,
    reassuranceMessage,
    roboFrase,
    refetchMessages,
    refetchMetrics,
    refetchSummary,
  } = useDashboardData();

  // Get all dashboard actions
  const {
    isSendingTest,
    isTogglingAutomation,
    refetch,
    handleQuickRefresh,
    handleSendTestMessage,
    handleToggleAutomation,
    handleNavigateAction,
    handleClearDashboard,
  } = useDashboardActions({
    refetchMessages,
    refetchMetrics,
    refetchSummary,
    dashboardSummary,
    isAdminUser,
  });

  // Auto-refetch on WebSocket reconnect
  useEffect(() => {
    const handleReconnect = () => {
      refetch();
      refetchMessages();
      refetchMetrics();
      refetchSummary();
    };

    window.addEventListener("websocket:reconnected", handleReconnect);
    return () => {
      window.removeEventListener("websocket:reconnected", handleReconnect);
    };
  }, [refetch, refetchMessages, refetchMetrics, refetchSummary]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "r",
      ctrl: true,
      action: handleQuickRefresh,
      description: "Atualizar dados",
    },
    {
      key: "m",
      ctrl: true,
      action: commonShortcuts.navigateToMessages(navigate),
      description: "Ir para Mensagens",
    },
    {
      key: "c",
      ctrl: true,
      shift: true,
      action: commonShortcuts.navigateToContacts(navigate),
      description: "Ir para Contatos (Ctrl+Shift+C)",
    },
    {
      key: "q",
      ctrl: true,
      action: commonShortcuts.navigateToQR(navigate),
      description: "Ir para QR Code",
    },
  ]);

  return (
    <div className="space-y-9">
      {/* Daily Panel Section */}
      <DailyPanelSection
        reassuranceMessage={reassuranceMessage}
        todayMessagesHighlight={todayMessagesHighlight}
        queueHighlight={queueHighlight}
        automationRateHighlight={automationRateHighlight}
        roboFrase={roboFrase}
        healthCards={healthCards}
        summaryLoading={summaryLoading}
        dashboardSummary={dashboardSummary}
        isAdminUser={isAdminUser}
        isSendingTest={isSendingTest}
        isTogglingAutomation={isTogglingAutomation}
        onSendTestMessage={handleSendTestMessage}
        onToggleAutomation={handleToggleAutomation}
        onQuickRefresh={handleQuickRefresh}
      />

      {/* Robot Config Section */}
      <section className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft">
        <h3 className="text-lg font-semibold text-white">Configuração do robô</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Ajuste as engrenagens que controlam limites, horários e mensagens automáticas.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-left text-sm text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <span>
              <span className="block font-semibold">Ajustar limites e horários</span>
              <span className="text-xs text-brand-muted">Configurar cadência, janela comercial e anti-ban.</span>
            </span>
            <Gauge className="h-5 w-5 text-brand-primary" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="flex items-center justify-between rounded-2xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-left text-sm text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <span>
              <span className="block font-semibold">Configurar mensagens automáticas</span>
              <span className="text-xs text-brand-muted">Editar templates, gatilhos e fluxos de atendimento.</span>
            </span>
            <Sparkles className="h-5 w-5 text-brand-primary" />
          </button>
        </div>
      </section>

      {/* Alerts Section */}
      <section className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/50 p-6 shadow-brand-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Alertas do dia</h2>
            <p className="text-sm text-brand-muted">
              Recomendações para manter o WhatsSelf 100% estável
            </p>
          </div>
          <Bell className="h-6 w-6 text-brand-muted" />
        </div>
        <div className="mt-6 space-y-4">
          {!dashboardSummary && summaryLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`alert-skeleton-${index}`}
                className="h-16 animate-pulse rounded-2xl border border-brand-border/50 bg-brand-surface/60"
              />
            ))
          ) : quickRecommendations.length === 0 ? (
            <div className="rounded-2xl border border-brand-border/50 bg-brand-surface/70 px-4 py-5 text-sm text-brand-muted">
              Tudo em ordem por aqui. Nenhuma ação é necessária neste momento. ✨
            </div>
          ) : (
            quickRecommendations.map((alert: any) => (
              <div
                key={alert.id}
                className="flex gap-3 rounded-2xl border border-brand-border/50 bg-brand-surface/70 px-4 py-4"
              >
                <Sparkles className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="text-sm text-brand-muted">{alert.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Automation Paused Banner */}
      {dashboardSummary?.automationPaused && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-900/20 p-4 shadow-brand-soft">
          <div className="flex flex-col gap-3 text-sm text-amber-100 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <PauseCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold text-white">Automação pausada</p>
                <p>A fila está aguardando. Retome quando estiver pronto.</p>
              </div>
            </div>
            <button
              onClick={handleToggleAutomation}
              disabled={isTogglingAutomation}
              className="inline-flex items-center justify-center rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500/10 disabled:cursor-not-allowed"
            >
              {isTogglingAutomation ? 'Atualizando...' : 'Retomar agora'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Section */}
      <section className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-muted">Ações rápidas</p>
            <h3 className="text-2xl font-semibold text-white">Operar atendimento agora</h3>
            <p className="text-sm text-brand-muted">
              Automações responderam {Math.round(automationRateHighlight * 100)}% das mensagens hoje — use as ações abaixo
              para complementar com atendimento manual ou em lote.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => handleNavigateAction('send')}
              className="rounded-2xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-left text-sm text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <Send className="h-4 w-4" />
                Nova mensagem
              </div>
              <p className="mt-1 text-xs text-brand-muted">Atalho para abrir o modal 1:1.</p>
            </button>
            <button
              onClick={() => handleNavigateAction('broadcast')}
              className="rounded-2xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-left text-sm text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <Radio className="h-4 w-4" />
                Broadcast
              </div>
              <p className="mt-1 text-xs text-brand-muted">Enviar para leads qualificados.</p>
            </button>
            <button
              onClick={() => handleNavigateAction('bulk')}
              className="rounded-2xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-left text-sm text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-4 w-4" />
                Responder em lote
              </div>
              <p className="mt-1 text-xs text-brand-muted">Seleciona conversas e aplica templates.</p>
            </button>
          </div>
        </div>
      </section>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">Visão geral</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-brand-muted">
              Bem-vindo, {user?.name || "Operador"}! Aqui você acompanha em tempo real o status do WhatsApp, fila de mensagens e proteções do sistema.
            </p>
            <LastUpdated updatedAt={metricsUpdatedAt || messagesUpdatedAt} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleQuickRefresh}
            className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/60 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/50 hover:text-brand-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar dados
          </button>
          <button
            onClick={handleClearDashboard}
            className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/60 px-4 py-2 text-sm font-medium text-white transition hover:border-rose-500/50 hover:text-rose-400"
            title="Limpar cache e recarregar todos os dados"
          >
            <Trash2 className="h-4 w-4" />
            Limpar
          </button>
          <Link
            to="/qr"
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/20"
          >
            <Activity className="h-4 w-4" />
            Ver QR Code
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          <div className="h-64 animate-pulse rounded-3xl border border-brand-border/50 bg-brand-surface/40" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-40 animate-pulse rounded-2xl border border-brand-border/50 bg-brand-surface/40"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Status & Realtime */}
          <section className="grid gap-6 xl:grid-cols-5">
            <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-8 shadow-brand-soft xl:col-span-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">Operação em tempo real</h2>
                  <p className="mt-1 text-sm text-brand-muted">
                    Status do WhatsApp, quantidade de mensagens aguardando envio e sistema de proteção anti-ban.
                  </p>
                </div>
                <div className="flex-shrink-0 sm:ml-4">
                  <StatusBadge
                    status={
                      whatsappConnection === "online"
                        ? "online"
                        : whatsappConnection === "connecting"
                          ? "connecting"
                          : "offline"
                    }
                  >
                    {whatsappConnection === "online"
                      ? "WhatsApp conectado"
                      : whatsappConnection === "connecting"
                        ? "Sincronizando..."
                        : "WhatsApp desconectado"}
                  </StatusBadge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {/* Queue Panel */}
                <div className="rounded-2xl border border-brand-border/70 bg-brand-surface/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand-muted">Fila global</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{queueSize}</p>
                      <p className="mt-1 text-xs text-brand-muted">
                        {systemStatus?.queue?.processing ? "Processando em tempo real" : "Fila aguardando disponibilidade"}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/70 bg-brand-surfaceElevated/50 text-brand-primary">
                      <Send className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-brand-surface/90">
                    <div
                      className="h-full rounded-full bg-brand-primary/80 transition-all"
                      style={{ width: `${Math.min(100, queueSize ? Math.min(queueSize * 10, 100) : 12)}%` }}
                    />
                  </div>
                </div>

                {/* Circuit Breaker Panel */}
                <div className="rounded-2xl border border-brand-border/70 bg-brand-surface/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand-muted">Proteção anti-ban</p>
                      <div className="mt-2">
                        <StatusBadge
                          status={
                            circuitBreakerState === "CLOSED"
                              ? "online"
                              : circuitBreakerState === "HALF_OPEN"
                                ? "connecting"
                                : "error"
                          }
                        >
                          {circuitBreakerState === "CLOSED"
                            ? "Fechado"
                            : circuitBreakerState === "HALF_OPEN"
                              ? "Semi-aberto"
                              : "Aberto"}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-brand-muted">
                        Taxa de falhas: {failureRate.toFixed(0)}%.{" "}
                        {failureRate >= 25
                          ? "Sistema pausado automaticamente para evitar bloqueio."
                          : "Quando ultrapassa 25%, o sistema pausa automaticamente para evitar bloqueio."}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/70 bg-brand-surfaceElevated/50 text-rose-300">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-brand-surface/90">
                    <div
                      className={`h-full rounded-full ${
                        circuitBreakerState === "CLOSED"
                          ? "bg-emerald-400/80"
                          : circuitBreakerState === "HALF_OPEN"
                            ? "bg-amber-400/80"
                            : "bg-rose-400/80"
                      }`}
                      style={{ width: `${Math.min(100, failureRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Offline CTA */}
              {whatsappConnection === "offline" && isBackendHealthy && (
                <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">WhatsApp desconectado</p>
                      <p className="text-xs text-brand-muted mt-1">
                        Conecte seu WhatsApp Business para começar a enviar e receber mensagens automaticamente.
                      </p>
                      <Link
                        to="/qr"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/30"
                      >
                        <Activity className="h-4 w-4" />
                        Conectar WhatsApp
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Backend Unhealthy Warning */}
              {!isBackendHealthy && (
                <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Problema na conexão com o backend</p>
                      <p className="text-xs text-brand-muted mt-1">
                        Não foi possível obter o status do sistema. Verifique se o backend está rodando e acessível.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Capacity Usage Panel */}
            <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-8 shadow-brand-soft xl:col-span-2">
              <h3 className="text-lg font-semibold text-white">Uso de capacidade</h3>
              <p className="mt-1 text-sm text-brand-muted">
                Limite de mensagens por minuto para simular comportamento humano e evitar bloqueios.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-brand-muted">
                    <span>Mensagens/minuto</span>
                    <span>{rateLimitUsage}/{rateLimitMax}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-brand-surface/90">
                    <div
                      className="h-full rounded-full bg-brand-primary/80"
                      style={{ width: `${Math.min(100, Math.round((rateLimitUsage / rateLimitMax) * 100)) || 4}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-border/70 bg-brand-surface/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/70 bg-brand-surfaceElevated/50 text-brand-primary">
                      <Gauge className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Automação ativa</p>
                      <p className="text-xs text-brand-muted">
                        {automationRate}% das mensagens foram automatizadas nas últimas 24h.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Metrics */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Mensagens Hoje"
              value={todayMessages.toString()}
              description={`${messagesCount} registradas no histórico`}
              icon={<MessageSquare className="h-6 w-6" />}
              change={automationRate > 50 ? "Automação no ritmo ideal" : "Considere revisar os gatilhos"}
              changeType={automationRate > 50 ? "positive" : "neutral"}
              href="/messages"
              tooltip="Ver todas as mensagens"
            />

            <MetricCard
              title="Mensagens Enviadas"
              value={sentMessages.toString()}
              description="Volume automatizado nas últimas 24h"
              icon={<MailCheck className="h-6 w-6" />}
              href="/messages?direction=outbound"
              tooltip="Ver mensagens enviadas"
            />

            <MetricCard
              title="Total de Contatos"
              value={contactsCount.toString()}
              description="Base disponível para campanhas"
              icon={<Users className="h-6 w-6" />}
              href="/contacts"
              tooltip="Ver todos os contatos"
            />

            <MetricCard
              title="Falhas de envio"
              value={failedMessages.toString()}
              description={failedMessages === 0 ? "Tudo entregue com sucesso" : "Analise os casos com erro"}
              icon={<AlertCircle className="h-6 w-6" />}
              change={failedMessages === 0 ? "Operação estável" : "Requer atenção"}
              changeType={failedMessages === 0 ? "positive" : "negative"}
              href={failedMessages > 0 ? "/messages?status=failed" : undefined}
              tooltip={failedMessages > 0 ? "Ver mensagens com falha" : undefined}
            />
          </section>

          {/* Recent Messages & Shortcuts */}
          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 shadow-brand-soft">
              <div className="flex items-center justify-between border-b border-brand-border/60 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Mensagens recentes</h2>
                  <p className="text-sm text-brand-muted">
                    Últimas interações com seus contatos monitoradas em tempo real.
                  </p>
                </div>
                <Link to="/messages" className="text-xs font-medium text-brand-primary hover:text-brand-primary/80">
                  Ver todas →
                </Link>
              </div>

              {recentMessages.length === 0 ? (
                <div className="space-y-3 px-6 py-14 text-center text-brand-muted">
                  <MessageSquare className="mx-auto h-10 w-10 text-brand-muted/60" />
                  <p className="font-medium text-white">Nenhuma mensagem ainda</p>
                  <p className="text-sm">
                    Assim que clientes começarem a interagir, o histórico aparece aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-brand-border/40">
                  {recentMessages.map((msg: any) => (
                    <div key={msg.id} className="flex flex-col gap-3 px-6 py-5 transition hover:bg-brand-surface/60">
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge
                          status={
                            msg.status === "sent" || msg.status === "delivered"
                              ? "online"
                              : msg.status === "queued"
                                ? "connecting"
                                : "error"
                          }
                        >
                          {msg.status === "sent" ? "Enviado" : msg.status === "delivered" ? "Entregue" : msg.status === "read" ? "Lido" : msg.status === "queued" ? "Na fila" : "Falhou"}
                        </StatusBadge>
                        <span className={`rounded-full px-3 py-1 text-xs ${msg.direction === "inbound" ? "bg-blue-500/10 text-blue-200" : "bg-purple-500/10 text-purple-200"}`}>
                          {msg.direction === "inbound" ? "Recebida" : "Enviada"}
                        </span>
                        <span className="text-xs text-brand-muted">
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-xs text-brand-muted">{msg.contact?.phone || "Contato não identificado"}</span>
                      </div>
                      <p className="text-sm text-brand-text/90">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shortcuts */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft">
                <h3 className="text-lg font-semibold text-white">Atalhos rápidos</h3>
                <p className="mt-1 text-sm text-brand-muted">
                  Acesse os módulos mais usados para agir sem sair do dashboard.
                </p>
                <div className="mt-5 space-y-4">
                  <Link
                    to="/messages"
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 px-4 py-3 transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <MessageSquare className="h-5 w-5 text-brand-primary" />
                    <div>
                      <p className="text-sm font-medium text-white">Ver mensagens</p>
                      <p className="text-xs text-brand-muted">Histórico completo e envio manual</p>
                    </div>
                  </Link>
                  <Link
                    to="/contacts"
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 px-4 py-3 transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <Users className="h-5 w-5 text-brand-primary" />
                    <div>
                      <p className="text-sm font-medium text-white">Gerenciar contatos</p>
                      <p className="text-xs text-brand-muted">Segmentação e status de opt-in</p>
                    </div>
                  </Link>
                  <Link
                    to="/templates"
                    className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 px-4 py-3 transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <Sparkles className="h-5 w-5 text-brand-primary" />
                    <div>
                      <p className="text-sm font-medium text-white">Templates automatizados</p>
                      <p className="text-xs text-brand-muted">Ajuste mensagens disparadas por gatilhos</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Charts */}
          {timeseriesData && (
            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft">
                <h3 className="text-lg font-semibold text-white mb-4">Mensagens por hora (últimas 24h)</h3>
                <div className="h-64">
                  <SimpleChart type="line" height={256} data={chartData} />
                </div>
                <div className="mt-4 flex gap-4 text-xs text-brand-muted">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-brand-primary/80" />
                    <span>Total: {timeseriesData.timeseries.reduce((sum: number, p: any) => sum + p.total, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-400/80" />
                    <span>Enviadas: {timeseriesData.timeseries.reduce((sum: number, p: any) => sum + p.sent, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-400/80" />
                    <span>Recebidas: {timeseriesData.timeseries.reduce((sum: number, p: any) => sum + p.received, 0)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-brand-border/70 bg-brand-surfaceElevated/60 p-6 shadow-brand-soft">
                <h3 className="text-lg font-semibold text-white mb-4">Distribuição de status</h3>
                <div className="h-64">
                  <SimpleChart type="pie" height={256} data={pieData} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-brand-muted">
                  {timeseriesData.statusDistribution &&
                    Object.entries(timeseriesData.statusDistribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="capitalize">
                          {status === "queued" ? "Na fila" : status === "delivered" ? "Entregues" : status === "sent" ? "Enviadas" : status === "read" ? "Lidas" : "Falhas"}
                        </span>
                        <span className="font-medium text-white">{count as number}</span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
