import { api } from '../lib/axios';
import type {
  SystemConfigMasked,
  ConfigMeta,
  ConfigUpdatePayload,
  ConfigAuditEntry,
  ConfigSecretField,
} from '../types';

export const configService = {
  async getConfig(): Promise<SystemConfigMasked> {
    const { data } = await api.get<SystemConfigMasked>('/config');
    return data;
  },

  async getMeta(): Promise<ConfigMeta> {
    const { data } = await api.get<ConfigMeta>('/config/meta');
    return data;
  },

  async getAudit(): Promise<ConfigAuditEntry[]> {
    const { data } = await api.get<ConfigAuditEntry[]>('/config/audit');
    return data;
  },

  async update(payload: ConfigUpdatePayload): Promise<SystemConfigMasked> {
    const { data } = await api.put<{ config: SystemConfigMasked }>('/config', payload);
    return data.config;
  },

  async revealSecret(field: ConfigSecretField): Promise<string> {
    const { data } = await api.post<{ field: ConfigSecretField; value: string }>('/config/secret/reveal', { field });
    return data.value;
  },

  async detectPuppeteer(): Promise<string[]> {
    const { data } = await api.post<{ candidates: string[] }>('/config/puppeteer/detect');
    return data.candidates;
  },

  async validatePuppeteer(path: string): Promise<{ valid: boolean; resolvedPath: string }> {
    const { data } = await api.post<{ valid: boolean; resolvedPath: string }>('/config/puppeteer/validate', { path });
    return data;
  },
};

