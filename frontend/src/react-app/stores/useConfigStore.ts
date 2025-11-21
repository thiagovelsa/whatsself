import { create } from 'zustand';
import { configService } from '../services/configService';
import type {
  SystemConfigMasked,
  ConfigMeta,
  ConfigUpdatePayload,
  ConfigAuditEntry,
  ConfigSecretField,
} from '../types';
import { notificationActions } from './useNotificationStore';
import { websocketService } from '../services/websocketService';

type ConfigState = {
  config: SystemConfigMasked | null;
  meta: ConfigMeta | null;
  audit: ConfigAuditEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastUpdate: string | null;
};

type ConfigActions = {
  fetchInitial: () => Promise<void>;
  fetchAudit: () => Promise<void>;
  save: (payload: ConfigUpdatePayload) => Promise<void>;
  revealSecret: (field: ConfigSecretField) => Promise<string>;
  detectBrowsers: () => Promise<string[]>;
  validateBrowserPath: (path: string) => Promise<{ valid: boolean; resolvedPath: string }>;
};

let isSubscribedToWebSocket = false;

export const useConfigStore = create<ConfigState & ConfigActions>((set, get) => ({
  config: null,
  meta: null,
  audit: [],
  loading: false,
  saving: false,
  error: null,
  lastUpdate: null,

  fetchInitial: async () => {
    set({ loading: true, error: null });
    try {
      const [config, meta] = await Promise.all([configService.getConfig(), configService.getMeta()]);
      set({
        config,
        meta,
        loading: false,
        lastUpdate: config.updatedAt,
      });
      if (!isSubscribedToWebSocket) {
        websocketService.on('config_updated', () => {
          void get().fetchInitial();
        });
        isSubscribedToWebSocket = true;
      }
    } catch (error) {
      let message = 'Falha ao carregar configurações';
      if (typeof error === 'object' && error !== null) {
        const anyError = error as { response?: { status?: number }; message?: string };
        if (anyError.response?.status === 403) {
          message = 'Acesso restrito: apenas administradores podem visualizar as configurações.';
        } else if (typeof anyError.message === 'string' && anyError.message.trim()) {
          message = anyError.message;
        }
      } else if (error instanceof Error && error.message.trim()) {
        message = error.message;
      }
      set({ loading: false, error: message });
    }
  },

  fetchAudit: async () => {
    try {
      const audit = await configService.getAudit();
      set({ audit });
    } catch (error) {
      notificationActions.notify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Falha ao obter histórico de alterações',
      });
    }
  },

  save: async (payload) => {
    set({ saving: true, error: null });
    try {
      const config = await configService.update(payload);
      set({
        config,
        saving: false,
        lastUpdate: config.updatedAt,
      });
      notificationActions.notify({
        type: 'success',
        message: 'Configurações atualizadas com sucesso!',
      });
    } catch (error) {
      set({ saving: false, error: error instanceof Error ? error.message : 'Falha ao salvar configurações' });
      notificationActions.notify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar as alterações',
      });
      throw error;
    }
  },

  revealSecret: async (field) => {
    try {
      const value = await configService.revealSecret(field);
      return value;
    } catch (error) {
      notificationActions.notify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível revelar o segredo',
      });
      throw error;
    }
  },

  detectBrowsers: async () => {
    try {
      return await configService.detectPuppeteer();
    } catch (error) {
      notificationActions.notify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Falha ao detectar navegadores instalados',
      });
      return [];
    }
  },

  validateBrowserPath: async (path: string) => {
    try {
      return await configService.validatePuppeteer(path);
    } catch (error) {
      notificationActions.notify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível validar o caminho informado',
      });
      return { valid: false, resolvedPath: path };
    }
  },
}));

