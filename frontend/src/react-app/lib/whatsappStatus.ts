export type WhatsappStatus = {
  ready: boolean;
  connected: boolean;
};

export type WhatsappConnectionState = 'online' | 'offline' | 'connecting';

/**
 * Derive a simplified connection state from WhatsApp status flags.
 * - online: connected && ready (or explicit isConnectedFlag)
 * - connecting: connected && !ready
 * - offline: anything else
 */
export function getWhatsappConnectionState(
  status: WhatsappStatus | null | undefined,
  options?: { isConnectedFlag?: boolean }
): WhatsappConnectionState {
  const isConnectedFlag = options?.isConnectedFlag ?? false;
  const connected = status?.connected ?? false;
  const ready = status?.ready ?? false;

  if (isConnectedFlag || (connected && ready)) {
    return 'online';
  }

  if (connected && !ready) {
    return 'connecting';
  }

  return 'offline';
}

