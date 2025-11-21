import { useMemo } from "react";
import {
  useMessages,
  useDashboardMetrics,
  useTimeseriesMetrics,
  useDashboardSummary,
} from "../../../hooks/useApi";
import { useUnifiedSystemStatus } from "../../../hooks/useSystemStatusLive";
import { useAuthStore } from "../../../stores/useAuthStore";

export function useDashboardData() {
  const user = useAuthStore((state) => state.user);

  const {
    status: systemStatus,
    whatsappConnection,
    loading: statusLoading,
    isBackendHealthy,
  } = useUnifiedSystemStatus();

  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
    dataUpdatedAt: messagesUpdatedAt,
  } = useMessages({ take: 20 });

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    dataUpdatedAt: metricsUpdatedAt,
  } = useDashboardMetrics();

  const { data: timeseriesData } = useTimeseriesMetrics();

  const {
    data: dashboardSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useDashboardSummary();

  // Computed values
  const isAdminUser = user?.role === "admin";
  const loading = statusLoading || messagesLoading || metricsLoading || summaryLoading;

  // Metrics
  const messagesCount = metrics?.totalMessages || 0;
  const contactsCount = metrics?.totalContacts || 0;
  const todayMessages = metrics?.todayMessages || 0;
  const sentMessages = metrics?.sentMessages || 0;
  const failedMessages = metrics?.failedMessages || 0;
  const automationRate = metrics?.automationRate || 0;

  // System status values
  const queueSize = systemStatus?.queue?.length || 0;
  const circuitBreakerState = systemStatus?.circuitBreaker?.state || "CLOSED";
  const rateLimitUsage = systemStatus?.rateLimit?.sentLastMinute ?? 0;
  const rateLimitMax = systemStatus?.rateLimit?.globalLimit ?? 12;
  const failureRate = systemStatus?.circuitBreaker?.failureRate ?? 0;

  // Dashboard summary values
  const healthCards = dashboardSummary?.healthCards ?? [];
  const quickRecommendations = dashboardSummary?.quickRecommendations ?? [];
  const quickStats = dashboardSummary?.quickStats;

  // Computed highlights
  const todayMessagesHighlight = dashboardSummary?.metrics.todayMessages ?? todayMessages;
  const queueHighlight = quickStats?.queueLength ?? queueSize;
  const automationRateRaw = quickStats?.automationRate ?? automationRate;
  const automationRateHighlight = automationRateRaw / 100;

  // Recent messages
  const recentMessages = useMemo(() => {
    return (messages || []).slice(0, 5);
  }, [messages]);

  // Chart data
  const chartData = useMemo(() => {
    if (!timeseriesData?.timeseries) return [];
    return timeseriesData.timeseries.map((point) => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      return {
        label: `${hour}h`,
        value: point.total,
      };
    });
  }, [timeseriesData]);

  const pieData = useMemo(() => {
    if (!timeseriesData?.statusDistribution) return [];
    const dist = timeseriesData.statusDistribution;
    return [
      { label: "Enviadas", value: dist.sent, color: "#10b981" },
      { label: "Entregues", value: dist.delivered, color: "#3b82f6" },
      { label: "Lidas", value: dist.read, color: "#8b5cf6" },
      { label: "Falhas", value: dist.failed, color: "#ef4444" },
      { label: "Na fila", value: dist.queued, color: "#f59e0b" },
    ].filter((item) => item.value > 0);
  }, [timeseriesData]);

  // Reassurance message
  const reassuranceMessage = useMemo(() => {
    if (!dashboardSummary) {
      return "Aguardando dados em tempo real...";
    }
    if (dashboardSummary.automationPaused) {
      return "O robô está pausado. Retome quando quiser voltar a responder automaticamente.";
    }
    if (!dashboardSummary.status.whatsapp.connected) {
      return "Precisamos reconectar o WhatsApp para continuar atendendo os clientes.";
    }
    if (dashboardSummary.quickRecommendations.length === 0) {
      return "Está tudo bem por aqui ✨ Pode focar nas conversas com os clientes.";
    }
    return "Alguns pontos merecem sua atenção hoje.";
  }, [dashboardSummary]);

  // Robot status phrase
  const roboFrase = useMemo(() => {
    if (!systemStatus) return null;
    const usage = rateLimitUsage / Math.max(rateLimitMax, 1);
    if (failureRate > 0.25) {
      return 'O robô está em modo cauteloso: houve muitas falhas recentes, revise campanhas ou limites.';
    }
    if (usage > 0.8) {
      return 'Você está perto do limite de envio — mantenha o ritmo humano para evitar bloqueios.';
    }
    if (automationRateHighlight >= 70) {
      return 'Hoje estamos dentro dos limites anti-ban e automatizando bem. Pode mandar ver com responsabilidade.';
    }
    return 'O robô está pronto, mas há espaço para automatizar mais fluxos com segurança.';
  }, [systemStatus, rateLimitUsage, rateLimitMax, failureRate, automationRateHighlight]);

  return {
    // User
    user,
    isAdminUser,

    // Loading states
    loading,
    statusLoading,
    messagesLoading,
    metricsLoading,
    summaryLoading,

    // System status
    systemStatus,
    whatsappConnection,
    isBackendHealthy,
    queueSize,
    circuitBreakerState,
    rateLimitUsage,
    rateLimitMax,
    failureRate,

    // Dashboard summary
    dashboardSummary,
    healthCards,
    quickRecommendations,
    quickStats,

    // Metrics
    messagesCount,
    contactsCount,
    todayMessages,
    sentMessages,
    failedMessages,
    automationRate,

    // Highlights
    todayMessagesHighlight,
    queueHighlight,
    automationRateHighlight,

    // Messages
    recentMessages,
    messagesUpdatedAt,
    metricsUpdatedAt,

    // Chart data
    timeseriesData,
    chartData,
    pieData,

    // Computed messages
    reassuranceMessage,
    roboFrase,

    // Refetch functions
    refetchMessages,
    refetchMetrics,
    refetchSummary,
  };
}
