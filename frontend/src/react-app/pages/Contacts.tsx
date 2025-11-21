import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Users,
  Phone,
  MessageSquare,
  Clock,
  XCircle,
  Bell,
  BellOff,
  Filter,
  Download,
  Calendar,
  Activity,
  Sparkles,
} from 'lucide-react';
import { usePaginatedContacts, useContact, useBulkReply } from '@/react-app/hooks/useApi';
import { api } from '@/react-app/lib/axios';
import { useDebounce } from '@/react-app/hooks/useDebounce';
import type { Message, FlowInstance, Contact } from '@/react-app/types';
import SectionCard from '@/react-app/components/SectionCard';
import EmptyState from '@/react-app/components/EmptyState';
import SkeletonBlock from '@/react-app/components/SkeletonBlock';
import ScrollToTop from '@/react-app/components/ScrollToTop';
import LastUpdated from '@/react-app/components/LastUpdated';

type FilterStatus = 'all' | 'optIn' | 'optOut';

export default function Contacts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'messages' | 'flows'>('info');

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
  } = usePaginatedContacts({
    search: debouncedSearch || undefined,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const contacts: Contact[] = useMemo(
    () => (data ? data.pages.flatMap((page) => page.items) : []),
    [data],
  );
  const totalContacts = data?.pages[0]?.total ?? contacts.length;

  const {
    data: selectedContact,
    isFetching: isContactLoading,
  } = useContact(selectedContactId || '');
  const bulkReplyMutation = useBulkReply();
  const [showContactBulkModal, setShowContactBulkModal] = useState(false);
  const [contactBulkText, setContactBulkText] = useState('');

  const stats = useMemo(() => {
    const total = totalContacts;
    const optInCount = contacts.filter((c) => c.optIn).length;
    const optOutCount = contacts.filter((c) => !c.optIn).length;

    return {
      total,
      optInCount,
      optOutCount,
    };
  }, [contacts, totalContacts]);

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');

    if (digits.length >= 12) {
      const countryCode = digits.slice(0, 2);
      const areaCode = digits.slice(2, 4);
      const firstPart = digits.slice(4, 9);
      const secondPart = digits.slice(9, 13);
      return `+${countryCode} ${areaCode} ${firstPart}-${secondPart}`;
    }

    return phone;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (diffDays === 1) {
      return 'Ontem';
    }

    if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleExport = () => {
    const csv = [
      ['Nome', 'Telefone', 'Opt-in', 'Data de Cadastro', 'Total de Mensagens'].join(','),
      ...contacts.map((c) =>
        [
          c.name || 'Sem nome',
          c.phone,
          c.optIn ? 'Sim' : 'Não',
          new Date(c.createdAt).toLocaleDateString('pt-BR'),
          c._count?.messages || 0,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (error) {
    return (
      <EmptyState
        icon={<XCircle className="h-10 w-10" />}
        title="Erro ao carregar contatos"
        description={error instanceof Error ? error.message : 'Erro desconhecido. Tente novamente.'}
        action={
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Recarregar
          </button>
        }
        className="h-64 bg-brand-surface/60"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Contatos</h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm text-brand-muted">
              Visualize todos os contatos que interagiram com seu WhatsApp. Veja histórico de mensagens, status de opt-in e fluxos de conversa ativos.
            </p>
            <LastUpdated updatedAt={dataUpdatedAt} />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={contacts.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </div>

      <SectionCard padded={false}>
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/60 bg-brand-surfaceElevated/50 text-brand-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-muted">Total</p>
              <p className="text-xl font-semibold text-white">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/60 bg-brand-surfaceElevated/50 text-emerald-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-muted" title="Contatos que autorizaram receber mensagens automatizadas">Com opt-in ativo</p>
              <p className="text-xl font-semibold text-white">{stats.optInCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-border/60 bg-brand-surfaceElevated/50 text-rose-300">
              <BellOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-muted" title="Contatos que solicitaram não receber mais mensagens">Com opt-out</p>
              <p className="text-xl font-semibold text-white">{stats.optOutCount}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Filtros e busca"
        description="Otimize sua lista por nome, telefone e status de opt-in."
        icon={<Filter className="h-5 w-5" />}
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="all">Todos</option>
              <option value="optIn">Com Opt-in</option>
              <option value="optOut">Opt-out</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="Lista de contatos"
          description={`Base atual com ${totalContacts} registros`}
          icon={<Users className="h-5 w-5" />}
          footer={
            hasNextPage && (
              <div className="flex justify-center">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Carregando...' : 'Carregar mais contatos'}
                </button>
              </div>
            )
          }
        >
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-24 rounded-2xl border border-brand-border/60" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="Nenhum contato encontrado"
              description="Ajuste filtros ou cadastre novos contatos para começar a operar."
              action={
                <button
                  onClick={() => setFilterStatus('all')}
                  className="rounded-lg border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Limpar filtros
                </button>
              }
              className="bg-brand-surface/60"
            />
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => {
                const isActive = selectedContactId === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setActiveTab('info');
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-brand-primary/50 bg-brand-surface/80 text-white'
                        : 'border-brand-border/60 bg-brand-surface/60 text-white hover:border-brand-primary/30 hover:bg-brand-surface/70'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-sm font-semibold text-brand-primary">
                        {getInitials(contact.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">
                            {contact.name || 'Sem nome'}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              contact.optIn
                                ? 'bg-emerald-500/10 text-emerald-200'
                                : 'bg-rose-500/10 text-rose-200'
                            }`}
                          >
                            {contact.optIn ? 'Opt-in' : 'Opt-out'}
                          </span>
                          {contact._count && contact._count.messages > 0 && (
                            <span className="rounded-full bg-brand-surface/80 px-2 py-0.5 text-xs text-brand-muted">
                              {contact._count.messages} mensagens
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-brand-muted">{formatPhone(contact.phone)}</p>
                        <p className="text-xs text-brand-muted">
                          Criado em {formatDate(contact.createdAt)}
                        </p>
                      </div>

                      <div className="hidden flex-col items-end text-xs text-brand-muted lg:flex">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5" />
                          {contact._count?.messages || 0} interações
                        </span>
                        <span className="mt-1 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Atualizado {formatDate(contact.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Detalhes do contato"
          description={
            selectedContact
              ? `Histórico e flows para ${selectedContact.name || selectedContact.phone}`
              : 'Selecione um contato para visualizar detalhes'
          }
          icon={<Sparkles className="h-5 w-5" />}
          padded={false}
        >
          <div className="px-6 py-6">
            {!selectedContactId ? (
              <EmptyState
                icon={<User className="h-10 w-10" />}
                title="Selecione um contato"
                description="Escolha um contato na lista para visualizar informações detalhadas, histórico de mensagens e flows ativos."
                className="bg-brand-surface/60"
              />
            ) : isContactLoading || !selectedContact ? (
              <div className="space-y-4">
                <SkeletonBlock className="h-20 border border-brand-border/60" />
                <SkeletonBlock className="h-36 border border-brand-border/60" />
                <SkeletonBlock className="h-40 border border-brand-border/60" />
              </div>
            ) : (
	              <>
	                <div className="flex items-center gap-4 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
	                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/15 text-base font-semibold text-brand-primary">
	                    {getInitials(selectedContact.name)}
	                  </div>
	                  <div>
	                    <p className="text-lg font-semibold text-white">
                      {selectedContact.name || 'Sem nome'}
	                    </p>
	                    <p className="text-sm text-brand-muted">{formatPhone(selectedContact.phone)}</p>
	                  </div>
	                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/messages?search=${encodeURIComponent(selectedContact.phone)}`)
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ver na aba Mensagens
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/messages?action=send&search=${encodeURIComponent(selectedContact.phone)}`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Enviar mensagem agora
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.post(`/contacts/${selectedContact.id}/flow/reset`);
                      } catch {
                        // erro silencioso por enquanto
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Resetar fluxo
                  </button>
                </div>

                <div className="mt-5 flex gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-1">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      activeTab === 'info'
                        ? 'bg-brand-primary/20 text-brand-primary'
                        : 'text-brand-muted hover:text-white'
                    }`}
                  >
                    Informações
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      activeTab === 'messages'
                        ? 'bg-brand-primary/20 text-brand-primary'
                        : 'text-brand-muted hover:text-white'
                    }`}
                  >
                    Mensagens ({selectedContact._count?.messages || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('flows')}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      activeTab === 'flows'
                        ? 'bg-brand-primary/20 text-brand-primary'
                        : 'text-brand-muted hover:text-white'
                    }`}
                  >
                    Flows ativos
                  </button>
                </div>

                <div className="mt-5">
                  {activeTab === 'info' && (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            <Phone className="mr-2 h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Telefone</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-white">
                            {formatPhone(selectedContact.phone)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            <User className="mr-2 h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Nome</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-white">
                            {selectedContact.name || 'Não informado'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            {selectedContact.optIn ? (
                              <Bell className="mr-2 h-4 w-4" />
                            ) : (
                              <BellOff className="mr-2 h-4 w-4" />
                            )}
                            <span className="text-xs uppercase tracking-wide">
                              {selectedContact.optIn ? 'Opt-in ativo' : 'Opt-out / silenciado'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-brand-muted">
                            {selectedContact.optIn
                              ? 'Este contato pode receber automações e mensagens em lote.'
                              : 'Este contato não recebe automações; apenas respostas manuais são enviadas.'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Criado em</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-white">
                            {new Date(selectedContact.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Total de mensagens</span>
                          </div>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {selectedContact._count?.messages || 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                          <div className="flex items-center text-brand-muted">
                            <Clock className="mr-2 h-4 w-4" />
                            <span className="text-xs uppercase tracking-wide">Última atualização</span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-white">
                            {formatDate(selectedContact.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'messages' && (
                    <div className="space-y-3">
                      {selectedContact.messages && selectedContact.messages.length > 0 && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setShowContactBulkModal(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Responder em lote para este contato
                          </button>
                        </div>
                      )}
                      {selectedContact.messages && selectedContact.messages.length > 0 ? (
                        selectedContact.messages.map((message: Message) => (
                          <div
                            key={message.id}
                            className={`rounded-2xl border p-4 text-sm leading-relaxed ${
                              message.direction === 'inbound'
                                ? 'border-brand-border/60 bg-brand-surface/70'
                                : 'border-brand-primary/40 bg-brand-primary/15'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 ${
                                    message.direction === 'inbound'
                                      ? 'bg-blue-500/10 text-blue-200'
                                      : 'bg-emerald-500/10 text-emerald-200'
                                  }`}
                                >
                                  {message.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                                </span>
                                <span>{message.status}</span>
                              </div>
                              <span>{formatDate(message.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-sm text-white">{message.content}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={<MessageSquare className="h-8 w-8" />}
                          title="Sem mensagens registradas"
                          description="Assim que houver interações com este contato, elas aparecerão aqui."
                          className="bg-brand-surface/60"
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'flows' && (
                    <div className="space-y-3">
                      {selectedContact.flowInstances && selectedContact.flowInstances.length > 0 ? (
                        selectedContact.flowInstances.map((instance: FlowInstance) => (
                          <div
                            key={instance.id}
                            className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-white">
                                {instance.flow?.name || 'Flow'}
                              </h4>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs ${
                                  instance.paused
                                    ? 'bg-amber-500/10 text-amber-200'
                                    : 'bg-emerald-500/10 text-emerald-200'
                                }`}
                              >
                                {instance.paused ? 'Pausado' : 'Ativo'}
                              </span>
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-brand-muted">
                              <div className="flex justify-between">
                                <span>Step atual</span>
                                <span className="text-white">{instance.currentStepKey}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Última interação</span>
                                <span className="text-white">
                                  {formatDate(instance.lastInteractionAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={<Activity className="h-8 w-8" />}
                          title="Nenhum flow em execução"
                          description="Quando este contato estiver em um fluxo automatizado, o status aparecerá aqui."
                          className="bg-brand-surface/60"
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      {selectedContact && showContactBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-brand-primary" />
                Responder em lote para este contato
              </h2>
              <button
                type="button"
                onClick={() => setShowContactBulkModal(false)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!contactBulkText.trim()) return;
                try {
                  await bulkReplyMutation.mutateAsync({
                    contactIds: [selectedContact.id],
                    text: contactBulkText.trim(),
                    respectOptOut: true,
                  });
                  setShowContactBulkModal(false);
                  setContactBulkText('');
                } catch {
                  // erro já será refletido via notifications da mutation
                }
              }}
              className="space-y-4"
            >
              <p className="text-sm text-brand-muted">
                A mensagem será enviada apenas para{' '}
                <span className="font-semibold text-white">
                  {selectedContact.name || selectedContact.phone}
                </span>
                , respeitando fila, delays e regras anti-ban.
              </p>
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Mensagem personalizada
                </label>
                <textarea
                  rows={3}
                  value={contactBulkText}
                  onChange={(e) => setContactBulkText(e.target.value)}
                  placeholder="Escreva uma mensagem rápida para este contato."
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactBulkModal(false)}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bulkReplyMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkReplyMutation.isPending ? 'Agendando...' : 'Enviar resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  );
}

