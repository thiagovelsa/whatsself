import { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useUnifiedSystemStatus } from '../hooks/useSystemStatusLive';
import { apiService } from '../services/apiService';
import { notificationActions } from '../stores/useNotificationStore';

export default function WhatsAppConnectionBanner() {
    const { whatsappConnection } = useUnifiedSystemStatus();
    const [isReconnecting, setIsReconnecting] = useState(false);

    if (whatsappConnection !== 'offline') return null;

    const handleReconnect = async () => {
        if (isReconnecting) return;
        setIsReconnecting(true);
        try {
            await apiService.system.reconnect();
            notificationActions.notify({
                message: 'Solicitação de reconexão enviada. Aguarde...',
                type: 'info',
            });
        } catch (error) {
            console.error('Failed to reconnect:', error);
            notificationActions.notify({
                message: 'Falha ao tentar reconectar. Tente novamente.',
                type: 'error',
            });
        } finally {
            // Keep loading state for a bit to prevent spam
            setTimeout(() => setIsReconnecting(false), 5000);
        }
    };

    return (
        <div className="w-full bg-rose-900/90 border-b border-rose-700 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-800 rounded-full animate-pulse">
                        <WifiOff className="h-5 w-5 text-rose-200" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">WhatsApp Desconectado</p>
                        <p className="text-xs text-rose-200">O sistema não está processando mensagens.</p>
                    </div>
                </div>
                <button
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`h-4 w-4 ${isReconnecting ? 'animate-spin' : ''}`} />
                    {isReconnecting ? 'Reconectando...' : 'Reconectar Agora'}
                </button>
            </div>
        </div>
    );
}
