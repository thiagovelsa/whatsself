import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSystemStore } from "../../../stores/useSystemStore";
import { notificationActions } from "../../../stores/useNotificationStore";

interface UseDashboardActionsProps {
  refetchMessages: () => void;
  refetchMetrics: () => void;
  refetchSummary: () => Promise<any>;
  dashboardSummary: any;
  isAdminUser: boolean;
}

export function useDashboardActions({
  refetchMessages,
  refetchMetrics,
  refetchSummary,
  dashboardSummary,
  isAdminUser,
}: UseDashboardActionsProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setStatus = useSystemStore((state) => state.setStatus);

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isTogglingAutomation, setIsTogglingAutomation] = useState(false);

  // Refetch all data
  const refetch = useCallback(async () => {
    const { apiService } = await import("../../../services/apiService");
    try {
      const status = await apiService.system.getStatus();
      setStatus(status);
      await refetchSummary();
    } catch (error) {
      console.error("Failed to refetch system status:", error);
    }
  }, [setStatus, refetchSummary]);

  // Quick refresh all
  const handleQuickRefresh = useCallback(() => {
    refetch();
    refetchMessages();
    refetchMetrics();
    refetchSummary();
  }, [refetch, refetchMessages, refetchMetrics, refetchSummary]);

  // Send test message
  const handleSendTestMessage = useCallback(async () => {
    if (isSendingTest) return;
    const rawPhone = window.prompt(
      "Digite o número do seu WhatsApp com DDD (apenas números):",
    );
    if (!rawPhone) return;
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      notificationActions.notify({
        type: "error",
        message: "Informe um número válido com DDD.",
      });
      return;
    }
    setIsSendingTest(true);
    try {
      const { apiService } = await import("../../../services/apiService");
      await apiService.messages.send(
        digits,
        "Mensagem de teste do WhatsSelf ✅",
      );
      notificationActions.notify({
        type: "success",
        message: "Mensagem de teste enviada! Confira no seu WhatsApp.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem de teste.";
      notificationActions.notify({
        type: "error",
        message,
      });
    } finally {
      setIsSendingTest(false);
    }
  }, [isSendingTest]);

  // Toggle automation
  const handleToggleAutomation = useCallback(async () => {
    if (!dashboardSummary || !isAdminUser || isTogglingAutomation) return;
    setIsTogglingAutomation(true);
    try {
      const { configService } = await import("../../../services/configService");
      await configService.update({
        skipWhatsapp: !dashboardSummary.automationPaused,
      });
      notificationActions.notify({
        type: "success",
        message: dashboardSummary.automationPaused
          ? "Automação reativada!"
          : "Automação pausada. Você pode retomar quando quiser.",
      });
      await refetchSummary();
      await refetch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao atualizar o estado da automação";
      notificationActions.notify({
        type: "error",
        message,
      });
    } finally {
      setIsTogglingAutomation(false);
    }
  }, [dashboardSummary, isAdminUser, isTogglingAutomation, refetchSummary, refetch]);

  // Navigate to action
  const handleNavigateAction = useCallback(
    (action: 'send' | 'broadcast' | 'bulk') => {
      navigate(`/messages?action=${action}`);
    },
    [navigate],
  );

  // Clear dashboard cache
  const handleClearDashboard = useCallback(async () => {
    queryClient.removeQueries({ queryKey: ["messages"] });
    queryClient.removeQueries({ queryKey: ["system", "status"] });
    queryClient.removeQueries({ queryKey: ["system", "dashboard-metrics"] });
    queryClient.removeQueries({ queryKey: ["system", "dashboard-summary"] });

    await Promise.all([
      refetch(),
      refetchMessages(),
      refetchMetrics(),
      refetchSummary(),
    ]);
  }, [queryClient, refetch, refetchMessages, refetchMetrics, refetchSummary]);

  return {
    // State
    isSendingTest,
    isTogglingAutomation,

    // Actions
    refetch,
    handleQuickRefresh,
    handleSendTestMessage,
    handleToggleAutomation,
    handleNavigateAction,
    handleClearDashboard,
    navigate,
  };
}
