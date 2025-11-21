import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Archive,
  Eye,
  Filter,
  X,
  AlertCircle,
  Zap,
  RefreshCw,
} from 'lucide-react';
import FlowWizard from '@/react-app/components/FlowWizard';
import {
  useFlows,
  useCreateFlow,
  useUpdateFlow,
  useDeleteFlow,
  usePublishFlow,
  useTriggers,
} from '../hooks/useApi';
import type { Flow, FlowStatus } from '../types';
import SectionCard from '@/react-app/components/SectionCard';
import EmptyState from '@/react-app/components/EmptyState';
import SkeletonBlock from '@/react-app/components/SkeletonBlock';
import FlowEditor from '@/react-app/components/FlowEditor';
import VisualFlowEditor from '@/react-app/components/VisualFlowEditor';
import { notificationActions } from '@/react-app/stores/useNotificationStore';

const STATUS_OPTIONS: Array<{ value: FlowStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'published', label: 'Publicados' },
  { value: 'archived', label: 'Arquivados' },
];

export default function Flows() {
  const navigate = useNavigate();
  const { data: flows = [], isLoading, error } = useFlows();
  const { data: triggers = [] } = useTriggers();
  const createFlow = useCreateFlow();
  const updateFlow = useUpdateFlow();
  const deleteFlow = useDeleteFlow();
  const publishFlow = usePublishFlow();


  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('list');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [statusFilter, setStatusFilter] = useState<FlowStatus | 'all'>('all');
  const [formData, setFormData] = useState({ name: '' });
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const filteredFlows = useMemo(() => {
    if (statusFilter === 'all') return flows;
    return flows.filter((flow) => flow.status === statusFilter);
  }, [flows, statusFilter]);

  const triggersByFlowId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of triggers) {
      if (t.flowId) {
        map[t.flowId] = (map[t.flowId] ?? 0) + 1;
      }
    }
    return map;
  }, [triggers]);

  const getStatusBadge = (status: FlowStatus) => {
    const badges = {
      draft: 'bg-amber-500/10 text-amber-200 border-amber-400/30',
      published: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30',
      archived: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    } satisfies Record<FlowStatus, string>;

    const labels: Record<FlowStatus, string> = {
      draft: 'Rascunho',
      published: 'Publicado',
      archived: 'Arquivado',
    };

    const tooltips: Record<FlowStatus, string> = {
      draft: 'Fluxo em edição, ainda não está ativo',
      published: 'Fluxo ativo e funcionando',
      archived: 'Fluxo desativado, não será executado',
    };

    return (
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium ${badges[status]}`}
        title={tooltips[status]}
      >
        {labels[status]}
      </span>
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFlow.mutateAsync({
        name: formData.name,
        status: 'draft',
        version: 1,
      });
      setFormData({ name: '' });
      setIsCreateModalOpen(false);
      notificationActions.notify({ message: 'Fluxo criado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Failed to create flow:', err);
      notificationActions.notify({ message: 'Erro ao criar fluxo.', type: 'error' });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlow) return;

    try {
      await updateFlow.mutateAsync({
        id: selectedFlow.id,
        data: { name: formData.name },
      });
      setFormData({ name: '' });
      setIsEditModalOpen(false);
      setSelectedFlow(null);
      notificationActions.notify({ message: 'Fluxo atualizado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Failed to update flow:', err);
      notificationActions.notify({ message: 'Erro ao atualizar fluxo.', type: 'error' });
    }
  };

  const handlePublish = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja publicar este flow? Ele ficará ativo no sistema.')) return;

    setPublishingId(flowId);
    try {
      await publishFlow.mutateAsync(flowId);
      notificationActions.notify({ message: 'Fluxo publicado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Failed to publish flow:', err);
      notificationActions.notify({ message: 'Erro ao publicar fluxo.', type: 'error' });
    } finally {
      setPublishingId(null);
    }
  };

  const handleArchive = async (flow: Flow) => {
    if (!confirm('Tem certeza que deseja arquivar este flow? Ele será desativado.')) return;

    try {
      await updateFlow.mutateAsync({
        id: flow.id,
        data: { status: 'archived' },
      });
      notificationActions.notify({ message: 'Fluxo arquivado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Failed to archive flow:', err);
      notificationActions.notify({ message: 'Erro ao arquivar fluxo.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este flow? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteFlow.mutateAsync(id);
      notificationActions.notify({ message: 'Fluxo excluído com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Failed to delete flow:', err);
      notificationActions.notify({ message: 'Erro ao excluir fluxo.', type: 'error' });
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '' });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (flow: Flow) => {
    setSelectedFlow(flow);
    setFormData({ name: flow.name });
    setIsEditModalOpen(true);
  };

  const openStepsModal = (flow: Flow) => {
    setSelectedFlow(flow);
    setIsStepsModalOpen(true);
  };



  const errorMessage =
    error instanceof Error ? error.message : 'Erro ao carregar fluxos. Tente novamente em instantes.';

  const flowsContent = (() => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-56 border border-brand-border/60" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="Erro ao carregar fluxos"
          description={errorMessage}
          className="bg-brand-surface/60"
        />
      );
    }

    if (filteredFlows.length === 0) {
      return (
        <EmptyState
          icon={<Archive className="h-12 w-12" />}
          title={
            statusFilter === 'all'
              ? 'Você ainda não criou nenhum fluxo'
              : 'Nenhum fluxo encontrado para este status'
          }
          description={
            statusFilter === 'all'
              ? 'Fluxos são conversas automatizadas em múltiplas etapas. Crie seu primeiro fluxo para iniciar jornadas guiadas que coletam informações e direcionam contatos através de uma sequência de passos.'
              : 'Ajuste o filtro ou crie um novo fluxo para esta categoria.'
          }
          action={
            <button
              onClick={openCreateModal}
              className="rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
            >
              Criar flow
            </button>
          }
          className="bg-brand-surface/60"
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredFlows.map((flow) => {
          const stepPreview = (flow.steps ?? []).slice(0, 3);
          const triggerCount = triggersByFlowId[flow.id] ?? 0;

          return (
            <div
              key={flow.id}
              className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-6 transition hover:border-brand-primary/40"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold text-white">{flow.name}</h3>
                  {getStatusBadge(flow.status)}
                </div>
              </div>

              <div className="space-y-2 text-sm text-brand-muted">
                <div className="flex items-center justify-between">
                  <span>Steps</span>
                  <span className="text-white">{flow.steps?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versão</span>
                  <span className="text-white">v{flow.version}</span>
                </div>
              </div>

              {stepPreview.length > 0 && (
                <div className="mt-3 rounded-2xl border border-brand-border/60 bg-brand-surface/80 p-3">
                  <p className="mb-2 text-xs font-medium text-brand-muted">
                    Mini timeline deste fluxo
                  </p>
                  <ol className="space-y-1 text-xs text-brand-muted">
                    {stepPreview.map((step, index) => (
                      <li key={step.id} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-[10px] font-semibold text-brand-primary">
                          {index + 1}
                        </span>
                        <span>
                          <span className="font-semibold text-white">{step.key}</span>{' '}
                          <span className="text-brand-muted">
                            (
                            {step.type === 'send_template'
                              ? 'envia template'
                              : step.type === 'collect_input'
                                ? 'coleta resposta'
                                : 'finaliza fluxo'}
                            )
                          </span>
                        </span>
                      </li>
                    ))}
                    {flow.steps && flow.steps.length > stepPreview.length && (
                      <li className="pl-6 text-[11px] text-brand-muted/80">
                        … +{flow.steps.length - stepPreview.length} passo(s) adicional(is)
                      </li>
                    )}
                  </ol>
                </div>
              )}

              {flow.status === 'published' && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                    Iniciado por {triggerCount} gatilho(s)
                  </span>
                  {triggerCount > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/triggers?flowId=${encodeURIComponent(flow.id)}`)}
                      className="text-xs font-medium text-brand-primary hover:text-brand-primary/80"
                    >
                      Ver gatilhos relacionados
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-brand-border/60 pt-4 text-xs font-medium text-white">
                <button
                  onClick={() => openEditModal(flow)}
                  className="rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-2 transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  <Edit className="mr-2 inline h-4 w-4" />
                  Editar
                </button>

                {flow.status === 'draft' && (
                  <button
                    onClick={() => handlePublish(flow.id)}
                    disabled={publishingId === flow.id}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {publishingId === flow.id ? (
                      <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 inline h-4 w-4" />
                    )}
                    {publishingId === flow.id ? 'Publicando...' : 'Publicar'}
                  </button>
                )}

                {flow.status === 'published' && (
                  <button
                    onClick={() => handleArchive(flow)}
                    className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-3 py-2 transition hover:bg-amber-500/25"
                  >
                    <Archive className="mr-2 inline h-4 w-4" />
                    Arquivar
                  </button>
                )}

                <button
                  onClick={() => openStepsModal(flow)}
                  className="rounded-xl border border-brand-primary/40 bg-brand-primary/15 px-3 py-2 transition hover:bg-brand-primary/25"
                >
                  <Eye className="mr-2 inline h-4 w-4" />
                  Ver steps
                </button>

                <button
                  onClick={() => handleDelete(flow.id)}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-2 transition hover:bg-rose-500/30"
                >
                  <Trash2 className="mr-2 inline h-4 w-4" />
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  })();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Fluxos</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Fluxos são conversas automatizadas em múltiplas etapas. Crie jornadas guiadas que coletam informações, enviam mensagens e direcionam contatos através de uma sequência de passos.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/30"
          >
            <Zap className="h-5 w-5" />
            Criação Rápida
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
          >
            <Plus className="h-5 w-5" />
            Novo flow
          </button>
        </div>
      </div>

      <SectionCard
        title="Filtros"
        description="Filtre os fluxos por status: rascunhos (em edição), publicados (ativos) ou arquivados (desativados)."
        icon={<Filter className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${statusFilter === option.value
                ? 'border-brand-primary/40 bg-brand-primary/15 text-brand-primary'
                : 'border-brand-border/60 bg-brand-surface/70 text-brand-muted hover:border-brand-primary/30 hover:text-brand-primary'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Lista de fluxos"
        description="Visualize e gerencie todos os seus fluxos automatizados. Clique em um fluxo para editar, publicar ou visualizar seus passos."
      >
        {flowsContent}
      </SectionCard>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Novo flow</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Nome do fluxo (obrigat��rio) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="Ex: Atendimento inicial"
                  required
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Dê um nome descritivo para identificar este fluxo. Exemplo: &quot;Atendimento
                  inicial&quot;, &quot;Coleta de dados&quot;, &quot;Suporte técnico&quot;.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createFlow.isPending}
                  className="flex-1 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createFlow.isPending ? 'Criando...' : 'Criar flow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 p-6 shadow-brand-soft backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Editar flow</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedFlow(null);
                }}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Nome do fluxo (obrigat��rio) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedFlow(null);
                  }}
                  className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateFlow.isPending}
                  className="flex-1 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateFlow.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStepsModalOpen && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl h-[700px] rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/95 p-6 shadow-brand-soft backdrop-blur flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Editar Passos: {selectedFlow.name}
                </h2>
                <p className="text-sm text-brand-muted">
                  Gerencie a sequência de mensagens e interações.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex rounded-lg bg-brand-surfaceElevated p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${viewMode === 'list'
                      ? 'bg-brand-primary text-slate-950'
                      : 'text-brand-muted hover:text-white'
                      }`}
                  >
                    Lista
                  </button>
                  <button
                    onClick={() => setViewMode('visual')}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${viewMode === 'visual'
                      ? 'bg-brand-primary text-slate-950'
                      : 'text-brand-muted hover:text-white'
                      }`}
                  >
                    Visual (Beta)
                  </button>
                </div>
                <button
                  onClick={() => setIsStepsModalOpen(false)}
                  className="text-brand-muted hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[calc(90vh-100px)] overflow-y-auto">
              {viewMode === 'list' ? (
                <FlowEditor flow={selectedFlow} />
              ) : (
                <VisualFlowEditor flow={selectedFlow} />
              )}
            </div>
          </div>
        </div>
      )}

      {isWizardOpen && (
        <FlowWizard
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            // React Query will handle refetching via hook invalidation
          }}
        />
      )}
    </div>
  );
}

