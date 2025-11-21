import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Smartphone, Wifi, WifiOff, CheckCircle, Loader2, QrCode as QrIcon, AlertCircle, Power } from 'lucide-react';
import StatusBadge from '@/react-app/components/StatusBadge';
import { useSystemStore } from '@/react-app/stores/useSystemStore';
import { useUnifiedSystemStatus } from '@/react-app/hooks/useSystemStatusLive';
import { useDashboardSummary } from '../hooks/useApi';
import QRCodeLib from 'qrcode';
import QRCodeFallback from '@/react-app/components/QRCodeFallback';
import { api } from '@/react-app/lib/axios';
import type { SystemStatus } from '@/react-app/types';
import Button from '@/react-app/components/Button';

export default function QRCode() {
  const qrCode = useSystemStore((state) => state.qrCode);
  const { status, whatsappConnection } = useUnifiedSystemStatus();
  const { data: dashboardSummary } = useDashboardSummary();
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [connectionTime, setConnectionTime] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  const setStatus = useSystemStore((state) => state.setStatus);
  const setConnected = useSystemStore((state) => state.setConnected);

  // Determine if WhatsApp is actually connected
  const actualIsConnected = whatsappConnection === 'online';

  const subscribeToWebSocket = useSystemStore((state) => state.subscribeToWebSocket);
  const setQRCode = useSystemStore((state) => state.setQRCode);
  const showChecklist = isDisconnecting || !actualIsConnected || !!disconnectMessage;
  const automationPaused = dashboardSummary?.automationPaused ?? false;

  const getStepState = (type: 'disconnect' | 'qr' | 'scan'): 'idle' | 'progress' | 'done' => {
    if (type === 'disconnect') {
      if (isDisconnecting) return 'progress';
      if (!actualIsConnected || disconnectMessage) return 'done';
      return 'idle';
    }
    if (type === 'qr') {
      if (actualIsConnected) return 'done';
      if (qrCode) return 'done';
      if (!actualIsConnected && (isDisconnecting || disconnectMessage)) return 'progress';
      return 'idle';
    }
    // scan
    if (actualIsConnected) return 'done';
    if (qrCode) return 'progress';
    return 'idle';
  };

  // Subscribe to WebSocket (already handled by App.tsx, but ensure subscription here for QR code events)
  useEffect(() => {
    subscribeToWebSocket({ mode: 'private' });

    // Load QR code from API as fallback if WebSocket hasn't sent it yet
    const loadInitialQR = async () => {
      try {
        const qrResponse = await api.get('/qr').catch(() => ({ data: { qr: null } }));
        if (qrResponse.data?.qr) {
          const currentQR = useSystemStore.getState().qrCode;
          if (!currentQR) {
            console.log('📱 QR Code carregado via API na inicialização');
            setQRCode(qrResponse.data.qr);
          }
        }
      } catch (error) {
        console.error('Failed to load initial QR code:', error);
      }
    };

    void loadInitialQR();

    return () => {
      // Don't unsubscribe here - App.tsx manages the main connection
      // This component just ensures it's subscribed for QR events
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executa apenas uma vez na montagem

  // Polling fallback: fetch QR code every 10 seconds when not connected and no QR available
  useEffect(() => {
    if (actualIsConnected || qrCode) {
      return; // Don't poll if connected or QR already available
    }

    const pollQR = async () => {
      try {
        const qrResponse = await api.get('/qr').catch(() => ({ data: { qr: null } }));
        if (qrResponse.data?.qr) {
          const currentQR = useSystemStore.getState().qrCode;
          if (!currentQR) {
            console.log('📱 QR Code carregado via polling');
            setQRCode(qrResponse.data.qr);
          }
        }
      } catch (error) {
        console.error('Failed to poll QR code:', error);
      }
    };

    // Poll immediately, then every 10 seconds
    pollQR();
    const interval = setInterval(pollQR, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [actualIsConnected, qrCode, setQRCode]);

  // Generate QR Code image from data
  useEffect(() => {
    console.log('QRCode component - qrCode value changed:', qrCode);
    if (!qrCode) {
      setQrCodeImage(null);
      return;
    }

    try {
      console.log('QRCode component - Generating QR image from data:', qrCode.substring(0, 50) + '...');
      QRCodeLib.toDataURL(
        qrCode,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error: unknown, url: string | undefined) => {
          if (error || !url) {
            console.error('Error generating QR code:', error);
            console.error('QR data that failed:', qrCode);
            setQrCodeImage(null);
          } else {
            console.log('QR Code image generated successfully');
            setQrCodeImage(url);
          }
        },
      );
    } catch (error) {
      console.error('Error generating QR code:', error);
      console.error('QR data that caused exception:', qrCode);
      setQrCodeImage(null);
    }
  }, [qrCode]);

  // Track connection time
  useEffect(() => {
    if (actualIsConnected && !connectionTime) {
      const now = new Date();
      setConnectionTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } else if (!actualIsConnected) {
      setConnectionTime(null);
    }
  }, [actualIsConnected, connectionTime]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Clear current QR to force regeneration
      setQRCode(null);
      
      // Fetch new QR code from API
      const qrResponse = await api.get('/qr').catch(() => ({ data: { qr: null } }));
      if (qrResponse.data?.qr) {
        setQRCode(qrResponse.data.qr);
      } else {
        // If no QR available, wait a bit and try again (backend might be generating)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResponse = await api.get('/qr').catch(() => ({ data: { qr: null } }));
        if (retryResponse.data?.qr) {
          setQRCode(retryResponse.data.qr);
        }
      }
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setDisconnectError(null);
    setDisconnectMessage(null);
    setIsDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect', { clearSession: true });
      setConnected(false);
      setQRCode(null);
      setConnectionTime(null);
      const currentStatus = useSystemStore.getState().status;
      if (currentStatus) {
        setStatus({
          ...currentStatus,
          whatsapp: {
            ready: false,
            connected: false,
          },
        });
      }
      try {
        const refreshed = await api.get<SystemStatus>('/status');
        setStatus(refreshed.data);
      } catch (statusError) {
        console.error('Failed to refresh status after disconnect:', statusError);
      }
      setDisconnectMessage('WhatsApp desconectado. Gere ou aguarde um novo QR Code para parear novamente.');
    } catch (error) {
      let message = 'Falha ao desconectar o WhatsApp';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const maybeAxios = error as { response?: { data?: { error?: string } } };
        if (maybeAxios.response?.data?.error) {
          message = maybeAxios.response.data.error;
        }
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }
      setDisconnectError(message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getConnectionStatus = () => {
    if (whatsappConnection === 'online') {
      return {
        icon: <CheckCircle className="w-6 h-6 text-green-400" />,
        title: 'WhatsApp Conectado',
        badge: 'online' as const,
        label: 'Conectado',
      };
    } else if (whatsappConnection === 'connecting' || qrCode) {
      return {
        icon: <QrIcon className="w-6 h-6 text-yellow-400" />,
        title: 'Aguardando Scan',
        badge: 'connecting' as const,
        label: 'Aguardando',
      };
    } else {
      return {
        icon: <WifiOff className="w-6 h-6 text-gray-400" />,
        title: 'Desconectado',
        badge: 'offline' as const,
        label: 'Desconectado',
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Conexão WhatsApp</h1>
        <p className="text-gray-400 mt-2">Conecte sua conta do WhatsApp Business escaneando o QR Code abaixo com seu celular. Esta conexão permite que o sistema envie e receba mensagens automaticamente.</p>
      </div>

      {/* Status Card */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gray-700 rounded-lg">
              {connectionStatus.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{connectionStatus.title}</h3>
              <StatusBadge status={connectionStatus.badge}>
                {connectionStatus.label}
              </StatusBadge>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={handleDisconnect}
              loading={isDisconnecting}
              variant="danger"
              size="md"
            >
              <Power className="w-4 h-4" />
              Desconectar
            </Button>

            {!actualIsConnected && (
              <Button
                onClick={handleRetry}
                loading={isRetrying}
                variant="secondary"
                size="md"
              >
                <RefreshCw className="w-4 h-4" />
                {qrCode ? 'Gerar novo QR Code' : 'Conectar WhatsApp'}
              </Button>
            )}
          </div>
        </div>

        {disconnectMessage && (
          <div className="mt-4 rounded-lg border border-brand-success/40 bg-brand-success/10 p-3 text-sm text-white">
            {disconnectMessage}
          </div>
        )}

        {disconnectError && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-200">
            {disconnectError}
          </div>
        )}

        {showChecklist && (
          <div className="mt-4 rounded-2xl border border-brand-border/60 bg-brand-surface/60 p-4">
            <p className="text-sm font-semibold text-white">Checklist de reconexão</p>
            <div className="mt-3 space-y-3 text-sm text-brand-muted">
              {[
                {
                  key: 'disconnect',
                  label: 'Desconectar sessão atual',
                  description: 'Clique em Desconectar e aguarde o WhatsApp reiniciar.',
                },
                {
                  key: 'qr',
                  label: 'Gerar novo QR Code',
                  description: 'Assim que aparecer, mantenha esta página aberta e aponte o celular.',
                },
                {
                  key: 'scan',
                  label: 'Escanear no aplicativo',
                  description: 'Use WhatsApp Business → Aparelhos conectados → Conectar aparelho.',
                },
              ].map((step) => {
                const state = getStepState(step.key as 'disconnect' | 'qr' | 'scan');
                return (
                  <div key={step.key} className="flex items-start gap-3 rounded-xl border border-brand-border/50 bg-brand-surface/70 p-3">
                    {state === 'done' ? (
                      <CheckCircle className="h-5 w-5 text-brand-success" />
                    ) : state === 'progress' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
                    ) : (
                      <Wifi className="h-5 w-5 text-brand-muted" />
                    )}
                    <div>
                      <p className="font-semibold text-white">{step.label}</p>
                      <p className="text-xs text-brand-muted">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected Success Message */}
        {actualIsConnected && (
          <div className="bg-brand-success/10 border border-brand-success/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-brand-success/15 rounded-lg mr-3">
                  <Smartphone className="w-5 h-5 text-brand-success" />
                </div>
                <div>
                  <p className="text-brand-success font-medium">WhatsApp conectado com sucesso!</p>
                  <p className="text-brand-muted text-sm">
                    Sessão ativa desde {connectionTime || 'agora'}
                  </p>
                </div>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-success/40 bg-brand-success/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-success/20"
              >
                <CheckCircle className="w-4 h-4" />
                Ir para Dashboard
              </Link>
            </div>
            <p className="text-brand-muted text-xs">
              Se algo der errado, use o botão <span className="font-semibold text-brand-success">Desconectar</span> acima
              para iniciar tudo de novo sem precisar encerrar o backend.
            </p>
            {automationPaused && (
              <p className="text-green-200 text-xs">
                Aten��ǜo: o rob�� foi pausado nas configura����es. Mesmo conectado, ele nǜo enviar�� mensagens automǭticas atǸ vocǦ retomar a automa��ǜo em Configura����es.
              </p>
            )}
          </div>
        )}

        {/* Circuit Breaker Warning */}
        {status?.circuitBreaker?.state === 'OPEN' && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mt-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-800 rounded-lg mr-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-red-400 font-medium">Sistema em modo de proteção</p>
                <p className="text-red-300 text-sm">
                  Taxa de falhas elevada detectada. Automação pausada temporariamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Section */}
      {!actualIsConnected && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Escanear QR Code</h2>
            <p className="text-gray-400 mt-1">Siga os passos abaixo para conectar seu WhatsApp Business ao sistema</p>
          </div>

          <div className="p-8">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* QR Code Display */}
              <div className="flex-shrink-0">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <div className="w-80 h-80 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {qrCodeImage ? (
                      <img
                        src={qrCodeImage}
                        alt="QR Code WhatsApp"
                        loading="lazy"
                        className="w-full h-full object-contain"
                      />
                    ) : qrCode ? (
                      <div className="flex flex-col items-center">
                        {/* Use fallback component if main QR generation fails */}
                        <QRCodeFallback qrData={qrCode} size={280} />
                        <p className="text-gray-600 text-xs mt-2">QR Code (Fallback Mode)</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4 p-8 text-center">
                        <WifiOff className="w-16 h-16 text-gray-400" />
                        <div>
                          <p className="text-gray-600 font-medium">Aguardando conexão</p>
                          <p className="text-gray-500 text-sm mt-1">
                            O QR Code será exibido em instantes
                          </p>
                        </div>
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin mt-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-brand-success text-slate-950 rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Abra o WhatsApp Business no seu celular</h4>
                      <p className="text-gray-400 text-sm">Certifique-se de estar usando o WhatsApp Business, não o WhatsApp comum. Se não tiver instalado, baixe na loja de aplicativos.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-brand-success text-slate-950 rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Acesse as configurações</h4>
                      <p className="text-gray-400 text-sm">No Android: toque nos três pontos (⋮) no canto superior direito e selecione "Aparelhos conectados". No iPhone: toque em "Configurações" e depois em "Aparelhos conectados".</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-brand-success text-slate-950 rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Toque em "Conectar aparelho"</h4>
                      <p className="text-gray-400 text-sm">Na tela de aparelhos conectados, toque no botão "Conectar aparelho" ou "+" para iniciar o processo de conexão.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-brand-success text-slate-950 rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Escaneie o QR Code exibido acima</h4>
                      <p className="text-gray-400 text-sm">Aponte a câmera do seu celular para o código QR exibido na tela. Mantenha o celular estável até o WhatsApp confirmar a conexão. A conexão será estabelecida automaticamente.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">
                    <strong>Dica:</strong> Certifique-se de que seu celular está conectado à internet e que você tem permissão para usar o WhatsApp Business para automação.
                  </p>
                </div>

                {!qrCode && (
                  <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm">
                      <strong>Aguarde:</strong> O sistema está inicializando a conexão com o WhatsApp. O QR Code aparecerá automaticamente quando estiver pronto. Se demorar mais de 30 segundos, clique em "Gerar novo QR Code" acima.
                    </p>
                  </div>
                )}
                {qrCode && (
                  <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                    <p className="text-blue-400 text-sm">
                      <strong>QR Code ativo:</strong> Escaneie o código acima com seu WhatsApp Business. O QR Code expira após alguns minutos. Se expirar, clique em "Gerar novo QR Code" para obter um novo código.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Status Information */}
      {status && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Status do Sistema</h2>
            <p className="text-gray-400 mt-1">Informações sobre o estado atual do sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-700">
            {/* WhatsApp Status */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {whatsappConnection === 'online' ? (
                    <Wifi className="w-5 h-5 text-green-400" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-white font-medium">WhatsApp</span>
                </div>
                <StatusBadge
                  status={
                    whatsappConnection === 'online'
                      ? 'online'
                      : whatsappConnection === 'connecting'
                      ? 'connecting'
                      : 'offline'
                  }
                >
                  {whatsappConnection === 'online'
                    ? 'Pronto'
                    : whatsappConnection === 'connecting'
                    ? 'Sincronizando...'
                    : 'Offline'}
                </StatusBadge>
              </div>
              <p className="text-gray-400 text-sm">
                {whatsappConnection === 'online'
                  ? 'Conectado e operacional'
                  : whatsappConnection === 'connecting'
                  ? 'Conexão estabelecida, sincronizando sessão'
                  : 'Aguardando conexão'}
              </p>
            </div>

            {/* Queue Status */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Fila de Mensagens</span>
                <span className="text-2xl font-bold text-green-400">{status.queue.length}</span>
              </div>
              <p className="text-gray-400 text-sm">
                {status.queue.processing ? 'Processando mensagens' : 'Aguardando'}
              </p>
            </div>

            {/* Rate Limit Status */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Taxa de Envio</span>
                <span className="text-2xl font-bold text-green-400">
                  {status.rateLimit.sentLastMinute}/{status.rateLimit.globalLimit}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Mensagens por minuto</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
