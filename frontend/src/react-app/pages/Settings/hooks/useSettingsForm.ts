import { useState, useCallback, useMemo, useEffect } from 'react';
import { useConfigStore } from '../../../stores/useConfigStore';
import { notificationActions } from '../../../stores/useNotificationStore';
import type { ConfigUpdatePayload } from '../../../types';

type SecretFieldState = {
  value: string;
  revealed: boolean;
  regenerate: boolean;
};

export type ConfigFormState = {
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

const buildInitialForm = (config: any): ConfigFormState => ({
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

export function useSettingsForm() {
  const { config, loading, saving, save, fetchInitial } = useConfigStore();
  const [form, setForm] = useState<ConfigFormState>(() => buildInitialForm(config));
  const isLoading = loading;
  const isSaving = saving;

  // Reset form when config loads
  useEffect(() => {
    if (config) {
      setForm(buildInitialForm(config));
    }
  }, [config]);

  // Update a single field
  const updateField = useCallback(<K extends keyof ConfigFormState>(
    field: K,
    value: ConfigFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Update secret field
  const updateSecretField = useCallback((
    field: 'jwtSecret' | 'defaultAdminPassword',
    key: keyof SecretFieldState,
    value: any
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  }, []);

  // Build payload for save
  const buildPayload = useCallback((): ConfigUpdatePayload => {
    const payload: ConfigUpdatePayload = {
      defaultAdminEmail: form.defaultAdminEmail,
      skipWhatsapp: form.skipWhatsapp,
      puppeteerExecutablePath: form.puppeteerExecutablePath || undefined,
      rateMaxPerMin: form.rateMaxPerMin,
      ratePerContactPer5Min: form.ratePerContactPer5Min,
      businessHours: {
        start: form.businessHoursStart,
        end: form.businessHoursEnd,
        timezone: form.timezone,
      },
      firstContactEnabled: form.firstContactEnabled,
      firstContactMessage: form.firstContactMessage?.trim() || null,
      wsPort: form.wsPort,
      wsPath: form.wsPath,
      humanizerMinDelayMs: toMillis(form.humanizerMinDelaySeconds),
      humanizerMaxDelayMs: toMillis(form.humanizerMaxDelaySeconds),
      humanizerMinTypingMs: toMillis(form.humanizerMinTypingSeconds),
      humanizerMaxTypingMs: toMillis(form.humanizerMaxTypingSeconds),
      cbWindowMode: form.cbWindowMode,
      cbMinAttempts: form.cbMinAttempts,
      cbFailRateOpen: form.cbFailRateOpen,
      cbProbeIntervalSec: form.cbProbeIntervalSec,
      cbProbeSuccessClose: form.cbProbeSuccessClose,
      cbProbeSamples: form.cbProbeSamples,
      cbCooldownInitialSec: form.cbCooldownInitialSec,
      cbCooldownMaxSec: form.cbCooldownMaxSec,
      windowsTempDir: form.windowsTempDir || undefined,
      windowsLongPathSupport: form.windowsLongPathSupport,
    };

    // Add secrets if provided
    if (form.jwtSecret.regenerate || form.jwtSecret.value.trim()) {
      payload.jwtSecret = form.jwtSecret.regenerate ? '__REGENERATE__' : form.jwtSecret.value;
    }
    if (form.defaultAdminPassword.regenerate || form.defaultAdminPassword.value.trim()) {
      payload.defaultAdminPassword = form.defaultAdminPassword.regenerate
        ? '__REGENERATE__'
        : form.defaultAdminPassword.value;
    }

    return payload;
  }, [form]);

  // Save settings
  const handleSave = useCallback(async () => {
    try {
      const payload = buildPayload();
      await save(payload);
      notificationActions.notify({
        type: 'success',
        message: 'Configurações salvas com sucesso!',
      });
      // Reset secret fields
      setForm((prev) => ({
        ...prev,
        jwtSecret: { value: '', revealed: false, regenerate: false },
        defaultAdminPassword: { value: '', revealed: false, regenerate: false },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar configurações';
      notificationActions.notify({
        type: 'error',
        message,
      });
    }
  }, [buildPayload, save]);

  // Refresh settings
  const handleRefresh = useCallback(async () => {
    await fetchInitial();
    notificationActions.notify({
      type: 'success',
      message: 'Configurações atualizadas!',
    });
  }, [fetchInitial]);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!config) return false;
    const initial = buildInitialForm(config);
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, config]);

  return {
    form,
    isLoading,
    isSaving,
    hasChanges,
    updateField,
    updateSecretField,
    handleSave,
    handleRefresh,
  };
}
