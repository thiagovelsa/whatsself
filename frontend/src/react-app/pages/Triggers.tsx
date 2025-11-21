import { useMemo, useState } from 'react';
import {
  useTriggers,
  useCreateTrigger,
  useUpdateTrigger,
  useDeleteTrigger,
  useTemplates,
  useFlows,
  useSimulateTrigger,
} from '../hooks/useApi';
import type { Trigger, TriggerType } from '../types';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  MessageSquare,
  GitBranch,
  Clock,
  ToggleLeft,
  ToggleRight,
  X,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import SectionCard from '@/react-app/components/SectionCard';
import EmptyState from '@/react-app/components/EmptyState';
import SkeletonBlock from '@/react-app/components/SkeletonBlock';

export default function Triggers() {
  const { data: triggers, isLoading } = useTriggers();
  const { data: templates } = useTemplates();
  const { data: flows } = useFlows();
  const createTrigger = useCreateTrigger();
  const updateTrigger = useUpdateTrigger();
  const deleteTrigger = useDeleteTrigger();
  const simulateTrigger = useSimulateTrigger();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TriggerType | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'contains' as TriggerType,
    pattern: '',
    priority: 50,
    cooldownSec: 0,
    active: true,
    responseType: 'template' as 'template' | 'flow',
    templateId: '',
    flowId: '',
  });
  const [simulateText, setSimulateText] = useState('');
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [simulateResult, setSimulateResult] = useState<
    | {
      matched: boolean;
      trigger?: Trigger;
    }
    | null
  >(null);

  const filteredTriggers = useMemo(() => {
    if (!triggers) return [];

    let filtered = [...triggers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.pattern.toLowerCase().includes(query));
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    if (filterActive === 'active') {
      filtered = filtered.filter((t) => t.active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter((t) => !t.active);
    }

    filtered.sort((a, b) => b.priority - a.priority);
    return filtered;
  }, [triggers, searchQuery, filterType, filterActive]);

  const openCreateModal = () => {
    setEditingTrigger(null);
    setFormData({
      type: 'contains',
      pattern: '',
      priority: 50,
      cooldownSec: 0,
      active: true,
      responseType: 'template',
      templateId: '',
      flowId: '',
    });
    setSimulateText('');
    setSimulateResult(null);
    setSimulateError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (trigger: Trigger) => {
    setEditingTrigger(trigger);
    setFormData({
      type: trigger.type,
      pattern: trigger.pattern,
      priority: trigger.priority,
      cooldownSec: trigger.cooldownSec,
      active: trigger.active,
      responseType: trigger.templateId ? 'template' : 'flow',
      templateId: trigger.templateId || '',
      flowId: trigger.flowId || '',
    });
    setSimulateText(trigger.pattern || '');
    setSimulateResult(null);
    setSimulateError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrigger(null);
    setSimulateText('');
    setSimulateResult(null);
    setSimulateError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      type: formData.type,
      pattern: formData.pattern,
      priority: formData.priority,
      cooldownSec: formData.cooldownSec,
      active: formData.active,
      templateId: formData.responseType === 'template' ? formData.templateId : undefined,
      flowId: formData.responseType === 'flow' ? formData.flowId : undefined,
    };

    try {
      if (editingTrigger) {
        await updateTrigger.mutateAsync({ id: editingTrigger.id, data: payload });
      } else {
        await createTrigger.mutateAsync(payload);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving trigger:', error);
    }
  };

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.id === formData.templateId),
    [templates, formData.templateId],
  );

  const selectedFlow = useMemo(
    () => flows?.find((f) => f.id === formData.flowId),
    [flows, formData.flowId],
  );

  const handleSimulate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSimulateError(null);
    setSimulateResult(null);
    const text = simulateText.trim() || formData.pattern.trim();
    if (!text) {
      setSimulateError('Digite um texto para testar o gatilho.');
      return;
    }
    try {
      const result = await simulateTrigger.mutateAsync({
        text,
        contactId: 'simulate_preview_contact',
      });
      setSimulateResult({
        matched: result.matched,
        trigger: result.trigger,
      });
    } catch (error) {
      console.error('Error simulating trigger:', error);
      setSimulateError('Não foi possível testar o gatilho agora. Tente novamente em alguns segundos.');
    }
  };

  const handleToggleActive = async (trigger: Trigger) => {
    try {
      await updateTrigger.mutateAsync({
        id: trigger.id,
        data: { active: !trigger.active },
      });
    } catch (error) {
      console.error('Error toggling trigger:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrigger.mutateAsync(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting trigger:', error);
    }
  };

  const getTypeBadge = (type: TriggerType) => {
    const styles: Record<TriggerType, string> = {
      equals: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30',
      contains: 'bg-sky-500/10 text-sky-200 border-sky-400/30',
      regex: 'bg-purple-500/10 text-purple-200 border-purple-400/30',
      number: 'bg-amber-500/10 text-amber-200 border-amber-400/30',
    };

    const labels: Record<TriggerType, string> = {
      equals: 'Exato',
      contains: 'Contém',
      regex: 'Regex',
      number: 'Número',
    };

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getPriorityIndicator = (priority: number) => {
    const color =
      priority >= 75
        ? 'bg-rose-500/80'
        : priority >= 50
          ? 'bg-amber-500/80'
          : priority >= 25
            ? 'bg-sky-500/80'
            : 'bg-slate-500/80';

    return (
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full shadow-[0_0_12px_rgba(15,118,110,0.4)] ${color}`} />
        <span className="text-sm text-brand-muted">{priority}</span>
      </div>
    );
  };

  const getResponseDisplay = (trigger: Trigger) => {
    if (trigger.templateId && trigger.template) {
      return (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <MessageSquare className="h-4 w-4 text-brand-primary" />
          <span>{trigger.template.key}</span>
        </div>
      );
    }

    if (trigger.flowId && trigger.flow) {
      return (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <GitBranch className="h-4 w-4 text-purple-400" />
          <span>{trigger.flow.name}</span>
        </div>
      );
    }

    return <span className="text-sm text-brand-muted">Sem resposta</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Gatilhos</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Gatilhos são regras que detectam palavras ou padrões nas mensagens recebidas e disparam respostas automáticas ou iniciam fluxos de conversa.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
        >
          <Plus className="h-5 w-5" />
          Novo gatilho
        </button>
      </div>

      <SectionCard
        title="Filtros"
        description="Use os filtros abaixo para encontrar gatilhos específicos por tipo, padrão ou status."
        icon={<Filter className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="Digite o padrão que o gatilho detecta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TriggerType | 'all')}
              className="w-full appearance-none rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="all">Todos os tipos</option>
              <option value="equals">Exato</option>
              <option value="contains">Contém</option>
              <option value="regex">Regex</option>
              <option value="number">Número</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full appearance-none rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-44 rounded-3xl border border-brand-border/60" />
          ))}
        </div>
      ) : filteredTriggers.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title={
            searchQuery || filterType !== 'all' || filterActive !== 'all'
              ? 'Nenhum gatilho encontrado'
              : 'Você ainda não criou nenhum gatilho'
          }
          description={
            searchQuery || filterType !== 'all' || filterActive !== 'all'
              ? 'Ajuste os filtros ou limpe a busca.'
              : 'Gatilhos detectam palavras ou padrões nas mensagens recebidas e disparam respostas automáticas. Crie seu primeiro gatilho para começar a automatizar respostas.'
          }
          action={
            !searchQuery && filterType === 'all' && filterActive === 'all' ? (
              <button
                onClick={openCreateModal}
                className="rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
              >
                Criar gatilho
              </button>
            ) : undefined
          }
          className="bg-brand-surface/60"
        />
      ) : (
        <SectionCard padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-border/50 text-sm text-brand-muted">
              <thead className="bg-brand-surface/80 text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Tipo</th>
                  <th className="px-6 py-3 text-left">Padrão</th>
                  <th className="px-6 py-3 text-left">Prioridade</th>
                  <th className="px-6 py-3 text-left">Resposta</th>
                  <th className="px-6 py-3 text-left">Cooldown</th>
                  <th className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {filteredTriggers.map((trigger) => (
                  <tr key={trigger.id} className="transition hover:bg-brand-surface/70">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(trigger)}
                        className="text-brand-primary transition hover:text-white"
                      >
                        {trigger.active ? (
                          <ToggleRight className="h-7 w-7 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-brand-muted" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(trigger.type)}</td>
                    <td className="px-6 py-4">
                      <code className="rounded border border-brand-border/60 bg-brand-surface/70 px-2 py-1 text-sm text-brand-text">
                        {trigger.pattern}
                      </code>
                    </td>
                    <td className="px-6 py-4">{getPriorityIndicator(trigger.priority)}</td>
                    <td className="px-6 py-4">{getResponseDisplay(trigger)}</td>
                    <td className="px-6 py-4">
                      {trigger.cooldownSec > 0 ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-brand-muted" />
                          <span>{trigger.cooldownSec}s</span>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(trigger)}
                          className="rounded-lg border border-brand-border/60 p-2 text-brand-primary hover:border-brand-primary/40 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {deleteConfirm === trigger.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(trigger.id)}
                              className="rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/30"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(trigger.id)}
                            className="rounded-lg border border-brand-border/60 p-2 text-rose-300 hover:border-rose-400/60 hover:text-rose-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 shadow-brand-soft backdrop-blur">
            <div className="flex items-center justify-between border-b border-brand-border/60 px-6 py-5">
              <h2 className="text-xl font-semibold text-white">
                {editingTrigger ? 'Editar gatilho' : 'Novo gatilho'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6 text-sm text-brand-muted">
              <div>
                <label className="mb-2 block font-medium text-white">Tipo de detecção (obrigatório) *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TriggerType })}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  required
                >
                  <option value="equals">Exato - mensagem deve ser exatamente igual ao padrão</option>
                  <option value="contains">Contém - mensagem contém o texto do padrão em qualquer lugar</option>
                  <option value="regex">Regex - usa expressão regular para padrões complexos</option>
                  <option value="number">Número - detecta quando a mensagem contém apenas números</option>
                </select>
                <p className="mt-1 text-xs text-brand-muted">
                  Escolha como o gatilho deve detectar o padrão na mensagem recebida.
                </p>
              </div>

              <div>
                <label className="mb-2 block font-medium text-white">Padrão a detectar (obrigatório) *</label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder={
                    formData.type === 'equals'
                      ? 'Ex: oi'
                      : formData.type === 'contains'
                        ? 'Ex: ajuda'
                        : formData.type === 'regex'
                          ? 'Ex: ^[0-9]+$'
                          : 'Ex: [0-9]+'
                  }
                  required
                />
                <p className="mt-1 text-xs text-brand-muted">
                  {formData.type === 'equals' && 'Digite exatamente o texto que deve ser detectado. Exemplo: "oi"'}
                  {formData.type === 'contains' && 'Digite o texto que deve aparecer na mensagem. Exemplo: "ajuda" detecta qualquer mensagem que contenha essa palavra.'}
                  {formData.type === 'regex' && 'Use expressão regular para padrões complexos. Exemplo: ^[0-9]+$ detecta mensagens com apenas números.'}
                  {formData.type === 'number' && 'O sistema detecta automaticamente mensagens contendo apenas números.'}
                </p>
              </div>

              <div>
                <label className="mb-2 block font-medium text-white">
                  Prioridade: <span className="text-brand-primary">{formData.priority}</span> (1=baixa, 100=alta)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full accent-brand-primary"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Quando múltiplos gatilhos detectam a mesma mensagem, o de maior prioridade é executado primeiro. Use valores altos (75-100) para gatilhos importantes e baixos (1-25) para gatilhos genéricos.
                </p>
              </div>

              <div>
                <label className="mb-2 block font-medium text-white">Tempo de espera entre ativações (segundos)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.cooldownSec}
                  onChange={(e) =>
                    setFormData({ ...formData, cooldownSec: parseInt(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Tempo mínimo em segundos que deve passar antes do mesmo gatilho poder ser ativado novamente para o mesmo contato. Use 0 para permitir ativações ilimitadas. Exemplo: 60 segundos evita spam.
                </p>
              </div>

              <div>
                <label className="mb-2 block font-medium text-white">O que acontece quando o gatilho é ativado? (obrigatório) *</label>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, responseType: 'template', flowId: '' })}
                    className={`rounded-2xl border-2 px-4 py-4 text-center transition ${formData.responseType === 'template'
                      ? 'border-brand-primary/60 bg-brand-primary/15'
                      : 'border-brand-border/60 hover:border-brand-primary/40'
                      }`}
                  >
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 text-brand-primary" />
                    <p className="font-medium text-white">Enviar template</p>
                    <p className="text-xs text-brand-muted">Envia uma mensagem única usando um template com variáveis</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, responseType: 'flow', templateId: '' })}
                    className={`rounded-2xl border-2 px-4 py-4 text-center transition ${formData.responseType === 'flow'
                      ? 'border-purple-400/60 bg-purple-500/10'
                      : 'border-brand-border/60 hover:border-purple-400/60'
                      }`}
                  >
                    <GitBranch className="mx-auto mb-2 h-8 w-8 text-purple-300" />
                    <p className="font-medium text-white">Iniciar fluxo</p>
                    <p className="text-xs text-brand-muted">Inicia uma conversa guiada em múltiplas etapas</p>
                  </button>
                </div>
              </div>

              {formData.responseType === 'template' ? (
                <div>
                  <label className="mb-2 block font-medium text-white">Template a enviar (obrigatório) *</label>
                  <select
                    value={formData.templateId}
                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                    className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    required
                  >
                    <option value="">Selecione um template</option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.key}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-brand-muted">
                    Escolha qual template será enviado quando este gatilho for ativado. Apenas templates ativos aparecem aqui.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-2 block font-medium text-white">Fluxo a iniciar (obrigatório) *</label>
                  <select
                    value={formData.flowId}
                    onChange={(e) => setFormData({ ...formData, flowId: e.target.value })}
                    className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    required
                  >
                    <option value="">Selecione um fluxo publicado</option>
                    {flows
                      ?.filter((flow) => flow.status === 'published')
                      .map((flow) => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-brand-muted">
                    Escolha qual fluxo será iniciado quando este gatilho for ativado. Apenas fluxos publicados aparecem aqui.
                  </p>
                </div>
              )}

              {/* Preview da resposta configurada */}
              <div className="rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-muted">
                  <Sparkles className="h-4 w-4 text-brand-primary" />
                  <span>Como este gatilho vai responder</span>
                </div>
                {formData.responseType === 'template' && selectedTemplate ? (
                  <div className="space-y-1 text-xs text-brand-muted">
                    <p>
                      Quando alguém disser{' '}
                      <code className="rounded border border-brand-border/60 bg-brand-surface/80 px-1 py-0.5 text-[11px] text-brand-text">
                        {formData.pattern || '(padrão ainda não definido)'}
                      </code>
                      , enviaremos:
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-2xl border border-brand-border/60 bg-brand-surface/80 p-3 text-sm text-brand-text">
                      {selectedTemplate.content.slice(0, 200)}
                      {selectedTemplate.content.length > 200 ? '…' : ''}
                    </p>
                  </div>
                ) : formData.responseType === 'flow' && selectedFlow ? (
                  <div className="space-y-1 text-xs text-brand-muted">
                    <p>
                      Quando alguém disser{' '}
                      <code className="rounded border border-brand-border/60 bg-brand-surface/80 px-1 py-0.5 text-[11px] text-brand-text">
                        {formData.pattern || '(padrão ainda não definido)'}
                      </code>
                      , iniciaremos o fluxo{' '}
                      <span className="font-medium text-white">{selectedFlow.name}</span>.
                    </p>
                    <p className="mt-1 text-[11px] text-brand-muted">
                      O fluxo pode envolver várias etapas e mensagens automáticas guiadas.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-brand-muted">
                    Escolha um template ou fluxo para ver um resumo de como este gatilho vai responder.
                  </p>
                )}
              </div>

              {/* Testar gatilho via /simulate */}
              <div className="space-y-3 rounded-2xl border border-brand-border/60 bg-brand-surface/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-brand-muted">
                    <HelpCircle className="h-4 w-4 text-brand-primary" />
                    <span>Testar gatilho com um exemplo de mensagem</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={simulateTrigger.isPending}
                    className="inline-flex items-center gap-1 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {simulateTrigger.isPending ? (
                      'Testando...'
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Testar gatilho
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={simulateText}
                    onChange={(e) => setSimulateText(e.target.value)}
                    placeholder="Digite um exemplo de mensagem (deixe vazio para usar o padrão configurado)"
                    className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                  {simulateError && (
                    <p className="text-[11px] text-rose-300">{simulateError}</p>
                  )}
                  {simulateResult && (
                    <div className="mt-1 rounded-2xl border border-brand-border/60 bg-brand-surface/80 p-3 text-[11px] text-brand-muted">
                      {!simulateResult.matched || !simulateResult.trigger ? (
                        <p>Nenhum gatilho ativo casaria com esse texto neste momento.</p>
                      ) : (
                        <div className="space-y-1">
                          <p>
                            Esse texto casaria com o gatilho{' '}
                            <code className="rounded border border-brand-border/60 bg-brand-surface/90 px-1 py-0.5 text-[11px] text-brand-text">
                              {simulateResult.trigger.pattern}
                            </code>{' '}
                            ({simulateResult.trigger.type}).
                          </p>
                          {simulateResult.trigger.templateId && (
                            <p>
                              Ele enviaria o template{' '}
                              <span className="font-medium text-white">
                                {templates?.find((t) => t.id === simulateResult.trigger?.templateId)?.key ||
                                  simulateResult.trigger.templateId}
                              </span>
                              .
                            </p>
                          )}
                          {simulateResult.trigger.flowId && (
                            <p>
                              Ele iniciaria o fluxo{' '}
                              <span className="font-medium text-white">
                                {flows?.find((f) => f.id === simulateResult.trigger?.flowId)?.name ||
                                  simulateResult.trigger.flowId}
                              </span>
                              .
                            </p>
                          )}
                          {!simulateResult.trigger.templateId && !simulateResult.trigger.flowId && (
                            <p>Este gatilho está configurado sem resposta associada.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="trigger-active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                />
                <label htmlFor="trigger-active" className="text-sm text-brand-muted">
                  Marcar como ativo (gatilho funcionando e detectando mensagens)
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-brand-border/60 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-brand-border/60 bg-brand-surface/70 px-5 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTrigger.isPending || updateTrigger.isPending}
                  className="rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createTrigger.isPending || updateTrigger.isPending
                    ? 'Salvando...'
                    : editingTrigger
                      ? 'Salvar alterações'
                      : 'Criar gatilho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

