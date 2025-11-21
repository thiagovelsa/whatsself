import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useTriggers,
  useFlows,
} from '../hooks/useApi';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { Template } from '../types';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Tag,
  Code,
  Globe,
  Send,
  Sparkles,
} from 'lucide-react';
import SectionCard from '@/react-app/components/SectionCard';
import EmptyState from '@/react-app/components/EmptyState';
import SkeletonBlock from '@/react-app/components/SkeletonBlock';

interface TemplateFormData {
  key: string;
  content: string;
  variables: string;
  variants: string;
  locale: string;
  isActive: boolean;
}

export default function Templates() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useTemplates();
  const { data: triggers } = useTriggers();
  const { data: flows } = useFlows();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    key: '',
    content: '',
    variables: '',
    variants: '',
    locale: 'pt-BR',
    isActive: true
  });

  const [formErrors, setFormErrors] = useState<Partial<TemplateFormData>>({});
  const usedCounts = useMemo(() => {
    const triggerCounts: Record<string, number> = {};
    const stepCounts: Record<string, number> = {};
    if (triggers) {
      for (const t of triggers) {
        if (t.templateId) {
          triggerCounts[t.templateId] = (triggerCounts[t.templateId] ?? 0) + 1;
        }
      }
    }
    if (flows) {
      for (const flow of flows) {
        const steps = flow.steps ?? [];
        for (const step of steps) {
          if (step.templateId) {
            stepCounts[step.templateId] = (stepCounts[step.templateId] ?? 0) + 1;
          }
        }
      }
    }
    return { triggerCounts, stepCounts };
  }, [triggers, flows]);

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery.trim()) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.key.toLowerCase().includes(query) ||
        template.content.toLowerCase().includes(query) ||
        template.variables?.some((v) => v.toLowerCase().includes(query))
    );
  }, [templates, searchQuery]);

  // Extract variables from template content ({{varName}})
  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(regex);
    return Array.from(new Set(Array.from(matches, (m) => m[1])));
  };

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as { response?: { data?: { error?: unknown } } };
    const message = maybeAxios.response?.data?.error;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<TemplateFormData> = {};

    if (!formData.key.trim()) {
      errors.key = 'Chave é obrigatória';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.key)) {
      errors.key = 'Chave deve conter apenas letras, números, - e _';
    }

    if (!formData.content.trim()) {
      errors.content = 'Conteúdo é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal for new template
  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      key: '',
      content: '',
      variables: '',
      variants: '',
      locale: 'pt-BR',
      isActive: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      key: template.key,
      content: template.content,
      variables: (template.variables || []).join(', '),
      variants: (template.variants || []).join('\n'),
      locale: template.locale || 'pt-BR',
      isActive: template.isActive
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      key: '',
      content: '',
      variables: '',
      variants: '',
      locale: 'pt-BR',
      isActive: true
    });
    setFormErrors({});
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = {
      key: formData.key.trim(),
      content: formData.content.trim(),
      variables: formData.variables
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      variants: formData.variants
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean),
      locale: formData.locale.trim() || undefined,
      isActive: formData.isActive
    };

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          data: payload
        });
        showNotification('success', 'Template atualizado com sucesso!');
      } else {
        await createTemplate.mutateAsync(payload);
        showNotification('success', 'Template criado com sucesso!');
      }
      handleCloseModal();
    } catch (error: unknown) {
      showNotification('error', getErrorMessage(error, 'Erro ao salvar template'));
    }
  };

  // Delete template
  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      showNotification('success', 'Template deletado com sucesso!');
      setDeleteConfirm(null);
    } catch (error: unknown) {
      showNotification('error', getErrorMessage(error, 'Erro ao deletar template'));
    }
  };

  // Detect variables in content
  const detectedVariables = useMemo(
    () => extractVariables(formData.content),
    [formData.content]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: handleNew,
      description: 'Novo template',
    },
    {
      key: 'Escape',
      action: () => {
        if (isModalOpen) {
          handleCloseModal();
        }
        if (deleteConfirm) {
          setDeleteConfirm(null);
        }
      },
      description: 'Fechar modal',
    },
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Templates</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Crie modelos de mensagens reutilizáveis. Use variáveis como{' '}
            <span className="font-mono text-brand-primary">{'{{nome}}'}</span> para personalizar e
            múltiplas variações para tornar as respostas mais naturais.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
        >
          <Plus className="h-5 w-5" />
          Novo template
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center space-x-3 rounded-2xl border px-4 py-3 ${
            notification.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-sm text-brand-muted hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <SectionCard
        title="Buscar templates"
        description="Digite palavras-chave para encontrar templates pela chave, conteúdo ou variáveis usadas."
        icon={<Search className="h-5 w-5" />}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Buscar templates por chave, conteúdo ou variável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/70 px-10 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </SectionCard>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-48 rounded-3xl border border-brand-border/60" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredTemplates.length === 0 && !searchQuery && (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Você ainda não criou nenhum template"
          description="Templates são modelos de mensagens que você pode reutilizar. Crie seu primeiro template para começar a automatizar respostas."
          action={
            <button
              onClick={handleNew}
              className="rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
            >
              Criar template
            </button>
          }
          className="bg-brand-surface/60"
        />
      )}

      {/* No Results */}
      {!isLoading && filteredTemplates.length === 0 && searchQuery && (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Nenhum resultado encontrado"
          description="Tente outros termos ou limpe o campo de busca."
          className="bg-brand-surface/60"
        />
      )}

      {/* Templates Grid */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/60 shadow-brand-soft transition hover:border-brand-primary/30"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-brand-primary" />
                      <h3 className="text-lg font-semibold text-white">{template.key}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          template.isActive
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : 'bg-brand-surface/70 text-brand-muted'
                        }`}
                      >
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {template.locale && (
                      <div className="flex items-center gap-1 text-xs text-brand-muted">
                        <Globe className="h-3 w-3" />
                        <span>{template.locale}</span>
                      </div>
                    )}
                </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="rounded-xl border border-brand-border/60 p-2 text-brand-primary hover:border-brand-primary/40 hover:text-white"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(template.id)}
                      className="rounded-xl border border-brand-border/60 p-2 text-rose-300 hover:border-rose-400/60 hover:text-rose-100"
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/messages?action=send&templateId=${encodeURIComponent(template.id)}`,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-[11px] font-semibold text-white hover:border-brand-primary/40 hover:text-brand-primary"
                      title="Enviar uma mensagem de teste usando este template"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar teste
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/messages?action=bulk&templateId=${encodeURIComponent(template.id)}`,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-3 py-1.5 text-[11px] font-semibold text-white hover:border-brand-primary/40 hover:text-brand-primary"
                      title="Usar este template como base para respostas em lote"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Em lote
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-brand-text whitespace-pre-wrap break-words">
                    {template.content}
                  </p>
                </div>

                {template.variables && template.variables.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Code className="h-4 w-4 text-brand-primary" />
                      <span className="text-xs font-medium text-brand-muted">Variáveis:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="rounded border border-brand-primary/30 bg-brand-primary/10 px-2 py-1 text-xs text-brand-primary"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variants */}
                {template.variants && template.variants.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-brand-muted">
                      {template.variants.length} variante(s) disponível(is)
                    </span>
                  </div>
                )}

                <div className="mt-4 border-t border-brand-border/60 pt-4 text-xs text-brand-muted flex flex-wrap items-center gap-3">
                  <span>
                    Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                    Usado em {usedCounts.triggerCounts[template.id] ?? 0} gatilho(s) e{' '}
                    {usedCounts.stepCounts[template.id] ?? 0} passo(s) de fluxo
                  </span>
                </div>
              </div>

              {deleteConfirm === template.id && (
                <div className="px-6 pb-6">
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
                    <p className="mb-3 text-sm text-rose-100">
                      Tem certeza que deseja deletar este template?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteTemplate.isPending}
                        className="flex-1 rounded-xl border border-rose-400/60 bg-rose-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500/100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/80 shadow-brand-soft backdrop-blur">
            <div className="flex items-center justify-between border-b border-brand-border/60 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {editingTemplate ? 'Editar template' : 'Novo template'}
                </h2>
                {editingTemplate && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-brand-muted">
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-border/60 bg-brand-surface/80 px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                      Usado em {usedCounts.triggerCounts[editingTemplate.id] ?? 0} gatilho(s) e{' '}
                      {usedCounts.stepCounts[editingTemplate.id] ?? 0} passo(s) de fluxo
                    </span>
                    <span>
                      Alterar este template impacta automações que dependem dele.
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-full border border-brand-border/60 p-2 text-brand-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Chave do template (obrigatório) <span className="text-rose-300">*</span>
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="ex: mensagem_boas_vindas"
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${
                    formErrors.key ? 'border-rose-500/70 bg-rose-500/10' : 'border-brand-border/60 bg-brand-surface/80'
                  }`}
                  disabled={!!editingTemplate}
                />
                {formErrors.key && (
                  <p className="mt-1 text-xs text-rose-200">{formErrors.key}</p>
                )}
                <p className="mt-1 text-xs text-brand-muted">
                  Nome único para identificar este template. Use apenas letras, números, hífen (-) e underscore (_). Exemplo: mensagem_boas_vindas
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Texto da mensagem (obrigatório) <span className="text-rose-300">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Olá {{nome}}, bem-vindo! Como posso ajudar?"
                  rows={6}
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${
                    formErrors.content
                      ? 'border-rose-500/70 bg-rose-500/10'
                      : 'border-brand-border/60 bg-brand-surface/80'
                  }`}
                />
                {formErrors.content && (
                  <p className="mt-1 text-xs text-rose-200">{formErrors.content}</p>
                )}
                <p className="mt-1 text-xs text-brand-muted">
                  Digite o texto da mensagem. Use{' '}
                  <span className="font-mono text-brand-primary">{'{{nome_variavel}}'}</span> para
                  inserir dados dinâmicos que serão preenchidos automaticamente.
                </p>

                {detectedVariables.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-3">
                    <p className="mb-2 text-xs font-medium text-brand-primary">
                      Variáveis detectadas automaticamente:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map((v) => (
                        <span
                          key={v}
                          className="rounded border border-brand-primary/50 bg-brand-primary/15 px-2 py-1 text-xs text-brand-primary"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Lista de variáveis (opcional)
                </label>
                <input
                  type="text"
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder="nome, email, produto"
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Liste as variáveis separadas por vírgula. Exemplo: nome, email, telefone. Elas também são detectadas automaticamente no texto.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Variações de texto (opcional)
                </label>
                <textarea
                  value={formData.variants}
                  onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                  placeholder="Olá!&#10;Oi!&#10;Bem-vindo!"
                  rows={4}
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Digite diferentes formas de dizer a mesma coisa, uma por linha. O sistema escolherá aleatoriamente para tornar as respostas mais naturais. Exemplo: 'Olá!' na primeira linha e 'Oi!' na segunda.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-brand-muted">
                  Código do idioma (opcional)
                </label>
                <input
                  type="text"
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  placeholder="pt-BR (português do Brasil)"
                  className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white placeholder:text-brand-muted focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                <p className="mt-1 text-xs text-brand-muted">
                  Código do idioma seguindo padrão ISO. Exemplos: pt-BR, en-US, es-ES
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-border/60 bg-brand-surface/80 text-brand-primary focus:ring-brand-primary/40"
                />
                <label htmlFor="isActive" className="text-sm text-brand-muted">
                  Marcar como ativo (disponível para uso em gatilhos e fluxos)
                </label>
              </div>

              <div className="flex gap-3 border-t border-brand-border/60 pt-6">
                <button
                  type="submit"
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  <span>
                    {createTemplate.isPending || updateTemplate.isPending
                      ? 'Salvando...'
                      : 'Salvar template'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-brand-border/60 bg-brand-surface/70 px-6 py-3 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
