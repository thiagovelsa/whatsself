import { ReactNode, useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Users,
  Settings,
  FileText,
  GitBranch,
  BarChart3,
  Shield,
  QrCode,
  Menu,
  X,
  LogOut,
  WifiOff,
} from 'lucide-react';
import ToastStack from './ToastStack';
import NetworkBanner from './NetworkBanner';
import WhatsAppConnectionBanner from './WhatsAppConnectionBanner';
import StatusBadge from './StatusBadge';
import GlobalSearch from './GlobalSearch';
import { useAuthStore } from '@/react-app/stores/useAuthStore';
import { useUnifiedSystemStatus } from '@/react-app/hooks/useSystemStatusLive';
import { websocketService } from '@/react-app/services/websocketService';
import { useSystemStore } from '@/react-app/stores/useSystemStore';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'QR Code', href: '/qr', icon: QrCode },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Gatilhos', href: '/triggers', icon: Shield },
  { name: 'Fluxos', href: '/flows', icon: GitBranch },
  { name: 'Mensagens', href: '/messages', icon: MessageSquare },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(websocketService.isConnected());
  const { status, whatsappConnection } = useUnifiedSystemStatus();
  const lastEvent = useSystemStore((state) => state.lastEvent);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  // Monitor WebSocket connection state
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionChange((connected) => {
      setWsConnected(connected);
    });
    return unsubscribe;
  }, []);

  // Reagir a eventos de WebSocket para manter dados de sistema/mensagens em tempo quase real
  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'message_received':
      case 'message_sent':
        // Mensagens e métricas relacionadas
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['system'] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        break;
      case 'config_updated':
        // Configurações podem alterar limites e comportamento do sistema
        queryClient.invalidateQueries({ queryKey: ['system'] });
        break;
      default:
        break;
    }
  }, [lastEvent, queryClient]);

  const menuItems = useMemo(
    () =>
      navigation.filter(
        (item) => item.href !== '/settings' || user?.role === 'admin'
      ),
    [user]
  );

  const whatsappStatus = useMemo(() => {
    switch (whatsappConnection) {
      case 'online':
        return { label: 'WhatsApp conectado', value: 'online' as const };
      case 'connecting':
        return { label: 'Sincronizando...', value: 'connecting' as const };
      default:
        return { label: 'Offline', value: 'offline' as const };
    }
  }, [whatsappConnection]);

  return (
    <div className="min-h-screen bg-brand-gradient text-brand-text">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-brand-border/60 bg-brand-surface/95 backdrop-blur-xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
        >
          <div className="flex h-full flex-col">
            <div className="px-6 pb-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-brand-muted/80">WhatsSelf</p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">Painel</h1>
                </div>
                <button
                  className="rounded-lg border border-brand-border/60 p-2 text-brand-muted hover:text-white lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Fechar navegação"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm text-brand-muted">Automação segura para WhatsApp Business</p>
            </div>

            <nav className="flex-1 space-y-1 px-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${isActive
                        ? 'border-brand-primary/60 bg-brand-primary/15 text-white shadow-brand-soft'
                        : 'border-transparent text-brand-muted hover:border-brand-border/60 hover:bg-brand-surfaceElevated/40 hover:text-white'
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? 'text-brand-primary' : 'text-brand-muted group-hover:text-brand-primary'
                        }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 pb-6 pt-4">
              <div className="rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'WS'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user?.name || 'Operador'}</p>
                    <p className="text-xs text-brand-muted">{user?.email || 'admin@whatself.com'}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-lg border border-brand-border/60 p-2 text-brand-muted transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
                    title="Sair"
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu lateral"
          />
        )}

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
          <NetworkBanner />
          <WhatsAppConnectionBanner />

          <header className="sticky top-0 z-20 border-b border-brand-border/60 bg-brand-surface/85 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-xl border border-brand-border/60 bg-brand-surfaceElevated/60 p-2 text-brand-muted transition hover:text-white lg:hidden"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label="Abrir menu lateral"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-brand-muted/70">WhatsSelf</p>
                  <h2 className="text-lg font-semibold text-white">Central de Operações</h2>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={whatsappStatus.value}>{whatsappStatus.label}</StatusBadge>
                {!wsConnected && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1">
                    <WifiOff className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-300">WS Offline</span>
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-right text-xs text-brand-muted">
                  <span>Taxa de fila: {status?.queue?.length ?? 0} pendentes</span>
                  <span>Mensagens/min: {status?.rateLimit?.sentLastMinute ?? 0}/{status?.rateLimit?.globalLimit ?? 12}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1">
            <ToastStack />
            <GlobalSearch />
            <main className="relative z-10 px-6 py-8 lg:px-10 lg:py-10">
              <div className="mx-auto w-full max-w-6xl space-y-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
