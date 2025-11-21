import { useEffect } from 'react';
import { useSystemStore } from '../stores/useSystemStore';
import { useSystemStatus } from './useApi';
import { getWhatsappConnectionState } from '../lib/whatsappStatus';
import { useNetworkStore } from '../stores/useNetworkStore';
import type { SystemStatus } from '../types';
import type { WhatsappConnectionState } from '../lib/whatsappStatus';

export interface UnifiedSystemStatus {
  status: SystemStatus | null;
  whatsappConnection: WhatsappConnectionState;
  loading: boolean;
  error: Error | null;
  isBackendHealthy: boolean;
}

/**
 * Hook unificado que combina WebSocket (tempo real) com HTTP (bootstrap/fallback)
 * para fornecer uma única fonte de verdade sobre o estado do sistema.
 *
 * - Usa a store do WebSocket como fonte primária (tempo real)
 * - Faz bootstrap via HTTP quando a store está vazia (primeiro carregamento)
 * - Calcula estado de conexão WhatsApp de forma consistente
 * - Diferencia entre problemas de backend e WhatsApp offline
 */
export function useUnifiedSystemStatus(): UnifiedSystemStatus {
  const storeStatus = useSystemStore((state) => state.status);
  const storeIsConnected = useSystemStore((state) => state.isConnected);
  const setStatus = useSystemStore((state) => state.setStatus);
  const isOnline = useNetworkStore((state) => state.isOnline);

  // Bootstrap: buscar status via HTTP se a store estiver vazia
  const {
    data: httpStatus,
    isLoading: httpLoading,
    error: httpError,
  } = useSystemStatus();

  // Propagar status HTTP para a store quando disponível e store estiver vazia
  useEffect(() => {
    if (httpStatus && !storeStatus) {
      setStatus(httpStatus);
    }
  }, [httpStatus, storeStatus, setStatus]);

  // Usar status da store (tempo real) se disponível, senão usar HTTP (bootstrap)
  const status = storeStatus || httpStatus || null;
  const loading = !status && (httpLoading || false);
  const error = httpError || null;

  // Calcular estado de conexão WhatsApp de forma consistente
  const whatsappConnection = getWhatsappConnectionState(status?.whatsapp, {
    isConnectedFlag: storeIsConnected,
  });

  // Determinar se o backend está saudável
  // Se não há status e há erro de rede, backend pode estar fora do ar
  const isBackendHealthy = isOnline && (status !== null || !error);

  return {
    status,
    whatsappConnection,
    loading,
    error,
    isBackendHealthy,
  };
}

