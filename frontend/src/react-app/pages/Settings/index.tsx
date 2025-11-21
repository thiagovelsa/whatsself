import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { RefreshCw, XCircle } from 'lucide-react';
import { useConfigStore } from '../../stores/useConfigStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useBanRiskSummary } from './hooks/useBanRiskSummary';
import { SettingsHeader } from './components/SettingsHeader';
import { RiskSummarySection } from './components/RiskSummarySection';
import AuditLogList from '../../components/AuditLogList';
import type { ConfigUpdatePayload } from '../../types';

// Lazy load tabs for better performance
const SecurityTab = lazy(() => import('./components/tabs/SecurityTab'));
const WhatsAppIntegrationTab = lazy(() => import('./components/tabs/WhatsAppIntegrationTab'));
const RateLimitingTab = lazy(() => import('./components/tabs/RateLimitingTab'));
const HumanizationTab = lazy(() => import('./components/tabs/HumanizationTab'));
const CircuitBreakerTab = lazy(() => import('./components/tabs/CircuitBreakerTab'));
const BusinessHoursTab = lazy(() => import('./components/tabs/BusinessHoursTab'));
const WebSocketTab = lazy(() => import('./components/tabs/WebSocketTab'));

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
  firstContactEnabled: boolean;
  firstContactMessage: string;
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
  skipWhatsapp: false,
  puppeteerExecutablePath: config?.puppeteerExecutablePath ?? '',
  rateMaxPerMin: config?.rateMaxPerMin ?? 12,
  ratePerContactPer5Min: config?.ratePerContactPer5Min ?? 2,
  businessHoursStart: config?.businessHoursStart ?? '09:00',
  businessHoursEnd: config?.businessHoursEnd ?? '18:00',
  timezone: config?.timezone ?? 'America/Sao_Paulo',
  firstContactEnabled: config?.firstContactEnabled ?? false,
  firstContactMessage: config?.firstContactMessage ?? '',
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

// Loading fallback for lazy tabs
const TabLoader = () => (
  <div className="flex h-32 items-center justify-center">
    <RefreshCw className="h-5 w-5 animate-spin text-brand-muted" />
  </div>
);

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

  // Load config on mount
  useEffect(() => {
    void fetchInitial();
  }, [fetchInitial]);

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setForm(buildInitialForm(config));
      setDirty(false);
    }
  }, [config]);

  // Form handlers
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

  const handleRevealSecret = useCallback(async (field: 'jwtSecret' | 'defaultAdminPassword') => {
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
  }, [revealSecret, handleSecretChange]);

  // Build payload for save
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
      firstContactEnabled: form.firstContactEnabled,
      firstContactMessage: form.firstContactMessage.trim() || null,
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
        if (dirty && !saving) {
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
        if (dirty && config) {
          setForm(buildInitialForm(config));
          setDirty(false);
        }
      },
      description: 'Descartar alterações',
    },
  ]);

  // Risk summary
  const riskSummary = useBanRiskSummary(form);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md space-y-3 rounded-2xl border border-brand-border/60 bg-brand-surfaceElevated/70 p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-rose-400" />
          <p className="text-sm font-medium text-white">Não foi possível carregar as configurações.</p>
          <p className="text-xs text-brand-muted">{error}</p>
        </div>
      </div>
    );
  }

  // No data state
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
      <SettingsHeader
        lastUpdate={lastUpdate}
        dirty={dirty}
        isSaving={saving}
        onRefresh={() => void fetchInitial()}
        onSave={handleSave}
      />

      {riskSummary && <RiskSummarySection riskSummary={riskSummary} />}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Suspense fallback={<TabLoader />}>
          <SecurityTab
            form={form}
            config={config}
            onUpdateField={handleChange}
            onSecretChange={handleSecretChange}
            onRevealSecret={handleRevealSecret}
            onToggleRegenerate={toggleRegenerate}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <WhatsAppIntegrationTab
            form={form}
            onUpdateField={handleChange}
            onDetectBrowsers={detectBrowsers}
            onValidatePath={validateBrowserPath}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <RateLimitingTab
            form={form}
            onUpdateField={handleChange}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <HumanizationTab
            form={form}
            onUpdateField={handleChange}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <CircuitBreakerTab
            form={form}
            onUpdateField={handleChange}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <BusinessHoursTab
            form={form}
            onUpdateField={handleChange}
          />
        </Suspense>

        <Suspense fallback={<TabLoader />}>
          <WebSocketTab
            form={form}
            onUpdateField={handleChange}
          />
        </Suspense>
      </section>

      <AuditLogList />
    </div>
  );
}
