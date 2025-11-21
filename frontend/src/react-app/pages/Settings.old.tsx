import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Eye, EyeOff, Wand2, ShieldCheck, Gauge, Cpu, Clock, Plug, Server, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useConfigStore } from '@/react-app/stores/useConfigStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { ConfigUpdatePayload } from '@/react-app/types';
import AuditLogList from '@/react-app/components/AuditLogList';

type SecretFieldState = {
  value: string;
  revealed: boolean;
  regenerate: boolean;
};

type ConfigFormState = {
  defaultAdminEmail: string;
  jwtSecret: SecretFieldState;
  defaultAdminPassword: SecretFieldState;
  skipWhatsapp: boolean;
  puppeteerExecutablePath: string;
  rateMaxPerMin: number;
  ratePerContactPer5Min: number;
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
  wsPort: number;
  wsPath: string;
  humanizerMinDelaySeconds: number;
  humanizerMaxDelaySeconds: number;
  humanizerMinTypingSeconds: number;
  humanizerMaxTypingSeconds: number;
  cbWindowMode: string;
  cbMinAttempts: number;
  cbFailRateOpen: number;
  cbProbeIntervalSec: number;
  cbProbeSuccessClose: number;
  cbProbeSamples: number;
  cbCooldownInitialSec: number;
  cbCooldownMaxSec: number;
  windowsTempDir: string;
  windowsLongPathSupport: boolean;
};

const toSeconds = (ms: number): number => Math.round(ms / 1000);
const toMillis = (seconds: number): number => Math.round(seconds * 1000);

const buildInitialForm = (config: ReturnType<typeof useConfigStore.getState>['config']): ConfigFormState => ({
  defaultAdminEmail: config?.defaultAdminEmail ?? '',
  jwtSecret: {
    value: '',
    revealed: false,
    regenerate: false,
  },
  defaultAdminPassword: {
    value: '',
    revealed: false,
    regenerate: false,
  },
  skipWhatsapp: false, // SEMPRE false por padrão - WhatsApp deve estar ativo
  puppeteerExecutablePath: config?.puppeteerExecutablePath ?? '',
  rateMaxPerMin: config?.rateMaxPerMin ?? 12,
  ratePerContactPer5Min: config?.ratePerContactPer5Min ?? 2,
  businessHoursStart: config?.businessHoursStart ?? '09:00',
  businessHoursEnd: config?.businessHoursEnd ?? '18:00',
  timezone: config?.timezone ?? 'America/Sao_Paulo',
  wsPort: config?.wsPort ?? 3002,
  wsPath: config?.wsPath ?? '/socket.io',
  humanizerMinDelaySeconds: toSeconds(config?.humanizerMinDelayMs ?? 3000),
  humanizerMaxDelaySeconds: toSeconds(config?.humanizerMaxDelayMs ?? 7000),
  humanizerMinTypingSeconds: toSeconds(config?.humanizerMinTypingMs ?? 1500),
  humanizerMaxTypingSeconds: toSeconds(config?.humanizerMaxTypingMs ?? 3500),
  cbWindowMode: config?.cbWindowMode ?? '5m_or_50',
  cbMinAttempts: config?.cbMinAttempts ?? 20,
  cbFailRateOpen: config?.cbFailRateOpen ?? 0.25,
  cbProbeIntervalSec: config?.cbProbeIntervalSec ?? 45,
  cbProbeSuccessClose: config?.cbProbeSuccessClose ?? 0.9,
  cbProbeSamples: config?.cbProbeSamples ?? 10,
  cbCooldownInitialSec: config?.cbCooldownInitialSec ?? 300,
  cbCooldownMaxSec: config?.cbCooldownMaxSec ?? 1800,
  windowsTempDir: config?.windowsTempDir ?? '',
  windowsLongPathSupport: config?.windowsLongPathSupport ?? true,
});

type BanRiskLevel = 'low' | 'medium' | 'high';

type BanRiskSummary = {
  level: BanRiskLevel;
  label: 'baixo' | 'médio' | 'alto';
  description: string;
  recommendation: string;
};

const computeBanRiskSummary = (form: ConfigFormState): BanRiskSummary => {
  const {
    rateMaxPerMin,
    ratePerContactPer5Min,
    cbFailRateOpen,
    humanizerMinDelaySeconds,
    humanizerMaxDelaySeconds,
    humanizerMinTypingSeconds,
    humanizerMaxTypingSeconds,
  } = form;

  let score = 0;

  let globalScore = 0;
  if (rateMaxPerMin > 15 && rateMaxPerMin <= 25) globalScore = 1;
  else if (rateMaxPerMin > 25 && rateMaxPerMin <= 40) globalScore = 2;
  else if (rateMaxPerMin > 40) globalScore = 3;

  let perContactScore = 0;
  if (ratePerContactPer5Min > 3 && ratePerContactPer5Min <= 5) perContactScore = 1;
  else if (ratePerContactPer5Min > 5 && ratePerContactPer5Min <= 8) perContactScore = 2;
  else if (ratePerContactPer5Min > 8) perContactScore = 3;

  let cbScore = 0;
  if (cbFailRateOpen <= 0.2) cbScore = -1;
  else if (cbFailRateOpen > 0.3 && cbFailRateOpen <= 0.5) cbScore = 1;
  else if (cbFailRateOpen > 0.5) cbScore = 2;

  const shortDelays = humanizerMinDelaySeconds < 3 || humanizerMaxDelaySeconds < 7;
  const shortTyping = humanizerMinTypingSeconds < 1 || humanizerMaxTypingSeconds < 3;

  let humanScore = 0;
  if (shortDelays) humanScore += 1;
  if (shortTyping) humanScore += 1;

  score = globalScore + perContactScore + cbScore + humanScore;
  if (score < 0) score = 0;

  let level: BanRiskLevel;
  if (score <= 2) level = 'low';
  else if (score <= 5) level = 'medium';
  else level = 'high';

  const reasons: string[] = [];

  if (rateMaxPerMin > 15) {
    reasons.push('limite global acima do recomendado (10–15 msgs/min)');
  }
  if (ratePerContactPer5Min > 3) {
    reasons.push('limite por contato acima do recomendado (2–3 msgs/5min)');
  }
  if (cbFailRateOpen > 0.3) {
    reasons.push(`proteção abre tardiamente (${(cbFailRateOpen * 100).toFixed(0)}% de falhas)`);
  } else if (cbFailRateOpen < 0.2) {
    reasons.push(`proteção bem conservadora (${(cbFailRateOpen * 100).toFixed(0)}% de falhas)`);
  }
  if (shortDelays || shortTyping) {
    reasons.push('delays/tempo de digitação abaixo do recomendado');
  }

  const reasonsSummary = reasons.join(', ');

  const usesRecommendedGlobal = rateMaxPerMin >= 10 && rateMaxPerMin <= 15;
  const usesRecommendedPerContact = ratePerContactPer5Min >= 2 && ratePerContactPer5Min <= 3;
  const usesRecommendedHumanization = !shortDelays && !shortTyping;

  const label: BanRiskSummary['label'] =
    level === 'low' ? 'baixo' : level === 'medium' ? 'médio' : 'alto';

  let description: string;
  if (level === 'low') {
    if (usesRecommendedGlobal && usesRecommendedPerContact && usesRecommendedHumanization && cbFailRateOpen <= 0.25) {
      description = `Configuração conservadora: ${rateMaxPerMin}/min global, ${ratePerContactPer5Min}/contato/5min, proteção em ${(cbFailRateOpen * 100).toFixed(0)}% de falhas e humanização dentro das faixas recomendadas.`;
    } else if (reasonsSummary) {
      description = `Risco baixo, mas com pontos de atenção em ${reasonsSummary}. Para disparos mais agressivos, considere aproximar dos limites recomendados.`;
    } else {
      description = `Risco baixo: limites próximos do recomendado e humanização ligada, equilibrando velocidade e segurança.`;
    }
  } else if (level === 'medium') {
    description = reasonsSummary
      ? `Risco médio: configuração mais agressiva em ${reasonsSummary}. Avalie reduzir um pouco os limites ou aumentar os delays para ficar mais próximo do recomendado.`
      : 'Risco médio: ajustes atuais deixam o envio um pouco mais agressivo que o padrão conservador.';
  } else {
    description = reasonsSummary
      ? `Risco alto: configuração bem acima do recomendado (${reasonsSummary}). Reduza os limites e aumente a humanização para evitar bloqueios do WhatsApp.`
      : 'Risco alto: limites e proteções atuais aumentam significativamente a chance de bloqueio. Ajuste para um perfil mais conservador.';
  }

  const recommendation =
    'Sugestão rápida: manter ~10–15 msgs/min global, 2–3 por contato/5min, cbFailRateOpen em torno de 0.25 e delays/typing dentro das faixas recomendadas.';

  return {
    level,
    label,
    description,
    recommendation,
  };
};

export default function Settings() {
  const {
    config,
    meta,
    loading,
    saving,
    error,
    fetchInitial,
    save,
    revealSecret,
    detectBrowsers,
    validateBrowserPath,
    lastUpdate,
  } = useConfigStore();
  const [form, setForm] = useState<ConfigFormState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [detectedBrowsers, setDetectedBrowsers] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; resolvedPath: string } | null>(null);

  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
    if (config) {
      setForm(buildInitialForm(config));
      setDirty(false);
    }
  }, [config]);

  const handleChange = useCallback(<K extends keyof ConfigFormState>(field: K, value: ConfigFormState[K]) => {
    setForm((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
    setDirty(true);
  }, []);

  const handleSecretChange = useCallback((field: 'jwtSecret' | 'defaultAdminPassword', value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: {
          ...prev[field],
          value,
          regenerate: false,
        },
      };
    });
    setDirty(true);
  }, []);

  const toggleRegenerate = useCallback((field: 'jwtSecret' | 'defaultAdminPassword') => {
    setForm((prev) => {
      if (!prev) return prev;
      const current = prev[field];
      return {
        ...prev,
        [field]: {
          ...current,
          regenerate: !current.regenerate,
          value: '',
        },
      };
    });
    setDirty(true);
  }, []);

  const buildPayload = useCallback((): ConfigUpdatePayload | null => {
    if (!form) return null;
    const payload: ConfigUpdatePayload = {
      defaultAdminEmail: form.defaultAdminEmail,
      skipWhatsapp: form.skipWhatsapp,
      puppeteerExecutablePath: form.puppeteerExecutablePath ? form.puppeteerExecutablePath : null,
      rateMaxPerMin: Number(form.rateMaxPerMin),
      ratePerContactPer5Min: Number(form.ratePerContactPer5Min),
      wsPort: Number(form.wsPort),
      wsPath: form.wsPath,
      humanizerMinDelayMs: toMillis(form.humanizerMinDelaySeconds),
      humanizerMaxDelayMs: toMillis(form.humanizerMaxDelaySeconds),
      humanizerMinTypingMs: toMillis(form.humanizerMinTypingSeconds),
      humanizerMaxTypingMs: toMillis(form.humanizerMaxTypingSeconds),
      cbWindowMode: form.cbWindowMode,
      cbMinAttempts: Number(form.cbMinAttempts),
      cbFailRateOpen: Number(form.cbFailRateOpen),
      cbProbeIntervalSec: Number(form.cbProbeIntervalSec),
      cbProbeSuccessClose: Number(form.cbProbeSuccessClose),
      cbProbeSamples: Number(form.cbProbeSamples),
      cbCooldownInitialSec: Number(form.cbCooldownInitialSec),
      cbCooldownMaxSec: Number(form.cbCooldownMaxSec),
      windowsTempDir: form.windowsTempDir ? form.windowsTempDir : null,
      windowsLongPathSupport: form.windowsLongPathSupport,
      businessHours: {
        start: form.businessHoursStart,
        end: form.businessHoursEnd,
        timezone: form.timezone,
      },
    };

    if (form.jwtSecret.value) {
      payload.jwtSecret = form.jwtSecret.value;
    }
    if (form.defaultAdminPassword.value) {
      payload.defaultAdminPassword = form.defaultAdminPassword.value;
    }
    if (form.jwtSecret.regenerate) {
      payload.regenerateJwtSecret = true;
    }
    if (form.defaultAdminPassword.regenerate) {
      payload.regenerateAdminPassword = true;
    }

    return payload;
  }, [form]);

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;
    await save(payload);
    setDirty(false);
  }, [buildPayload, save]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 's',
      ctrl: true,
      action: () => {
        if (dirty && !isSaving) {
          void handleSave();
        }
      },
      description: 'Salvar configurações',
    },
    {
      key: 'r',
      ctrl: true,
      action: () => void fetchInitial(),
      description: 'Recarregar configurações',
    },
    {
      key: 'Escape',
      action: () => {
        if (dirty) {
          // Reset form to original values
          if (config) {
            setForm(buildInitialForm(config));
            setDirty(false);
          }
        }
      },
      description: 'Descartar alterações',
    },
  ]);

  const handleRevealSecret = async (field: 'jwtSecret' | 'defaultAdminPassword') => {
    try {
      const value = await revealSecret(field);
      handleSecretChange(field, value);
      setForm((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: {
            ...prev[field],
            revealed: true,
            regenerate: false,
          },
        };
      });
    } catch {
      // handled by store notifications
    }
  };

  const handleDetectBrowsers = async () => {
    const candidates = await detectBrowsers();
    setDetectedBrowsers(candidates);
  };

  const handleValidatePath = async () => {
    if (!form) return;
    const result = await validateBrowserPath(form.puppeteerExecutablePath);
    setValidationResult(result);
  };

  const isSaving = saving;
  const riskSummary = useMemo(() => {
    if (!form) return null;
    return computeBanRiskSummary(form);
  }, [form]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdate) return 'Nunca atualizado';
    const date = new Date(lastUpdate);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }, [lastUpdate]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-muted">
          <RefreshCw className="h-6 w-6 animate-spin" />
          Carregando configurações...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md space-y-3 rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-rose-400" />
          <p className="text-sm font-medium text-white">Não foi possível carregar as configurações.</p>
          <p className="text-xs text-brand-muted">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!form || !meta) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-brand-muted">
          <XCircle className="h-6 w-6" />
          <p className="text-sm">Configurações indisponíveis no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Configurações do Sistema</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Centralize ajustes essenciais da automação e mantenha tudo documentado. Toda alteração é auditada.
          </p>
          <p className="mt-1 text-xs text-brand-muted/80">
            Última atualização: {lastUpdatedLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => void fetchInitial()}
            className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            className="flex items-center gap-2 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </header>

      {riskSummary && (
        <section className="rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-brand-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Resumo de risco
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-brand-muted">Risco de ban:</span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${riskSummary.level === 'low'
                      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : riskSummary.level === 'medium'
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                        : 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                    }`}
                >
                  {riskSummary.label.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-xs text-brand-muted/80 sm:max-w-md">
              {riskSummary.description}
            </p>
          </div>
          <p className="mt-3 text-[11px] text-brand-muted/70">
            {riskSummary.recommendation}
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ConfigCard
          icon={<ShieldCheck className="h-5 w-5 text-brand-primary" />}
          title="Segurança"
          description="Configure credenciais de acesso e chaves de segurança. Alterações aqui afetam o acesso ao sistema."
        >
          <div className="space-y-4">
            <InputField
              label="Email padrão do administrador"
              type="email"
              value={form.defaultAdminEmail}
              onChange={(value) => handleChange('defaultAdminEmail', value)}
              helpText="Email usado para criar o primeiro usuário administrador do sistema. Use um email válido que você tenha acesso."
            />
            <SecretField
              label="Chave secreta JWT (para autenticação)"
              masked={config?.jwtSecretMasked ?? null}
              state={form.jwtSecret}
              onChange={(value) => handleSecretChange('jwtSecret', value)}
              onReveal={() => handleRevealSecret('jwtSecret')}
              onToggleRegenerate={() => toggleRegenerate('jwtSecret')}
              helpText="Chave secreta usada para assinar tokens de autenticação. Alterar esta chave invalida todas as sessões ativas. Use pelo menos 32 caracteres."
            />
            <SecretField
              label="Senha padrão do administrador"
              masked={config?.defaultAdminPasswordMasked ?? null}
              state={form.defaultAdminPassword}
              onChange={(value) => handleSecretChange('defaultAdminPassword', value)}
              onReveal={() => handleRevealSecret('defaultAdminPassword')}
              onToggleRegenerate={() => toggleRegenerate('defaultAdminPassword')}
              helpText="Senha inicial para o primeiro usuário administrador. Deve ser alterada no primeiro acesso. Use uma senha forte com pelo menos 8 caracteres."
            />
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Wand2 className="h-5 w-5 text-brand-primary" />}
          title="Assistentes"
          description="Ferramentas rápidas para detectar navegadores compatíveis e validar o caminho configurado."
        >
          <div className="space-y-3 text-xs text-brand-muted">
            {/* Botões antigos desativados */}
            {process.env.NODE_ENV === 'never' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectBrowsers}
                  className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
                >
                  <Search className="h-4 w-4" />
                  Detectar navegadores instalados
                </button>
                <button
                  type="button"
                  onClick={handleValidatePath}
                  className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Validar caminho atual
                </button>
              </div>
            )}
            {detectedBrowsers.length > 0 && (
              <div className="rounded-lg border border-brand-border/50 bg-brand-surface/70 p-3 text-xs text-brand-muted">
                <p className="font-medium text-brand-muted/80">Navegadores encontrados:</p>
                <ul className="mt-1 space-y-1">
                  {detectedBrowsers.map((candidate) => (
                    <li key={candidate}>
                      <button
                        type="button"
                        className="text-left text-brand-primary transition hover:underline"
                        onClick={() => {
                          handleChange('puppeteerExecutablePath', candidate);
                          setValidationResult(null);
                        }}
                      >
                        {candidate}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult && (
              <p
                className={`flex items-center gap-2 text-xs ${validationResult.valid ? 'text-emerald-300' : 'text-rose-300'
                  }`}
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {validationResult.valid ? 'Caminho válido:' : 'Caminho inválido:'}{' '}
                {validationResult.resolvedPath}
              </p>
            )}
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Plug className="h-5 w-5 text-brand-primary" />}
          title="Integração WhatsApp"
          description="Configure o caminho do navegador usado para conectar ao WhatsApp Web. O sistema detecta automaticamente Chrome ou Edge instalados."
        >
          <div className="space-y-4">
            {/* DESABILITADO TEMPORARIAMENTE - WhatsApp deve sempre estar ativo
            <ToggleField
              label="Desativar WhatsApp (modo manutenção)"
              checked={form.skipWhatsapp}
              onChange={(value) => handleChange('skipWhatsapp', value)}
            /> */}
            <InputField
              label="Caminho do executável do navegador"
              value={form.puppeteerExecutablePath}
              onChange={(value) => handleChange('puppeteerExecutablePath', value)}
              placeholder="Ex: C:\Program Files\Google\Chrome\Application\chrome.exe"
              helpText="Caminho completo para o executável do Chrome ou Edge. Deixe em branco para usar detecção automática. Use o botão 'Detectar navegadores' para encontrar automaticamente."
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDetectBrowsers}
                className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
              >
                <Search className="h-4 w-4" />
                Detectar navegadores
              </button>
              <button
                type="button"
                onClick={handleValidatePath}
                className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-2 text-xs font-medium text-white transition hover:border-brand-primary/40"
              >
                <ShieldCheck className="h-4 w-4" />
                Validar caminho
              </button>
            </div>
            {detectedBrowsers.length > 0 && (
              <div className="rounded-lg border border-brand-border/50 bg-brand-surface/70 p-3 text-xs text-brand-muted">
                <p className="font-medium text-brand-muted/80">Navegadores encontrados:</p>
                <ul className="mt-1 space-y-1">
                  {detectedBrowsers.map((candidate) => (
                    <li key={candidate}>
                      <button
                        type="button"
                        className="text-left text-brand-primary transition hover:underline"
                        onClick={() => {
                          handleChange('puppeteerExecutablePath', candidate);
                          setValidationResult(null);
                        }}
                      >
                        {candidate}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {validationResult && (
              <p className={`flex items-center gap-2 text-xs ${validationResult.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
                {validationResult.valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {validationResult.valid ? 'Caminho válido:' : 'Caminho inválido:'} {validationResult.resolvedPath}
              </p>
            )}
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Gauge className="h-5 w-5 text-brand-primary" />}
          title="Limites de envio (proteção anti-ban)"
          description="Configure quantas mensagens podem ser enviadas por minuto (global) e por contato. Valores muito altos podem causar bloqueio do WhatsApp."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NumberField
              label="Mensagens por minuto (limite global)"
              value={form.rateMaxPerMin}
              onChange={(value) => handleChange('rateMaxPerMin', value)}
              min={meta.rateLimit?.fields?.rateMaxPerMin?.min ?? 1}
              max={meta.rateLimit?.fields?.rateMaxPerMin?.max ?? 100}
              helpText="Número máximo de mensagens que podem ser enviadas por minuto em todo o sistema. Recomendado: 10-15 para evitar bloqueios."
            />
            <NumberField
              label="Mensagens por contato (a cada 5 minutos)"
              value={form.ratePerContactPer5Min}
              onChange={(value) => handleChange('ratePerContactPer5Min', value)}
              min={meta.rateLimit?.fields?.ratePerContactPer5Min?.min ?? 1}
              max={meta.rateLimit?.fields?.ratePerContactPer5Min?.max ?? 20}
              helpText="Número máximo de mensagens que podem ser enviadas para o mesmo contato em um período de 5 minutos. Recomendado: 2-3 para parecer natural."
            />
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Cpu className="h-5 w-5 text-brand-primary" />}
          title="Humanização (simulação de comportamento humano)"
          description="Configure pausas aleatórias antes de enviar mensagens e tempo de digitação para tornar o envio mais natural e evitar detecção de bot."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NumberField
              label="Pausa mínima antes de enviar (segundos)"
              value={form.humanizerMinDelaySeconds}
              onChange={(value) => handleChange('humanizerMinDelaySeconds', value)}
              min={0}
              helpText="Tempo mínimo de espera antes de enviar uma mensagem. Recomendado: 3-5 segundos."
            />
            <NumberField
              label="Pausa máxima antes de enviar (segundos)"
              value={form.humanizerMaxDelaySeconds}
              onChange={(value) => handleChange('humanizerMaxDelaySeconds', value)}
              min={0}
              helpText="Tempo máximo de espera antes de enviar uma mensagem. Recomendado: 7-10 segundos."
            />
            <NumberField
              label="Tempo mínimo de digitação (segundos)"
              value={form.humanizerMinTypingSeconds}
              onChange={(value) => handleChange('humanizerMinTypingSeconds', value)}
              min={0}
              helpText="Tempo mínimo que o sistema simula estar digitando antes de enviar. Recomendado: 1-2 segundos."
            />
            <NumberField
              label="Tempo máximo de digitação (segundos)"
              value={form.humanizerMaxTypingSeconds}
              onChange={(value) => handleChange('humanizerMaxTypingSeconds', value)}
              min={0}
              helpText="Tempo máximo que o sistema simula estar digitando antes de enviar. Recomendado: 3-4 segundos."
            />
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Wand2 className="h-5 w-5 text-brand-primary" />}
          title="Proteção anti-ban (Circuit Breaker)"
          description="Configure o sistema de proteção que pausa automaticamente o envio quando detecta muitas falhas, evitando bloqueios do WhatsApp."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Modo de janela de análise"
              value={form.cbWindowMode}
              onChange={(value) => handleChange('cbWindowMode', value)}
              helpText="Define como o sistema analisa falhas: '5m_or_50' = última janela de 5 minutos OU últimas 50 tentativas, o que ocorrer primeiro."
            />
            <NumberField
              label="Mínimo de tentativas antes de analisar"
              value={form.cbMinAttempts}
              onChange={(value) => handleChange('cbMinAttempts', value)}
              min={1}
              helpText="Número mínimo de tentativas de envio antes do sistema começar a analisar a taxa de falhas. Recomendado: 20-30."
            />
            <NumberField
              label="Taxa de falhas para ativar proteção (%)"
              value={form.cbFailRateOpen}
              step={0.05}
              min={0}
              max={1}
              onChange={(value) => handleChange('cbFailRateOpen', value)}
              helpText="Quando a taxa de falhas ultrapassar este valor (ex: 0.25 = 25%), o sistema pausa automaticamente o envio. Recomendado: 0.25 (25%)."
            />
            <NumberField
              label="Intervalo para teste (s)"
              value={form.cbProbeIntervalSec}
              onChange={(value) => handleChange('cbProbeIntervalSec', value)}
              min={1}
            />
            <NumberField
              label="Taxa de sucesso para fechar"
              value={form.cbProbeSuccessClose}
              step={0.05}
              min={0}
              max={1}
              onChange={(value) => handleChange('cbProbeSuccessClose', value)}
            />
            <NumberField
              label="Amostras no modo HALF_OPEN"
              value={form.cbProbeSamples}
              onChange={(value) => handleChange('cbProbeSamples', value)}
              min={1}
            />
            <NumberField
              label="Cooldown inicial (s)"
              value={form.cbCooldownInitialSec}
              onChange={(value) => handleChange('cbCooldownInitialSec', value)}
              min={1}
            />
            <NumberField
              label="Cooldown máximo (s)"
              value={form.cbCooldownMaxSec}
              onChange={(value) => handleChange('cbCooldownMaxSec', value)}
              min={1}
            />
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Clock className="h-5 w-5 text-brand-primary" />}
          title="Horários e ambiente"
          description="Configure horários comerciais para envio de mensagens e ajustes específicos do Windows."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Início do horário comercial"
              type="time"
              value={form.businessHoursStart}
              onChange={(value) => handleChange('businessHoursStart', value)}
              helpText="Horário em que o sistema começa a enviar mensagens automaticamente. Mensagens recebidas sempre são respondidas."
            />
            <InputField
              label="Fim do horário comercial"
              type="time"
              value={form.businessHoursEnd}
              onChange={(value) => handleChange('businessHoursEnd', value)}
              helpText="Horário em que o sistema para de enviar mensagens automáticas. Mensagens recebidas sempre são respondidas."
            />
            <InputField
              label="Fuso horário (código IANA)"
              value={form.timezone}
              onChange={(value) => handleChange('timezone', value)}
              placeholder="Ex: America/Sao_Paulo"
              helpText="Fuso horário usado para calcular horários comerciais. Exemplos: America/Sao_Paulo (Brasil), America/New_York (EUA), Europe/London (Reino Unido)."
            />
            <InputField
              label="Diretório temporário Windows"
              value={form.windowsTempDir}
              onChange={(value) => handleChange('windowsTempDir', value)}
              placeholder="C:\Users\User\AppData\Local\Temp\whatsself"
            />
            <ToggleField
              label="Habilitar suporte a paths longos"
              checked={form.windowsLongPathSupport}
              onChange={(value) => handleChange('windowsLongPathSupport', value)}
            />
          </div>
        </ConfigCard>

        <ConfigCard
          icon={<Server className="h-5 w-5 text-brand-primary" />}
          title="WebSocket"
          description="Parâmetros do canal em tempo real utilizado pelo painel."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <NumberField
              label="Porta do WebSocket"
              value={form.wsPort}
              onChange={(value) => handleChange('wsPort', value)}
              min={1000}
              max={65535}
            />
            <InputField
              label="Path do WebSocket"
              value={form.wsPath}
              onChange={(value) => handleChange('wsPath', value)}
            />
          </div>
        </ConfigCard>
      </section>

      <AuditLogList />
    </div>
  );
}

type ConfigCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
};

function ConfigCard({ icon, title, description, children }: ConfigCardProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-6 shadow-brand-soft">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-brand-border/50 bg-brand-surface/70 p-3">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-brand-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helpText?: string;
};

function InputField({ label, value, onChange, type = 'text', placeholder, helpText }: InputFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-brand-muted">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {helpText && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
};

function NumberField({ label, value, onChange, min, max, step, helpText }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-brand-muted">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {helpText && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </label>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-brand-muted">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-brand-primary/80' : 'bg-brand-border/70'
          }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'
            }`}
        />
      </button>
    </label>
  );
}

type SecretFieldProps = {
  label: string;
  masked: string | null;
  state: SecretFieldState;
  onChange: (value: string) => void;
  onReveal: () => void;
  onToggleRegenerate: () => void;
  helpText?: string;
};

function SecretField({ label, masked, state, onChange, onReveal, onToggleRegenerate, helpText }: SecretFieldProps) {
  return (
    <div className="space-y-3 rounded-xl border border-brand-border/60 bg-brand-surface/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-brand-muted">{label}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReveal}
            className="flex items-center gap-1 rounded-lg border border-brand-border/60 bg-brand-surface/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-brand-muted transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            {state.revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {state.revealed ? 'Ocultar' : 'Revelar'}
          </button>
          <button
            type="button"
            onClick={onToggleRegenerate}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition ${state.regenerate
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-brand-border/60 bg-brand-surface/80 text-brand-muted hover:border-brand-primary/40 hover:text-brand-primary'
              }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Regenerar
          </button>
        </div>
      </div>
      <input
        type="text"
        value={state.value}
        placeholder={masked ?? 'Sem valor definido'}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-brand-border/60 bg-brand-surface/80 px-4 py-3 text-sm text-white focus:border-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
      />
      {state.regenerate && (
        <p className="text-xs text-emerald-200/80">
          Um novo valor será gerado automaticamente ao salvar.
        </p>
      )}
      {helpText && !state.regenerate && (
        <p className="text-xs text-brand-muted/80">{helpText}</p>
      )}
    </div>
  );
}
