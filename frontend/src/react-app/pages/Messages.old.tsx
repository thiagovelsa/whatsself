import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, commonShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  MessageSquare,
  Send,
  Filter,
  Search,
  X,
  Clock,
  CheckCheck,
  Check,
  XCircle,
  Loader,
  Plus,
  Radio,
  Trash2,
  Sparkles,
  FileText,
  GitBranch,
} from 'lucide-react';
import {
  usePaginatedMessages,
  useSendMessage,
  useBroadcast,
  useTemplates,
  useBulkReply,
  useTriggers,
} from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import type { Message, MessageDirection, MessageStatus, Trigger, Template } from '../types';
import SectionCard from '@/react-app/components/SectionCard';
import EmptyState from '@/react-app/components/EmptyState';
import SkeletonBlock from '@/react-app/components/SkeletonBlock';
import ScrollToTop from '@/react-app/components/ScrollToTop';
import LastUpdated from '@/react-app/components/LastUpdated';

type FilterDirection = 'all' | MessageDirection;
type FilterStatus = 'all' | MessageStatus;

const HIDDEN_MESSAGES_KEY = 'messages_hidden_ids';

export default function Messages() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL query params
  const urlDirection = searchParams.get('direction') as FilterDirection | null;
  const urlStatus = searchParams.get('status') as FilterStatus | null;
  const urlSearchTerm = searchParams.get('search') ?? '';

  // Filters
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
  const [filterDirection, setFilterDirection] = useState<FilterDirection>(urlDirection || 'all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(urlStatus || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkTipDismissed, setBulkTipDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('messages_bulk_tip_dismissed') === 'true';
  });

  // Sync URL params when filters or search change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    }
    if (filterDirection !== 'all') {
      params.set('direction', filterDirection);
    }
    if (filterStatus !== 'all') {
      params.set('status', filterStatus);
    }
    setSearchParams(params, { replace: true });
  }, [filterDirection, filterStatus, searchTerm, setSearchParams]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (!action) {
      return;
    }

    if (action === 'send') {
      setShowSendModal(true);
    } else if (action === 'broadcast') {
      setShowBroadcastModal(true);
    } else if (action === 'bulk') {
      setShowBulkReplyModal(true);
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  const debouncedSearch = useDebounce(searchTerm, 500);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    dataUpdatedAt,
  } = usePaginatedMessages({
    search: debouncedSearch || undefined,
    status: filterStatus === 'all' ? undefined : filterStatus,
    direction: filterDirection === 'all' ? undefined : filterDirection,
  });

  const messages: Message[] = data?.pages.flatMap((page) => page.items) ?? [];
  const sendMessageMutation = useSendMessage();
  const broadcastMutation = useBroadcast();
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
  } = useTemplates();
  const templates = useMemo<Template[]>(() => templatesData ?? [], [templatesData]);
  const { data: triggersData } = useTriggers();
  const triggers = useMemo<Trigger[]>(() => triggersData ?? [], [triggersData]);

  const templateById = useMemo(() => {
    const map: Record<string, Template> = {};
    for (const t of templates) {
      map[t.id] = t;
    }
    return map;
  }, [templates]);

  const triggerById = useMemo(() => {
    const map: Record<string, Trigger> = {};
    for (const t of triggers) {
      map[t.id] = t;
    }
    return map;
  }, [triggers]);
  const bulkReplyMutation = useBulkReply();

  // Listen for real-time updates
  useEffect(() => {
    const handleStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Message status update received:', customEvent.detail);
      // Invalidate messages query to fetch latest status
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    const handleReconnect = () => {
      console.log('WebSocket reconnected, refreshing messages...');
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    };

    window.addEventListener('message:status:update', handleStatusUpdate);
    window.addEventListener('websocket:reconnected', handleReconnect);

    return () => {
      window.removeEventListener('message:status:update', handleStatusUpdate);
      window.removeEventListener('websocket:reconnected', handleReconnect);
    };
  }, [queryClient]);

  // Handle clear messages (cache refresh)
  const handleClearMessages = async () => {
    // Clear React Query cache for messages
    queryClient.removeQueries({ queryKey: ['messages'] });

    // Force refetch all message queries
    await refetch();
  };

  // IDs de mensagens ocultadas (persistidos localmente para não voltarem após reload)
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem(HIDDEN_MESSAGES_KEY);
    if (!saved) return new Set();
    try {
      const ids = JSON.parse(saved) as string[];
      return new Set(ids);
    } catch {
      return new Set();
    }
  });

  // Persistir ids ocultos sempre que mudar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hiddenMessageIds.size === 0) {
      localStorage.removeItem(HIDDEN_MESSAGES_KEY);
    } else {
      localStorage.setItem(
        HIDDEN_MESSAGES_KEY,
        JSON.stringify(Array.from(hiddenMessageIds)),
      );
    }
  }, [hiddenMessageIds]);

  const handleHideMessages = (ids: Iterable<string>) => {
    setHiddenMessageIds((prev) => new Set([...prev, ...ids]));
  };

  const handleClearDisplayedMessages = () => {
    if (selectedIds.size > 0) {
      handleHideMessages(selectedIds);
      deselectAll();
    } else {
      const idsToClear = new Set(messages.map((msg) => msg.id));
      handleHideMessages(idsToClear);
    }
  };

  // Filtrar mensagens localmente com base no que foi ocultado
  const displayedMessages = messages.filter(
    (msg) => !hiddenMessageIds.has(msg.id),
  );

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkReplyModal, setShowBulkReplyModal] = useState(false);
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkCustomText, setBulkCustomText] = useState('');
  const [respectOptOut, setRespectOptOut] = useState(true);
  const selectedMessagesList = displayedMessages.filter((msg) => selectedIds.has(msg.id));
  const selectedConversationCount = new Set(
    selectedMessagesList.map((msg) => msg.contactId),
  ).size;
  const dismissBulkTip = () => {
    setBulkTipDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('messages_bulk_tip_dismissed', 'true');
    }
  };

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const navigate = useNavigate();

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible
  const selectAll = () => {
    setSelectedIds(new Set(displayedMessages.map((m) => m.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Update showBulkActions based on selection
  useEffect(() => {
    setShowBulkActions(selectedIds.size > 0);
  }, [selectedIds.size]);

  // Close bulk modal when nothing is selected
  useEffect(() => {
    if (selectedIds.size === 0 && showBulkReplyModal) {
      setShowBulkReplyModal(false);
    }
  }, [selectedIds, showBulkReplyModal]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrl: true,
      action: () => refetch(),
      description: 'Atualizar mensagens',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => setShowSendModal(true),
      description: 'Nova mensagem',
    },
    {
      key: 'b',
      ctrl: true,
      action: () => setShowBroadcastModal(true),
      description: 'Broadcast',
    },
    {
      key: 'Escape',
      action: () => {
        if (showSendModal) setShowSendModal(false);
        if (showBroadcastModal) setShowBroadcastModal(false);
        if (selectedMessage) setSelectedMessage(null);
      },
      description: 'Fechar modal',
    },
    {
      key: 'd',
      ctrl: true,
      action: commonShortcuts.navigateToDashboard(navigate),
      description: 'Ir para Dashboard',
    },
  ]);

  // Form states
  const [phone, setPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState<number>(5);
  const [broadcastText, setBroadcastText] = useState('');
  const [optedInOnly, setOptedInOnly] = useState(true);

  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

  // Pre-fill message or bulk template when coming from Templates page
  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (!templateId || appliedTemplateId === templateId) {
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      return;
    }

    if (showSendModal && !messageText) {
      setMessageText(template.content);
    }

    if (showBulkReplyModal) {
      setBulkTemplateId(template.id);
    }

    setAppliedTemplateId(templateId);
  }, [
    searchParams,
    templates,
    appliedTemplateId,
    showSendModal,
    showBulkReplyModal,
    messageText,
  ]);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !messageText) return;

    try {
      await sendMessageMutation.mutateAsync({
        phone: phone.trim(),
        text: messageText.trim(),
        priority,
      });
      setPhone('');
      setMessageText('');
      setPriority(5);
      setShowSendModal(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle broadcast
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText) return;

    try {
      await broadcastMutation.mutateAsync({
        text: broadcastText.trim(),
        optedInOnly,
      });
      setBroadcastText('');
      setOptedInOnly(true);
      setShowBroadcastModal(false);
    } catch (error) {
      console.error('Failed to send broadcast:', error);
    }
  };

  const handleBulkReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    if (!bulkTemplateId && !bulkCustomText.trim()) return;

    try {
      await bulkReplyMutation.mutateAsync({
        messageIds: Array.from(selectedIds),
        templateId: bulkTemplateId || undefined,
        text: bulkCustomText.trim() || undefined,
        respectOptOut,
      });
      setShowBulkReplyModal(false);
      setBulkTemplateId('');
      setBulkCustomText('');
      setRespectOptOut(true);
      deselectAll();
    } catch (error) {
      console.error('Failed to enqueue bulk replies:', error);
    }
  };

  const canSubmitBulkReply = Boolean(
    selectedIds.size > 0 && (bulkTemplateId || bulkCustomText.trim()),
  );

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Get status badge
  const getStatusBadge = (status: MessageStatus) => {
    const configs = {
      queued: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Na fila' },
      sent: { icon: Check, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Enviada' },
      delivered: { icon: CheckCheck, color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Entregue' },
      read: { icon: CheckCheck, color: 'bg-green-500/10 text-green-300 border-green-500/20', label: 'Lida' },
      failed: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Falhou' },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-brand-primary" />
            Mensagens
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-brand-muted">
              Histórico completo de todas as mensagens enviadas e recebidas. Visualize {displayedMessages.length} mensagens de {messages.length} no total.
            </p>
            <LastUpdated updatedAt={dataUpdatedAt} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {messages.length > 0 && (
            <button
              onClick={handleClearMessages}
              className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-rose-500/50 hover:text-rose-400"
              title="Limpar cache e recarregar mensagens"
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <Radio className="h-4 w-4" />
            Broadcast
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
          >
            <Plus className="h-4 w-4" />
            Enviar mensagem
          </button>
        </div>
      </div>

      {/* Ferramentas rápidas */}
      <div className="rounded-3xl border border-brand-border/60 bg-brand-surface/70 p-6 shadow-brand-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Ferramentas de atendimento</h2>
            <p className="text-sm text-brand-muted">
              Tome ações imediatas sem sair desta página. Todas as mensagens respeitam fila, delays e humanização.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowSendModal(true)}
              className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <Send className="h-4 w-4" />
              Nova mensagem
            </button>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              <Radio className="h-4 w-4" />
              Broadcast
            </button>
            <button
              onClick={() => setShowBulkReplyModal(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/90 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Responder selecionadas
            </button>
          </div>
        </div>
        {!bulkTipDismissed && (
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-4 text-sm text-white md:flex-row md:items-center md:justify-between">
            <span>
              Selecione mensagens na lista e use <strong>Responder selecionadas</strong> para enviar templates humanizados em lote.
            </span>
            <button
              onClick={dismissBulkTip}
              className="text-xs font-semibold uppercase tracking-wide text-brand-primary hover:text-brand-primary/80"
            >
              Entendi
            </button>
          </div>
        )}
      </div>

      <SectionCard
        title="Busca e filtros"
        description="Busque mensagens por telefone, nome ou conteúdo. Filtre por status (enviada, entregue, falhou) e direção (recebida ou enviada)."
        icon={<Filter className="h-5 w-5" />}
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por telefone, nome ou conteúdo..."
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${showFilters
              ? 'border-brand-primary/40 bg-brand-primary/10 text-brand-primary'
              : 'border-brand-border/60 bg-brand-surface/70 text-white hover:border-brand-primary/40 hover:text-brand-primary'
              }`}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-4 border-t border-brand-border/60 pt-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-brand-muted">Direção</label>
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value as FilterDirection)}
                className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="all">Todas</option>
                <option value="inbound">Recebidas</option>
                <option value="outbound">Enviadas</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-brand-muted">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="all">Todos</option>
                <option value="queued">Na fila</option>
                <option value="sent">Enviada</option>
                <option value="delivered">Entregue</option>
                <option value="read">Lida</option>
                <option value="failed">Falhou</option>
              </select>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                {selectedIds.size} {selectedIds.size > 1 ? 'mensagens' : 'mensagem'} selecionada{selectedIds.size > 1 ? 's' : ''}
              </span>
              {selectedConversationCount > 0 && (
                <span className="rounded-full border border-brand-border/50 px-2 py-0.5 text-xs text-brand-muted">
                  {selectedConversationCount} conversa{selectedConversationCount > 1 ? 's' : ''} única{selectedConversationCount > 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={deselectAll}
                className="text-xs text-brand-muted hover:text-white"
              >
                Desmarcar todas
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkReplyModal(true)}
                className="flex items-center gap-2 rounded-lg border border-brand-primary/50 bg-brand-primary/20 px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/30"
                disabled={bulkReplyMutation.isPending}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Responder selecionadas
              </button>
              <button
                onClick={() => {
                  if (selectedIds.size === 0) return;
                  handleHideMessages(selectedIds);
                  deselectAll();
                }}
                className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-white transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
              >
                Ocultar selecionadas
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard
        title="Mensagens"
        description="Acompanhe o fluxo de atendimento com atualização contínua."
        icon={<MessageSquare className="h-5 w-5" />}
        action={
          <div className="flex items-center gap-2">
            {hiddenMessageIds.size > 0 && (
              <button
                onClick={() => setHiddenMessageIds(new Set())}
                className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-brand-primary/40 hover:text-brand-primary"
              >
                Mostrar ocultas
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClearDisplayedMessages}
                className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-xs font-medium text-brand-muted transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
                title={
                  selectedIds.size > 0
                    ? 'Ocultar mensagens selecionadas'
                    : 'Ocultar todas as mensagens listadas'
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                {selectedIds.size > 0 ? 'Ocultar selecionadas' : 'Ocultar todas'}
              </button>
            )}
          </div>
        }
        footer={
          hasNextPage && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Carregando...' : 'Carregar mais mensagens'}
              </button>
            </div>
          )
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 rounded-2xl border border-brand-border/60" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<XCircle className="h-10 w-10" />}
            title="Erro ao carregar mensagens"
            description="Recarregue a página ou ajuste os filtros para tentar novamente."
            className="bg-brand-surface/60"
          />
        ) : displayedMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-10 w-10" />}
            title="Nenhuma mensagem encontrada"
            description="Quando as conversas começarem a chegar, elas aparecerão aqui automaticamente."
            className="bg-brand-surface/60"
          />
        ) : (
          <div className="space-y-4">
            {/* Select All Header */}
            <div className="flex items-center justify-between px-2">
              <button
                onClick={selectedIds.size === displayedMessages.length ? deselectAll : selectAll}
                className="text-xs text-brand-muted hover:text-white"
              >
                {selectedIds.size === displayedMessages.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            </div>

            {displayedMessages.map((message: Message) => {
              const isSelected = selectedIds.has(message.id);
              return (
                <div
                  key={message.id}
                  className="flex w-full justify-center"
                >
                  <div className="w-full max-w-3xl flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(message.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                    />
                    <button
                      onClick={() => setSelectedMessage(message)}
                      className="flex-1 text-left"
                    >
                      <div
                        className={`w-full rounded-2xl border p-4 transition ${isSelected
                          ? 'border-brand-primary/60 bg-brand-primary/20'
                          : message.direction === 'inbound'
                            ? 'border-brand-border/60 bg-brand-surface/70 hover:border-brand-primary/30'
                            : 'border-brand-primary/50 bg-brand-primary/15 hover:border-brand-primary/70'
                          }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {message.contact?.name || message.contact?.phone || 'Desconhecido'}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${message.direction === 'inbound'
                                ? 'bg-blue-500/10 text-blue-200'
                                : 'bg-emerald-500/10 text-emerald-200'
                                }`}
                            >
                              {message.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                            </span>
                          </div>
                          {getStatusBadge(message.status)}
                        </div>

                        <p className="mb-2 text-sm text-brand-text whitespace-pre-wrap break-words">
                          {message.content}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{formatTimestamp(message.createdAt)}</span>
                            {message.templateId && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5"
                                title={
                                  templateById[message.templateId]?.content?.slice(0, 120) ??
                                  'Mensagem automática baseada em template'
                                }
                              >
                                <FileText className="h-3 w-3 text-brand-primary" />
                                <span>
                                  Template{' '}
                                  {templateById[message.templateId]?.key ??
                                    message.templateId.slice(0, 6)}
                                </span>
                              </span>
                            )}
                            {message.triggerId && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5"
                                title={
                                  triggerById[message.triggerId]?.pattern ??
                                  'Gatilho que originou esta mensagem'
                                }
                              >
                                <Sparkles className="h-3 w-3 text-brand-primary" />
                                <span>
                                  Trigger{' '}
                                  {triggerById[message.triggerId]?.pattern ??
                                    message.triggerId.slice(0, 6)}
                                </span>
                              </span>
                            )}
                            {message.flowInstanceId && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5"
                                title="Parte de um fluxo automatizado em andamento"
                              >
                                <GitBranch className="h-3 w-3 text-purple-300" />
                                <span>Fluxo automatizado</span>
                              </span>
                            )}
                          </div>
                          {message.contact?.phone && (
                            <span className="font-mono">{message.contact.phone}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Send Message Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Send className="h-5 w-5 text-brand-primary" />
                Enviar mensagem manualmente
              </h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Número do WhatsApp (com código do país)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5511999999999"
                  required
                  pattern="[0-9]+"
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Digite o número completo incluindo código do país (DDI) e código de área (DDD), apenas números. Exemplo para Brasil: 5511999999999 (55 = Brasil, 11 = São Paulo, 999999999 = número).
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Prioridade de envio: {priority} (1=baixa, 10=alta)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full accent-brand-primary"
                />
                <div className="mt-1 flex justify-between text-xs text-brand-muted">
                  <span>Baixa (1)</span>
                  <span>Alta (10)</span>
                </div>
                <p className="mt-1 text-xs text-brand-muted">
                  Mensagens com prioridade mais alta são enviadas primeiro na fila. Use valores altos (8-10) para mensagens urgentes e baixos (1-3) para mensagens que podem esperar.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Radio className="h-5 w-5 text-brand-primary" />
                Broadcast para contatos
              </h2>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem</label>
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Digite a mensagem para broadcast..."
                  required
                  rows={4}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="optedInOnly"
                  checked={optedInOnly}
                  onChange={(e) => setOptedInOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                />
                <label htmlFor="optedInOnly" className="text-sm text-brand-muted">
                  Enviar apenas para contatos com opt-in ativo
                </label>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <strong>Atenção:</strong> Mensagens em broadcast serão enviadas para todos os contatos{' '}
                {optedInOnly ? 'com opt-in ativo' : 'cadastrados'}. Use com responsabilidade para evitar bloqueio.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {broadcastMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Radio className="h-4 w-4" />
                      Enviar broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Reply Modal */}
      {showBulkReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-brand-primary" />
                Responder conversas selecionadas
              </h2>
              <button
                onClick={() => setShowBulkReplyModal(false)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkReplySubmit} className="space-y-4">
              <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-3 text-sm text-brand-muted">
                <p>
                  {selectedIds.size} {selectedIds.size > 1 ? 'mensagens' : 'mensagem'} selecionada{selectedIds.size > 1 ? 's' : ''} •{' '}
                  {selectedConversationCount} conversa{selectedConversationCount > 1 ? 's' : ''} única{selectedConversationCount > 1 ? 's' : ''}
                </p>
                <p className="mt-1">
                  As respostas serão enviadas uma a uma respeitando delays de digitação e limites do robô.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">Template</label>
                <select
                  value={bulkTemplateId}
                  onChange={(e) => setBulkTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <option value="">
                    {isLoadingTemplates ? 'Carregando templates...' : 'Selecione um template (opcional)'}
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.key} — {template.content.slice(0, 40)}
                      {template.content.length > 40 ? '...' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-brand-muted">
                  Deixe vazio para usar apenas a mensagem personalizada abaixo.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">Mensagem personalizada</label>
                <textarea
                  value={bulkCustomText}
                  onChange={(e) => setBulkCustomText(e.target.value)}
                  rows={4}
                  placeholder="Escreva uma mensagem rápida (opcional). Use {{nome}}, {{primeiro_nome}} ou {{telefone}}."
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/60 p-3 text-xs text-brand-muted">
                Variáveis disponíveis: <code className="font-mono text-white">{'{{nome}}'}</code>,{' '}
                <code className="font-mono text-white">{'{{primeiro_nome}}'}</code> e{' '}
                <code className="font-mono text-white">{'{{telefone}}'}</code>.
              </div>

              <label className="flex items-center gap-2 text-sm text-brand-muted">
                <input
                  type="checkbox"
                  checked={respectOptOut}
                  onChange={(e) => setRespectOptOut(e.target.checked)}
                  className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                />
                Respeitar opt-out e contatos com opt-in desligado
              </label>

              {bulkReplyMutation.isError && (
                <p className="text-sm text-rose-400">
                  {bulkReplyMutation.error instanceof Error
                    ? bulkReplyMutation.error.message
                    : 'Falha ao agendar respostas. Tente novamente.'}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkReplyModal(false)}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitBulkReply || bulkReplyMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkReplyMutation.isPending ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Enviar respostas
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Detalhes da mensagem</h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                  Contato
                </label>
                <p className="text-sm text-white">
                  {selectedMessage.contact?.name || selectedMessage.contact?.phone || 'Desconhecido'}
                </p>
                {selectedMessage.contact?.phone && (
                  <p className="font-mono text-xs text-brand-muted">{selectedMessage.contact.phone}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                  Direção
                </label>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${selectedMessage.direction === 'inbound'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-purple-500/20 text-purple-300'
                    }`}
                >
                  {selectedMessage.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                  Status
                </label>
                {getStatusBadge(selectedMessage.status)}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                  Conteúdo
                </label>
                <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-3">
                  <p className="text-sm text-white whitespace-pre-wrap break-words">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-brand-muted">
                <div>
                  <label className="mb-1 block font-medium uppercase tracking-wide">
                    Criada em
                  </label>
                  <p className="text-white">
                    {new Date(selectedMessage.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block font-medium uppercase tracking-wide">Atualizada em</label>
                  <p className="text-white">
                    {new Date(selectedMessage.updatedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {(selectedMessage.triggerId ||
                selectedMessage.flowInstanceId ||
                selectedMessage.templateId) && (
                  <div className="border-t border-brand-border/60 pt-4">
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                      Informações técnicas
                    </label>
                    <div className="space-y-1 text-xs text-brand-muted">
                      {selectedMessage.triggerId && (
                        <p>
                          <span className="font-medium">Trigger ID:</span> {selectedMessage.triggerId}
                        </p>
                      )}
                      {selectedMessage.flowInstanceId && (
                        <p>
                          <span className="font-medium">Flow Instance ID:</span>{' '}
                          {selectedMessage.flowInstanceId}
                        </p>
                      )}
                      {selectedMessage.templateId && (
                        <p>
                          <span className="font-medium">Template ID:</span> {selectedMessage.templateId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}
